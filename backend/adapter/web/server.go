package web

import (
	"claude-proxy/application"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func NewRouter(h *Handler, users *application.UserService, adminSecret string) *gin.Engine {
	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "x-api-key", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
	}))

	r.GET("/health", h.Health)
	r.GET("/api/hello", h.OAuthHello)
	r.GET("/v1/oauth/hello", h.OAuthHello)

	proxy := r.Group("/")
	proxy.Use(AuthMiddleware(users))
	{
		proxy.POST("/v1/messages", h.ProxyMessages)
	}

	admin := r.Group("/admin")
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

	me := r.Group("/user")
	me.Use(AuthMiddleware(users))
	{
		me.GET("/me", h.GetMe)
		me.PATCH("/me/cap", h.UpdateMeCap)
		me.POST("/me/rotate-key", h.RotateMeKey)
	}

	r.NoRoute(h.ProxyPassthrough)

	return r
}
