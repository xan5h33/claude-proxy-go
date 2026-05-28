package application

import (
	"context"
	"time"
)

type Provider struct {
	ID                 string     `json:"id"`
	Name               string     `json:"name"`
	RefreshToken       string     `json:"refresh_token,omitempty"`
	AccessToken        string     `json:"access_token,omitempty"`
	AccountUUID        string     `json:"account_uuid"`
	DeviceID           string     `json:"device_id,omitempty"`
	Billing            string     `json:"billing,omitempty"`
	Cap                int64      `json:"cap"`
	IsActive           bool       `json:"is_active"`
	WindowStartHour    *int       `json:"window_start_hour"`
	WindowEndHour      *int       `json:"window_end_hour"`
	WindowTimezone     string     `json:"window_timezone"`
	RateLimitedUntil   *time.Time `json:"rate_limited_until"`
	TotalInputTokens   int64      `json:"total_input_tokens"`
	TotalOutputTokens  int64      `json:"total_output_tokens"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

type ProviderSettings struct {
	Cap             int64  `json:"cap"`
	WindowStartHour *int   `json:"window_start_hour"`
	WindowEndHour   *int   `json:"window_end_hour"`
	WindowTimezone  string `json:"window_timezone"`
}

type ProviderRepository interface {
	Create(ctx context.Context, p *Provider) error
	FindAll(ctx context.Context) ([]*Provider, error)
	FindAvailable(ctx context.Context) ([]*Provider, error)
	FindByID(ctx context.Context, id string) (*Provider, error)
	UpdateTokens(ctx context.Context, id, accessToken, refreshToken string) error
	UpdateRefreshToken(ctx context.Context, id, refreshToken string) error
	UpdateSettings(ctx context.Context, id string, s ProviderSettings) error
	SetActive(ctx context.Context, id string, active bool) error
	SetRateLimitedUntil(ctx context.Context, id string, until *time.Time) error
	Delete(ctx context.Context, id string) error
}

type ProviderService struct {
	repo ProviderRepository
}

func NewProviderService(repo ProviderRepository) *ProviderService {
	return &ProviderService{repo: repo}
}

func (s *ProviderService) Register(ctx context.Context, name, refreshToken, accessToken, accountUUID, deviceID, billing string, cap int64) (*Provider, error) {
	p := &Provider{
		Name:           name,
		RefreshToken:   refreshToken,
		AccessToken:    accessToken,
		AccountUUID:    accountUUID,
		DeviceID:       deviceID,
		Billing:        billing,
		Cap:            cap,
		IsActive:       true,
		WindowTimezone: "UTC",
		CreatedAt:      time.Now().UTC(),
		UpdatedAt:      time.Now().UTC(),
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

func (s *ProviderService) UpdateSettings(ctx context.Context, id string, s2 ProviderSettings) error {
	return s.repo.UpdateSettings(ctx, id, s2)
}

func (s *ProviderService) SetActive(ctx context.Context, id string, active bool) error {
	return s.repo.SetActive(ctx, id, active)
}

func (s *ProviderService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
