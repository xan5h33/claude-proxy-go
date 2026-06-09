package application

import (
	"context"
	"fmt"
	"time"
)

const MinPayoutAmount = 10.0

type PayoutRequest struct {
	ID         string    `json:"id"`
	ProviderID string    `json:"provider_id"`
	Amount     float64   `json:"amount"`
	Status     string    `json:"status"` // pending, approved, rejected
	Note       string    `json:"note,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type PayoutRepository interface {
	CreatePayout(ctx context.Context, providerID string, amount float64) (*PayoutRequest, error)
	FindPayoutsByProvider(ctx context.Context, providerID string) ([]*PayoutRequest, error)
	FindAllPayouts(ctx context.Context) ([]*PayoutRequest, error)
	UpdatePayoutStatus(ctx context.Context, id, status, note string) (*PayoutRequest, error)
	DeductProviderEarnings(ctx context.Context, providerID string, amount float64) error
	HasPendingPayout(ctx context.Context, providerID string) (bool, error)
}

type PayoutService struct {
	repo PayoutRepository
}

func NewPayoutService(repo PayoutRepository) *PayoutService {
	return &PayoutService{repo: repo}
}

func (s *PayoutService) Request(ctx context.Context, providerID string, earnings float64) (*PayoutRequest, error) {
	if earnings < MinPayoutAmount {
		return nil, fmt.Errorf("minimum payout is $%.2f (current earnings: $%.4f)", MinPayoutAmount, earnings)
	}
	pending, err := s.repo.HasPendingPayout(ctx, providerID)
	if err != nil {
		return nil, err
	}
	if pending {
		return nil, fmt.Errorf("a payout request is already pending")
	}
	return s.repo.CreatePayout(ctx, providerID, earnings)
}

func (s *PayoutService) ListByProvider(ctx context.Context, providerID string) ([]*PayoutRequest, error) {
	return s.repo.FindPayoutsByProvider(ctx, providerID)
}

func (s *PayoutService) ListAll(ctx context.Context) ([]*PayoutRequest, error) {
	return s.repo.FindAllPayouts(ctx)
}

func (s *PayoutService) Approve(ctx context.Context, id, note string) (*PayoutRequest, error) {
	pr, err := s.repo.UpdatePayoutStatus(ctx, id, "approved", note)
	if err != nil {
		return nil, err
	}
	return pr, s.repo.DeductProviderEarnings(ctx, pr.ProviderID, pr.Amount)
}

func (s *PayoutService) Reject(ctx context.Context, id, note string) (*PayoutRequest, error) {
	return s.repo.UpdatePayoutStatus(ctx, id, "rejected", note)
}
