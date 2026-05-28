package provider

import (
	"context"
	"errors"

	"claude-proxy/application"
)

var ErrNoProviders = errors.New("no providers available")

type LeastUsed struct {
	repo application.ProviderRepository
}

func NewLeastUsed(repo application.ProviderRepository) *LeastUsed {
	return &LeastUsed{repo: repo}
}

func (s *LeastUsed) Select(ctx context.Context) (*application.Provider, error) {
	providers, err := s.repo.FindAvailable(ctx)
	if err != nil {
		return nil, err
	}
	if len(providers) == 0 {
		return nil, ErrNoProviders
	}

	best := providers[0]
	for _, p := range providers[1:] {
		if (p.TotalInputTokens + p.TotalOutputTokens) < (best.TotalInputTokens + best.TotalOutputTokens) {
			best = p
		}
	}
	return best, nil
}
