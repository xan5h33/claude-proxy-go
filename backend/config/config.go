package config

import (
	"log"
	"os"
)

type Config struct {
	Port                string
	DatabaseURL         string
	AdminSecret         string
	JWTSecret           string
	AllowedOrigin       string // e.g. https://your-app.vercel.app — empty = allow all
	InitAdminEmail      string
	InitAdminPassword   string
	StripeSecretKey     string
	StripeWebhookSecret string
	AppURL              string // e.g. https://your-app.vercel.app
}

func Load() *Config {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is required")
	}
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "change-me-in-production"
		log.Println("warning: JWT_SECRET not set, using default")
	}
	return &Config{
		Port:                getEnv("PORT", "8080"),
		DatabaseURL:         dbURL,
		AdminSecret:         os.Getenv("ADMIN_SECRET"),
		JWTSecret:           jwtSecret,
		AllowedOrigin:       os.Getenv("ALLOWED_ORIGIN"),
		InitAdminEmail:      os.Getenv("INIT_ADMIN_EMAIL"),
		InitAdminPassword:   os.Getenv("INIT_ADMIN_PASSWORD"),
		StripeSecretKey:     os.Getenv("STRIPE_SECRET_KEY"),
		StripeWebhookSecret: os.Getenv("STRIPE_WEBHOOK_SECRET"),
		AppURL:              getEnv("APP_URL", "http://localhost:3000"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
