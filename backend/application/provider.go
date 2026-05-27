package application

import (
	"context"
	"time"
)

type Provider struct {
	ID            string
	Name          string
	RefreshToken  string
	AccessToken   string
	AccountUUID   string
	DeviceID      string
	Billing       string
	Cap           int64
	WindowSeconds int
	Earnings      float64
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type ProviderRepository interface {
	Create(ctx context.Context, p *Provider) error
	FindAll(ctx context.Context) ([]*Provider, error)
	FindByID(ctx context.Context, id string) (*Provider, error)
	UpdateTokens(ctx context.Context, id, accessToken, refreshToken string) error
	UpdateRefreshToken(ctx context.Context, id, refreshToken string) error
	AddEarnings(ctx context.Context, id string, amount float64) error
	Delete(ctx context.Context, id string) error
}

type ProviderService struct {
	repo ProviderRepository
}

func NewProviderService(repo ProviderRepository) *ProviderService {
	return &ProviderService{repo: repo}
}

func (s *ProviderService) Register(ctx context.Context, name, refreshToken, accessToken, accountUUID, deviceID, billing string, cap int64, windowSeconds int) (*Provider, error) {
	p := &Provider{
		Name:          name,
		RefreshToken:  refreshToken,
		AccessToken:   accessToken,
		AccountUUID:   accountUUID,
		DeviceID:      deviceID,
		Billing:       billing,
		Cap:           cap,
		WindowSeconds: windowSeconds,
		CreatedAt:     time.Now().UTC(),
		UpdatedAt:     time.Now().UTC(),
	}
	if err := s.repo.Create(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *ProviderService) List(ctx context.Context) ([]*Provider, error) {
	return s.repo.FindAll(ctx)
}

func (s *ProviderService) Get(ctx context.Context, id string) (*Provider, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *ProviderService) UpdateRefreshToken(ctx context.Context, id, refreshToken string) error {
	return s.repo.UpdateRefreshToken(ctx, id, refreshToken)
}

func (s *ProviderService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
