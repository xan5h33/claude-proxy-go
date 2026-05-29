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
		AllowHeaders:     []string{"Content-Type", "x-api-key", "x-admin-secret", "Authorization"},
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

	// Public auth
	r.POST("/auth/register", h.Register)
	r.POST("/auth/login", h.Login)

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
		me.PATCH("/me/cap", h.UpdateMeCap)
		me.POST("/me/rotate-key", h.RotateMeKey)
		me.GET("/me/providers", h.ListMyProviders)
		me.POST("/me/providers", h.RegisterMyProvider)
		me.PATCH("/me/providers/:id/tokens", h.UpdateMyProviderTokens)
		me.PATCH("/me/providers/:id/active", h.SetMyProviderActive)
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
		admin.PATCH("/users/:id/cap", h.UpdateUserCap)
		admin.POST("/users/:id/rotate-key", h.RotateUserKey)
		admin.DELETE("/users/:id", h.DeleteUser)
	}

	r.NoRoute(h.ProxyPassthrough)

	return r
}
