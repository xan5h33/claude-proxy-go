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

	provRepo    := application.ProviderRepository(pg)
	userRepo    := pg.AsUserRepo()
	usageRepo   := pg.AsUsageRepo()

	selector        := provider.NewLeastUsed(provRepo)
	anthropicClient := anthropicadapter.NewClient()

	proxyService    := application.NewProxyService(anthropicClient, selector, usageRepo, provRepo)
	providerService := application.NewProviderService(provRepo)
	userService     := application.NewUserService(userRepo)

	handler := web.NewHandler(proxyService, providerService, userService)
	router  := web.NewRouter(handler, userService, cfg.AdminSecret)

	log.Printf("listening on :%s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
