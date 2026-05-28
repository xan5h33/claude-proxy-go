package application

import (
	"context"
	"time"
)

type User struct {
	ID        string    `json:"id"`
	APIKey    string    `json:"api_key"`
	Balance   float64   `json:"balance"`
	TotalUsed float64   `json:"total_used"`
	CreatedAt time.Time `json:"created_at"`
}

type UserRepository interface {
	Create(ctx context.Context, u *User) error
	FindByAPIKey(ctx context.Context, apiKey string) (*User, error)
	FindAll(ctx context.Context) ([]*User, error)
	FindByID(ctx context.Context, id string) (*User, error)
	Delete(ctx context.Context, id string) error
}

type UserService struct {
	repo UserRepository
}

func NewUserService(repo UserRepository) *UserService {
	return &UserService{repo: repo}
}

func (s *UserService) Create(ctx context.Context, apiKey string) (*User, error) {
	u := &User{
		APIKey:    apiKey,
		CreatedAt: time.Now().UTC(),
	}
	if err := s.repo.Create(ctx, u); err != nil {
		return nil, err
	}
	return u, nil
}

func (s *UserService) FindByAPIKey(ctx context.Context, apiKey string) (*User, error) {
	return s.repo.FindByAPIKey(ctx, apiKey)
}

func (s *UserService) List(ctx context.Context) ([]*User, error) {
	return s.repo.FindAll(ctx)
}

func (s *UserService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
