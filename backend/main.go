package main

import (
	"context"
	"log"

	anthropicadapter "claude-proxy/adapter/anthropic"
	"claude-proxy/adapter/db"
	"claude-proxy/adapter/web"
	"claude-proxy/application"
	"claude-proxy/config"
	"claude-proxy/provider"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	pg, err := db.NewPostgres(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	if err := pg.RunMigrations(ctx); err != nil {
		log.Fatalf("migrations: %v", err)
	}

	provRepo  := application.ProviderRepository(pg)
	userRepo  := pg.AsUserRepo()
	usageRepo := pg.AsUsageRepo()

	selector        := provider.NewLeastUsed(provRepo)
	anthropicClient := anthropicadapter.NewClient()

	proxyService    := application.NewProxyService(anthropicClient, selector, usageRepo, provRepo)
	providerService := application.NewProviderService(provRepo)
	userService     := application.NewUserService(userRepo)
	authService     := application.NewAuthService(userRepo, cfg.JWTSecret)

	var paymentService *application.PaymentService
	if cfg.StripeSecretKey != "" {
		paymentService = application.NewPaymentService(userService, cfg.StripeSecretKey, cfg.StripeWebhookSecret, cfg.AppURL)
	}

	// Bootstrap first admin if env vars are set and no admin exists yet
	if cfg.InitAdminEmail != "" && cfg.InitAdminPassword != "" {
		bootstrapAdmin(ctx, authService, userService, cfg.InitAdminEmail, cfg.InitAdminPassword)
	}

	handler := web.NewHandler(proxyService, providerService, userService, authService, paymentService)
	router  := web.NewRouter(handler, userService, authService, cfg.AdminSecret, cfg.AllowedOrigin)

	log.Printf("listening on :%s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}

func bootstrapAdmin(ctx context.Context, auth *application.AuthService, users *application.UserService, email, password string) {
	existing, _ := users.FindByEmail(ctx, email)
	if existing != nil {
		if !existing.IsAdmin {
			if err := users.SetAdmin(ctx, existing.ID, true); err != nil {
				log.Printf("promote admin: %v", err)
			} else {
				log.Printf("promoted %s to admin", email)
			}
		}
		return
	}
	u, err := auth.Register(ctx, email, password)
	if err != nil {
		log.Printf("bootstrap admin: %v", err)
		return
	}
	if err := users.SetAdmin(ctx, u.ID, true); err != nil {
		log.Printf("set admin flag: %v", err)
		return
	}
	log.Printf("created admin user %s (api_key: %s)", email, u.APIKey)
}
