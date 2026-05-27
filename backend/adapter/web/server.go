package web

import (
	"claude-proxy/application"

	"github.com/gin-gonic/gin"
)

func NewRouter(h *Handler, users *application.UserService, adminSecret string) *gin.Engine {
	r := gin.Default()

	r.GET("/health", h.Health)
	r.GET("/api/hello", h.OAuthHello)
	r.GET("/v1/oauth/hello", h.OAuthHello)

	// Proxy — requires user API key auth
	proxy := r.Group("/")
	proxy.Use(AuthMiddleware(users))
	{
		proxy.POST("/v1/messages", h.ProxyMessages)
	}

	// Admin API — requires admin secret
	admin := r.Group("/admin")
	admin.Use(AdminMiddleware(adminSecret))
	{
		admin.POST("/providers", h.RegisterProvider)
		admin.GET("/providers", h.ListProviders)
		admin.GET("/providers/:id", h.GetProvider)
		admin.PATCH("/providers/:id/refresh-token", h.UpdateRefreshToken)
		admin.DELETE("/providers/:id", h.DeleteProvider)

		admin.POST("/users", h.CreateUser)
		admin.GET("/users", h.ListUsers)
		admin.DELETE("/users/:id", h.DeleteUser)
	}

	r.NoRoute(h.ProxyPassthrough)

	return r
}
