package application

import (
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrEmailTaken         = errors.New("email already taken")
)

type AuthClaims struct {
	jwt.RegisteredClaims
	IsAdmin bool `json:"admin"`
}

type AuthService struct {
	users     UserRepository
	jwtSecret []byte
}

func NewAuthService(users UserRepository, jwtSecret string) *AuthService {
	return &AuthService{users: users, jwtSecret: []byte(jwtSecret)}
}

func (s *AuthService) Register(ctx context.Context, email, password string) (*User, error) {
	existing, _ := s.users.FindByEmail(ctx, email)
	if existing != nil {
		return nil, ErrEmailTaken
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	u := &User{
		APIKey:       "sk-proxy-" + uuid.New().String(),
		Email:        email,
		PasswordHash: string(hash),
	}
	if err := s.users.Create(ctx, u); err != nil {
		return nil, err
	}
	return u, nil
}

func (s *AuthService) Login(ctx context.Context, email, password string) (string, *User, error) {
	u, err := s.users.FindByEmail(ctx, email)
	if err != nil || u == nil || u.PasswordHash == "" {
		return "", nil, ErrInvalidCredentials
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)); err != nil {
		return "", nil, ErrInvalidCredentials
	}
	tok, err := s.makeToken(u)
	return tok, u, err
}

func (s *AuthService) ParseToken(tokenStr string) (*AuthClaims, error) {
	tok, err := jwt.ParseWithClaims(tokenStr, &AuthClaims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return s.jwtSecret, nil
	})
	if err != nil || !tok.Valid {
		return nil, errors.New("invalid token")
	}
	claims, ok := tok.Claims.(*AuthClaims)
	if !ok {
		return nil, errors.New("invalid claims")
	}
	return claims, nil
}

func (s *AuthService) ClerkSync(ctx context.Context, clerkID, email string) (*User, error) {
	// Find by clerk_id first (returning user)
	if u, err := s.users.FindByClerkID(ctx, clerkID); err == nil && u != nil {
		return u, nil
	}
	// Link existing email/password account if email matches
	if email != "" {
		if u, err := s.users.FindByEmail(ctx, email); err == nil && u != nil {
			_ = s.users.SetClerkID(ctx, u.ID, clerkID)
			return u, nil
		}
	}
	// Create new user
	u := &User{
		APIKey: "sk-proxy-" + uuid.New().String(),
		Email:  email,
	}
	if err := s.users.Create(ctx, u); err != nil {
		return nil, err
	}
	_ = s.users.SetClerkID(ctx, u.ID, clerkID)
	return u, nil
}

func (s *AuthService) MakeToken(u *User) (string, error) {
	return s.makeToken(u)
}

func (s *AuthService) makeToken(u *User) (string, error) {
	claims := AuthClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   u.ID,
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
		},
		IsAdmin: u.IsAdmin,
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.jwtSecret)
}
