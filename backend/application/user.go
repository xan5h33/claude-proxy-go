package application

import (
	"context"
	"time"
)

type User struct {
	ID                string    `json:"id"`
	Email             string    `json:"email,omitempty"`
	APIKey            string    `json:"api_key"`
	IsAdmin           bool      `json:"is_admin"`
	Balance           int64     `json:"balance"`
	TotalInputTokens  int64     `json:"total_input_tokens"`
	TotalOutputTokens int64     `json:"total_output_tokens"`
	CreatedAt         time.Time `json:"created_at"`

	PasswordHash string `json:"-"`
}

type UserRepository interface {
	Create(ctx context.Context, u *User) error
	FindByAPIKey(ctx context.Context, apiKey string) (*User, error)
	FindByEmail(ctx context.Context, email string) (*User, error)
	FindByClerkID(ctx context.Context, clerkID string) (*User, error)
	FindAll(ctx context.Context) ([]*User, error)
	FindByID(ctx context.Context, id string) (*User, error)
	TopUp(ctx context.Context, id string, amount int64) error
	DeductBalance(ctx context.Context, id string, amount int64) error
	UpdateAPIKey(ctx context.Context, id, newKey string) error
	SetClerkID(ctx context.Context, id, clerkID string) error
	SetAdmin(ctx context.Context, id string, admin bool) error
	Delete(ctx context.Context, id string) error
}

type UserService struct {
	repo UserRepository
}

func NewUserService(repo UserRepository) *UserService {
	return &UserService{repo: repo}
}

func (s *UserService) Create(ctx context.Context, apiKey string) (*User, error) {
	u := &User{APIKey: apiKey, CreatedAt: time.Now().UTC()}
	if err := s.repo.Create(ctx, u); err != nil {
		return nil, err
	}
	return u, nil
}

func (s *UserService) FindByAPIKey(ctx context.Context, apiKey string) (*User, error) {
	return s.repo.FindByAPIKey(ctx, apiKey)
}

func (s *UserService) FindByEmail(ctx context.Context, email string) (*User, error) {
	return s.repo.FindByEmail(ctx, email)
}

func (s *UserService) Get(ctx context.Context, id string) (*User, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *UserService) List(ctx context.Context) ([]*User, error) {
	return s.repo.FindAll(ctx)
}

func (s *UserService) TopUp(ctx context.Context, id string, amount int64) error {
	return s.repo.TopUp(ctx, id, amount)
}

func (s *UserService) DeductBalance(ctx context.Context, id string, amount int64) error {
	return s.repo.DeductBalance(ctx, id, amount)
}

func (s *UserService) RotateKey(ctx context.Context, id, newKey string) (*User, error) {
	if err := s.repo.UpdateAPIKey(ctx, id, newKey); err != nil {
		return nil, err
	}
	return s.repo.FindByID(ctx, id)
}

func (s *UserService) FindByClerkID(ctx context.Context, clerkID string) (*User, error) {
	return s.repo.FindByClerkID(ctx, clerkID)
}

func (s *UserService) SetClerkID(ctx context.Context, id, clerkID string) error {
	return s.repo.SetClerkID(ctx, id, clerkID)
}

func (s *UserService) SetAdmin(ctx context.Context, id string, admin bool) error {
	return s.repo.SetAdmin(ctx, id, admin)
}

func (s *UserService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
