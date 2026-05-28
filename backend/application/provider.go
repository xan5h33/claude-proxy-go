package application

import (
	"context"
	"time"
)

type Provider struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	RefreshToken  string    `json:"refresh_token"`
	AccessToken   string    `json:"access_token"`
	AccountUUID   string    `json:"account_uuid"`
	DeviceID      string    `json:"device_id"`
	Billing       string    `json:"billing"`
	Cap           int64     `json:"cap"`
	WindowSeconds int       `json:"window_seconds"`
	Earnings      float64   `json:"earnings"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
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
