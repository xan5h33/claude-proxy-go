package web

import (
	"bufio"
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"claude-proxy/application"
)

type Handler struct {
	proxy     *application.ProxyService
	providers *application.ProviderService
	users     *application.UserService
}

func NewHandler(proxy *application.ProxyService, providers *application.ProviderService, users *application.UserService) *Handler {
	return &Handler{proxy: proxy, providers: providers, users: users}
}

// ── Health ────────────────────────────────────────────────────────────────────

func (h *Handler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
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

	if resp.IsStream {
		h.streamResponse(c, resp, user.ID, resp.ProviderID)
	} else {
		body, _ := io.ReadAll(resp.Body)
		input, output := parseUsageJSON(body)
		h.proxy.LogUsage(c.Request.Context(), user.ID, resp.ProviderID, input, output)
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
	var req struct {
		Name          string `json:"name"           binding:"required"`
		RefreshToken  string `json:"refresh_token"  binding:"required"`
		AccessToken   string `json:"access_token"`
		AccountUUID   string `json:"account_uuid"   binding:"required"`
		DeviceID      string `json:"device_id"      binding:"required"`
		Billing       string `json:"billing"        binding:"required"`
		Cap           int64  `json:"cap"`
		WindowSeconds int    `json:"window_seconds"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.WindowSeconds == 0 {
		req.WindowSeconds = 3600
	}

	p, err := h.providers.Register(c.Request.Context(), req.Name, req.RefreshToken, req.AccessToken, req.AccountUUID, req.DeviceID, req.Billing, req.Cap, req.WindowSeconds)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, p)
}

func (h *Handler) ListProviders(c *gin.Context) {
	providers, err := h.providers.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	type safeProvider struct {
		ID                string `json:"id"`
		Name              string `json:"name"`
		AccountUUID       string `json:"account_uuid"`
		Cap               int64  `json:"cap"`
		WindowSeconds     int    `json:"window_seconds"`
		TotalInputTokens  int64  `json:"total_input_tokens"`
		TotalOutputTokens int64  `json:"total_output_tokens"`
	}
	out := make([]safeProvider, len(providers))
	for i, p := range providers {
		out[i] = safeProvider{p.ID, p.Name, p.AccountUUID, p.Cap, p.WindowSeconds, p.TotalInputTokens, p.TotalOutputTokens}
	}
	c.JSON(http.StatusOK, out)
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

func (h *Handler) DeleteUser(c *gin.Context) {
	if err := h.users.Delete(c.Request.Context(), c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
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

func AuthMiddleware(users *application.UserService) gin.HandlerFunc {
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

func AdminMiddleware(adminSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetHeader("x-admin-secret") != adminSecret {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		c.Next()
	}
}
