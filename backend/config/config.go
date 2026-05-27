package config

import (
	"log"
	"os"
)

type Config struct {
	Port        string
	DatabaseURL string
	AdminSecret string
}

func Load() *Config {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is required")
	}
	adminSecret := os.Getenv("ADMIN_SECRET")
	if adminSecret == "" {
		log.Fatal("ADMIN_SECRET is required")
	}
	return &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: dbURL,
		AdminSecret: adminSecret,
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
