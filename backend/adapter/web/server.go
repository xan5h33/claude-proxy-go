package web

import (
	"claude-proxy/application"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func NewRouter(h *Handler, users *application.UserService, auth *application.AuthService, adminSecret, allowedOrigin string) *gin.Engine {
	r := gin.Default()

	corsConfig := cors.Config{
		AllowMethods:     []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "x-api-key", "x-admin-secret", "Authorization", "x-proxy-secret"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
	}
	if allowedOrigin == "" {
		corsConfig.AllowAllOrigins = true
	} else {
		corsConfig.AllowOrigins = []string{allowedOrigin, "http://localhost:3000"}
	}
	r.Use(cors.New(corsConfig))

	r.GET("/health", h.Health)
	r.GET("/api/hello", h.OAuthHello)
	r.GET("/v1/oauth/hello", h.OAuthHello)

	// Polar webhook — no auth, raw body needed
	r.POST("/webhooks/polar", h.PolarWebhook)

	// Public auth
	r.POST("/auth/register", h.Register)
	r.POST("/auth/login", h.Login)
	r.POST("/auth/sync", h.OAuthSync)

	// Proxy — API key only
	proxy := r.Group("/")
	proxy.Use(APIKeyMiddleware(users))
	{
		proxy.POST("/v1/messages", h.ProxyMessages)
	}

	// User self-service — JWT or API key
	jwtMw := JWTMiddleware(users, auth)
	me := r.Group("/user")
	me.Use(jwtMw)
	{
		me.GET("/me", h.GetMe)
		me.POST("/me/rotate-key", h.RotateMeKey)
		me.GET("/me/usage", h.ListMyUsage)
		me.GET("/me/providers", h.ListMyProviders)
		me.POST("/me/providers", h.RegisterMyProvider)
		me.PATCH("/me/providers/:id/tokens", h.UpdateMyProviderTokens)
		me.PATCH("/me/providers/:id/active", h.SetMyProviderActive)
		me.PATCH("/me/providers/:id/settings", h.UpdateMyProviderSettings)
		me.POST("/me/providers/:id/payout", h.RequestPayout)
		me.GET("/me/providers/:id/payouts", h.ListMyProviderPayouts)
		me.POST("/me/checkout", h.CreateCheckoutSession)
	}

	// Admin — JWT (is_admin) or x-admin-secret
	adminMw := AdminMiddleware(adminSecret, users, auth)
	admin := r.Group("/admin")
	admin.Use(adminMw)
	{
		admin.POST("/providers", h.RegisterProvider)
		admin.GET("/providers", h.ListProviders)
		admin.GET("/providers/:id", h.GetProvider)
		admin.PATCH("/providers/:id/refresh-token", h.UpdateRefreshToken)
		admin.PATCH("/providers/:id/settings", h.UpdateSettings)
		admin.PATCH("/providers/:id/active", h.SetActive)
		admin.DELETE("/providers/:id", h.DeleteProvider)

		admin.POST("/users", h.CreateUser)
		admin.GET("/users", h.ListUsers)
		admin.GET("/users/:id", h.GetUser)
		admin.POST("/users/:id/topup", h.TopUpUser)
		admin.POST("/users/:id/rotate-key", h.RotateUserKey)
		admin.DELETE("/users/:id", h.DeleteUser)

		admin.GET("/payouts", h.ListAllPayouts)
		admin.PATCH("/payouts/:id", h.UpdatePayoutStatus)
	}

	r.NoRoute(h.ProxyPassthrough)

	return r
}
