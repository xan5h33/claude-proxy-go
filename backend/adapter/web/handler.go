package web

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"claude-proxy/application"
)

type Handler struct {
	proxy       *application.ProxyService
	providers   *application.ProviderService
	users       *application.UserService
	auth        *application.AuthService
	payment     *application.PaymentService
	payouts     *application.PayoutService
	proxySecret string
}

func NewHandler(proxy *application.ProxyService, providers *application.ProviderService, users *application.UserService, auth *application.AuthService, payment *application.PaymentService, payouts *application.PayoutService, proxySecret string) *Handler {
	return &Handler{proxy: proxy, providers: providers, users: users, auth: auth, payment: payment, payouts: payouts, proxySecret: proxySecret}
}

// ── Health ────────────────────────────────────────────────────────────────────

func (h *Handler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// ── Auth ──────────────────────────────────────────────────────────────────────

func (h *Handler) Register(c *gin.Context) {
	var req struct {
		Email    string `json:"email"    binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	user, err := h.auth.Register(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, application.ErrEmailTaken) {
			c.JSON(http.StatusConflict, gin.H{"error": "email already taken"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	tok, err := h.auth.MakeToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"token": tok, "user": user})
}

func (h *Handler) Login(c *gin.Context) {
	var req struct {
		Email    string `json:"email"    binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tok, user, err := h.auth.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": tok, "user": user})
}

func (h *Handler) ClerkSync(c *gin.Context) {
	if h.proxySecret == "" || c.GetHeader("x-proxy-secret") != h.proxySecret {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	var req struct {
		ClerkID string `json:"clerk_id" binding:"required"`
		Email   string `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	user, err := h.auth.ClerkSync(c.Request.Context(), req.ClerkID, req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}

// ── OAuth preflight ───────────────────────────────────────────────────────────

func (h *Handler) OAuthHello(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// ── Proxy ─────────────────────────────────────────────────────────────────────

func (h *Handler) ProxyMessages(c *gin.Context) {
	user := c.MustGet("user").(*application.User)

	rawBody, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read body"})
		return
	}

	if !user.IsAdmin && user.Balance <= 0 {
		c.JSON(http.StatusPaymentRequired, gin.H{"error": "insufficient balance"})
		return
	}

	headers := forwardHeaders(c.Request)
	resp, err := h.proxy.Forward(c.Request.Context(), &application.ForwardRequest{
		Method:  c.Request.Method,
		Path:    c.Request.URL.RequestURI(),
		Headers: headers,
		Body:    rawBody,
	}, user.ID)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	writeHeaders(c, resp)

	ctx := c.Request.Context()
	if resp.IsStream {
		h.streamResponse(c, resp, user.ID, resp.ProviderID)
	} else {
		body, _ := io.ReadAll(resp.Body)
		input, output := parseUsageJSON(body)
		h.proxy.LogUsage(ctx, user.ID, resp.ProviderID, input, output)
		c.Data(resp.StatusCode, resp.Headers["Content-Type"], body)
	}
}

func (h *Handler) ProxyPassthrough(c *gin.Context) {
	body, _ := io.ReadAll(c.Request.Body)
	headers := forwardHeaders(c.Request)

	resp, err := h.proxy.Forward(c.Request.Context(), &application.ForwardRequest{
		Method:  c.Request.Method,
		Path:    c.Request.URL.RequestURI(),
		Headers: headers,
		Body:    body,
	}, "")
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()
	writeHeaders(c, resp)
	io.Copy(c.Writer, resp.Body)
}

func (h *Handler) streamResponse(c *gin.Context, resp *application.ForwardResponse, userID, providerID string) {
	ctx := c.Request.Context()
	var buf bytes.Buffer
	scanner := bufio.NewScanner(io.TeeReader(resp.Body, &buf))

	c.Stream(func(w io.Writer) bool {
		if !scanner.Scan() {
			input, output := parseUsageSSE(buf.String())
			h.proxy.LogUsage(ctx, userID, providerID, input, output)
			return false
		}
		w.Write([]byte(scanner.Text() + "\n"))
		return true
	})
}

// ── Provider handlers ─────────────────────────────────────────────────────────

func (h *Handler) RegisterProvider(c *gin.Context) {
	h.registerProvider(c, "")
}

func (h *Handler) RegisterMyProvider(c *gin.Context) {
	user := c.MustGet("user").(*application.User)
	h.registerProvider(c, user.ID)
}

func (h *Handler) registerProvider(c *gin.Context, userID string) {
	var req struct {
		Name         string `json:"name"          binding:"required"`
		RefreshToken string `json:"refresh_token" binding:"required"`
		AccessToken  string `json:"access_token"`
		AccountUUID  string `json:"account_uuid"  binding:"required"`
		DeviceID     string `json:"device_id"     binding:"required"`
		Billing      string `json:"billing"       binding:"required"`
		Cap          int64  `json:"cap"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	p, err := h.providers.Register(c.Request.Context(), userID, req.Name, req.RefreshToken, req.AccessToken, req.AccountUUID, req.DeviceID, req.Billing, req.Cap)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, p)
}

func (h *Handler) ListMyProviders(c *gin.Context) {
	user := c.MustGet("user").(*application.User)
	providers, err := h.providers.ListByUser(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, providers)
}

func (h *Handler) UpdateMyProviderTokens(c *gin.Context) {
	user := c.MustGet("user").(*application.User)
	p, err := h.providers.Get(c.Request.Context(), c.Param("id"))
	if err != nil || p == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if p.UserID != user.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.providers.UpdateRefreshToken(c.Request.Context(), p.ID, req.RefreshToken); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) SetMyProviderActive(c *gin.Context) {
	user := c.MustGet("user").(*application.User)
	p, err := h.providers.Get(c.Request.Context(), c.Param("id"))
	if err != nil || p == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if p.UserID != user.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	var req struct {
		Active bool `json:"active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.providers.SetActive(c.Request.Context(), p.ID, req.Active); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) ListProviders(c *gin.Context) {
	providers, err := h.providers.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, providers)
}

func (h *Handler) GetProvider(c *gin.Context) {
	p, err := h.providers.Get(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if p == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, p)
}

func (h *Handler) UpdateRefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.providers.UpdateRefreshToken(c.Request.Context(), c.Param("id"), req.RefreshToken); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) UpdateSettings(c *gin.Context) {
	var req application.ProviderSettings
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.WindowTimezone == "" {
		req.WindowTimezone = "UTC"
	}
	if err := h.providers.UpdateSettings(c.Request.Context(), c.Param("id"), req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) SetActive(c *gin.Context) {
	var req struct {
		Active bool `json:"active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.providers.SetActive(c.Request.Context(), c.Param("id"), req.Active); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) DeleteProvider(c *gin.Context) {
	if err := h.providers.Delete(c.Request.Context(), c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// ── User handlers ─────────────────────────────────────────────────────────────

func (h *Handler) CreateUser(c *gin.Context) {
	apiKey := "sk-proxy-" + uuid.New().String()
	user, err := h.users.Create(c.Request.Context(), apiKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, user)
}

func (h *Handler) ListUsers(c *gin.Context) {
	users, err := h.users.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, users)
}

func (h *Handler) GetUser(c *gin.Context) {
	u, err := h.users.Get(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if u == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, u)
}

func (h *Handler) TopUpUser(c *gin.Context) {
	var req struct {
		Amount int64 `json:"amount" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.users.TopUp(c.Request.Context(), c.Param("id"), req.Amount); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	u, err := h.users.Get(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, u)
}

func (h *Handler) RotateUserKey(c *gin.Context) {
	newKey := "sk-proxy-" + uuid.New().String()
	u, err := h.users.RotateKey(c.Request.Context(), c.Param("id"), newKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, u)
}

func (h *Handler) DeleteUser(c *gin.Context) {
	if err := h.users.Delete(c.Request.Context(), c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// ── User self-service (auth by own API key) ───────────────────────────────────

func (h *Handler) GetMe(c *gin.Context) {
	user := c.MustGet("user").(*application.User)
	c.JSON(http.StatusOK, user)
}

func (h *Handler) RotateMeKey(c *gin.Context) {
	user := c.MustGet("user").(*application.User)
	newKey := "sk-proxy-" + uuid.New().String()
	u, err := h.users.RotateKey(c.Request.Context(), user.ID, newKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, u)
}

func (h *Handler) ListMyUsage(c *gin.Context) {
	user := c.MustGet("user").(*application.User)
	logs, err := h.proxy.GetUserUsage(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}

func (h *Handler) UpdateMyProviderSettings(c *gin.Context) {
	user := c.MustGet("user").(*application.User)
	p, err := h.providers.Get(c.Request.Context(), c.Param("id"))
	if err != nil || p == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if p.UserID != user.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	var req application.ProviderSettings
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.WindowTimezone == "" {
		req.WindowTimezone = "UTC"
	}
	if err := h.providers.UpdateSettings(c.Request.Context(), p.ID, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// ── Payment ───────────────────────────────────────────────────────────────────

func (h *Handler) CreateCheckoutSession(c *gin.Context) {
	if h.payment == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "payments not configured"})
		return
	}
	user := c.MustGet("user").(*application.User)
	var req struct {
		Tier string `json:"tier" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	url, err := h.payment.CreateCheckoutSession(c.Request.Context(), user.ID, req.Tier)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"url": url})
}

func (h *Handler) PolarWebhook(c *gin.Context) {
	if h.payment == nil {
		c.Status(http.StatusOK)
		return
	}
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read body"})
		return
	}
	err = h.payment.HandleWebhook(
		c.Request.Context(), body,
		c.GetHeader("webhook-id"),
		c.GetHeader("webhook-timestamp"),
		c.GetHeader("webhook-signature"),
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusOK)
}

// ── Payout handlers ───────────────────────────────────────────────────────────

func (h *Handler) RequestPayout(c *gin.Context) {
	user := c.MustGet("user").(*application.User)
	p, err := h.providers.Get(c.Request.Context(), c.Param("id"))
	if err != nil || p == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if p.UserID != user.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	pr, err := h.payouts.Request(c.Request.Context(), p.ID, p.Earnings)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, pr)
}

func (h *Handler) ListMyProviderPayouts(c *gin.Context) {
	user := c.MustGet("user").(*application.User)
	p, err := h.providers.Get(c.Request.Context(), c.Param("id"))
	if err != nil || p == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if p.UserID != user.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	payouts, err := h.payouts.ListByProvider(c.Request.Context(), p.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, payouts)
}

func (h *Handler) ListAllPayouts(c *gin.Context) {
	payouts, err := h.payouts.ListAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, payouts)
}

func (h *Handler) UpdatePayoutStatus(c *gin.Context) {
	var req struct {
		Status string `json:"status" binding:"required"`
		Note   string `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var (
		pr  *application.PayoutRequest
		err error
	)
	switch req.Status {
	case "approved":
		pr, err = h.payouts.Approve(c.Request.Context(), c.Param("id"), req.Note)
	case "rejected":
		pr, err = h.payouts.Reject(c.Request.Context(), c.Param("id"), req.Note)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "status must be approved or rejected"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, pr)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func forwardHeaders(r *http.Request) map[string]string {
	skip := map[string]bool{
		"host": true, "connection": true, "transfer-encoding": true,
		"authorization": true, "proxy-connection": true, "x-api-key": true,
	}
	headers := make(map[string]string)
	for k, v := range r.Header {
		if !skip[strings.ToLower(k)] && len(v) > 0 {
			headers[k] = v[0]
		}
	}
	return headers
}

func writeHeaders(c *gin.Context, resp *application.ForwardResponse) {
	skip := map[string]bool{"content-length": true, "transfer-encoding": true}
	for k, v := range resp.Headers {
		if !skip[strings.ToLower(k)] {
			c.Header(k, v)
		}
	}
}

func parseUsageJSON(body []byte) (input, output int) {
	var v struct {
		Usage struct {
			Input  int `json:"input_tokens"`
			Output int `json:"output_tokens"`
		} `json:"usage"`
	}
	json.Unmarshal(body, &v)
	return v.Usage.Input, v.Usage.Output
}

func parseUsageSSE(data string) (input, output int) {
	for _, line := range strings.Split(data, "\n") {
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		var ev struct {
			Type    string `json:"type"`
			Message struct {
				Usage struct{ InputTokens int `json:"input_tokens"` } `json:"usage"`
			} `json:"message"`
			Usage struct{ OutputTokens int `json:"output_tokens"` } `json:"usage"`
		}
		if json.Unmarshal([]byte(line[6:]), &ev) != nil {
			continue
		}
		if ev.Type == "message_start" {
			input = ev.Message.Usage.InputTokens
		}
		if ev.Type == "message_delta" {
			output = ev.Usage.OutputTokens
		}
	}
	return
}

// APIKeyMiddleware authenticates via x-api-key / Bearer sk-proxy-* — used for the proxy.
func APIKeyMiddleware(users *application.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := c.GetHeader("x-api-key")
		if apiKey == "" {
			apiKey = strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")
		}
		if apiKey == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing api key"})
			return
		}
		user, err := users.FindByAPIKey(c.Request.Context(), apiKey)
		if err != nil || user == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid api key"})
			return
		}
		c.Set("user", user)
		c.Next()
	}
}

// JWTMiddleware authenticates via Bearer JWT — used for the web dashboard.
// Falls back to API key for the portal self-service routes.
func JWTMiddleware(users *application.UserService, auth *application.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		bearer := strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")

		// Try JWT first
		if bearer != "" && !strings.HasPrefix(bearer, "sk-") {
			claims, err := auth.ParseToken(bearer)
			if err != nil {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
				return
			}
			user, err := users.Get(c.Request.Context(), claims.Subject)
			if err != nil || user == nil {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
				return
			}
			c.Set("user", user)
			c.Next()
			return
		}

		// Fall back to API key (for portal / CLI usage)
		apiKey := c.GetHeader("x-api-key")
		if apiKey == "" {
			apiKey = bearer
		}
		if apiKey == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing credentials"})
			return
		}
		user, err := users.FindByAPIKey(c.Request.Context(), apiKey)
		if err != nil || user == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
			return
		}
		c.Set("user", user)
		c.Next()
	}
}

// AdminMiddleware requires is_admin on JWT, or a valid x-admin-secret header.
func AdminMiddleware(adminSecret string, users *application.UserService, auth *application.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Allow ADMIN_SECRET header for scripts
		if adminSecret != "" && c.GetHeader("x-admin-secret") == adminSecret {
			c.Next()
			return
		}

		// Require JWT with is_admin
		bearer := strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")
		if bearer == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		claims, err := auth.ParseToken(bearer)
		if err != nil || !claims.IsAdmin {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "admin access required"})
			return
		}
		user, err := users.Get(c.Request.Context(), claims.Subject)
		if err != nil || user == nil || !user.IsAdmin {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "admin access required"})
			return
		}
		c.Set("user", user)
		c.Next()
	}
}
