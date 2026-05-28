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
	Cap               int64     `json:"cap"`
	TotalInputTokens  int64     `json:"total_input_tokens"`
	TotalOutputTokens int64     `json:"total_output_tokens"`
	CreatedAt         time.Time `json:"created_at"`

	PasswordHash string `json:"-"`
}

type UserRepository interface {
	Create(ctx context.Context, u *User) error
	FindByAPIKey(ctx context.Context, apiKey string) (*User, error)
	FindByEmail(ctx context.Context, email string) (*User, error)
	FindAll(ctx context.Context) ([]*User, error)
	FindByID(ctx context.Context, id string) (*User, error)
	UpdateCap(ctx context.Context, id string, cap int64) error
	UpdateAPIKey(ctx context.Context, id, newKey string) error
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

func (s *UserService) UpdateCap(ctx context.Context, id string, cap int64) error {
	return s.repo.UpdateCap(ctx, id, cap)
}

func (s *UserService) RotateKey(ctx context.Context, id, newKey string) (*User, error) {
	if err := s.repo.UpdateAPIKey(ctx, id, newKey); err != nil {
		return nil, err
	}
	return s.repo.FindByID(ctx, id)
}

func (s *UserService) SetAdmin(ctx context.Context, id string, admin bool) error {
	return s.repo.SetAdmin(ctx, id, admin)
}

func (s *UserService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
