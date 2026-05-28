package db

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"claude-proxy/application"
)

type Postgres struct {
	pool *pgxpool.Pool
}

func NewPostgres(ctx context.Context, dsn string) (*Postgres, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, err
	}
	return &Postgres{pool: pool}, nil
}

// ── ProviderRepository ────────────────────────────────────────────────────────

func (db *Postgres) Create(ctx context.Context, p *application.Provider) error {
	return db.pool.QueryRow(ctx, `
		INSERT INTO providers (name, refresh_token, access_token, account_uuid, device_id, billing, cap, window_seconds)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		RETURNING id, created_at, updated_at`,
		p.Name, p.RefreshToken, p.AccessToken, p.AccountUUID, p.DeviceID, p.Billing, p.Cap, p.WindowSeconds,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
}

func (db *Postgres) FindAll(ctx context.Context) ([]*application.Provider, error) {
	rows, err := db.pool.Query(ctx, `
		SELECT id, name, refresh_token, access_token, account_uuid, device_id, billing, cap, window_seconds, earnings, created_at, updated_at
		FROM providers ORDER BY earnings ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]*application.Provider, 0)
	for rows.Next() {
		p := &application.Provider{}
		if err := rows.Scan(&p.ID, &p.Name, &p.RefreshToken, &p.AccessToken, &p.AccountUUID, &p.DeviceID, &p.Billing, &p.Cap, &p.WindowSeconds, &p.Earnings, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (db *Postgres) FindByID(ctx context.Context, id string) (*application.Provider, error) {
	p := &application.Provider{}
	err := db.pool.QueryRow(ctx, `
		SELECT id, name, refresh_token, access_token, account_uuid, device_id, billing, cap, window_seconds, earnings, created_at, updated_at
		FROM providers WHERE id=$1`, id,
	).Scan(&p.ID, &p.Name, &p.RefreshToken, &p.AccessToken, &p.AccountUUID, &p.DeviceID, &p.Billing, &p.Cap, &p.WindowSeconds, &p.Earnings, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (db *Postgres) UpdateTokens(ctx context.Context, id, accessToken, refreshToken string) error {
	_, err := db.pool.Exec(ctx,
		`UPDATE providers SET access_token=$1, refresh_token=$2, updated_at=NOW() WHERE id=$3`,
		accessToken, refreshToken, id)
	return err
}

func (db *Postgres) UpdateRefreshToken(ctx context.Context, id, refreshToken string) error {
	_, err := db.pool.Exec(ctx,
		`UPDATE providers SET refresh_token=$1, updated_at=NOW() WHERE id=$2`,
		refreshToken, id)
	return err
}

func (db *Postgres) AddEarnings(ctx context.Context, id string, amount float64) error {
	_, err := db.pool.Exec(ctx,
		`UPDATE providers SET earnings=earnings+$1, updated_at=NOW() WHERE id=$2`,
		amount, id)
	return err
}

func (db *Postgres) Delete(ctx context.Context, id string) error {
	_, err := db.pool.Exec(ctx, `DELETE FROM providers WHERE id=$1`, id)
	return err
}

// ── UserRepository ────────────────────────────────────────────────────────────

func (db *Postgres) CreateUser(ctx context.Context, u *application.User) error {
	return db.pool.QueryRow(ctx,
		`INSERT INTO users (api_key) VALUES ($1) RETURNING id, created_at`,
		u.APIKey,
	).Scan(&u.ID, &u.CreatedAt)
}

func (db *Postgres) FindByAPIKey(ctx context.Context, apiKey string) (*application.User, error) {
	u := &application.User{}
	err := db.pool.QueryRow(ctx,
		`SELECT id, api_key, balance, total_used, created_at FROM users WHERE api_key=$1`, apiKey,
	).Scan(&u.ID, &u.APIKey, &u.Balance, &u.TotalUsed, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (db *Postgres) FindAllUsers(ctx context.Context) ([]*application.User, error) {
	rows, err := db.pool.Query(ctx, `SELECT id, api_key, balance, total_used, created_at FROM users ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]*application.User, 0)
	for rows.Next() {
		u := &application.User{}
		if err := rows.Scan(&u.ID, &u.APIKey, &u.Balance, &u.TotalUsed, &u.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

func (db *Postgres) FindUserByID(ctx context.Context, id string) (*application.User, error) {
	u := &application.User{}
	err := db.pool.QueryRow(ctx,
		`SELECT id, api_key, balance, total_used, created_at FROM users WHERE id=$1`, id,
	).Scan(&u.ID, &u.APIKey, &u.Balance, &u.TotalUsed, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (db *Postgres) DeleteUser(ctx context.Context, id string) error {
	_, err := db.pool.Exec(ctx, `DELETE FROM users WHERE id=$1`, id)
	return err
}

// ── UsageRepository ───────────────────────────────────────────────────────────

func (db *Postgres) Log(ctx context.Context, u *application.UsageLog) error {
	return db.pool.QueryRow(ctx, `
		INSERT INTO usage_log (user_id, provider_id, input_tokens, output_tokens, cost)
		VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at`,
		u.UserID, u.ProviderID, u.InputTokens, u.OutputTokens, u.Cost,
	).Scan(&u.ID, &u.CreatedAt)
}

func (db *Postgres) FindByUser(ctx context.Context, userID string) ([]*application.UsageLog, error) {
	rows, err := db.pool.Query(ctx, `
		SELECT id, user_id, provider_id, input_tokens, output_tokens, cost, created_at
		FROM usage_log WHERE user_id=$1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*application.UsageLog
	for rows.Next() {
		u := &application.UsageLog{}
		if err := rows.Scan(&u.ID, &u.UserID, &u.ProviderID, &u.InputTokens, &u.OutputTokens, &u.Cost, &u.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

// RunMigrations creates tables if they don't exist.
func (db *Postgres) RunMigrations(ctx context.Context) error {
	_, err := db.pool.Exec(ctx, `
		CREATE EXTENSION IF NOT EXISTS "pgcrypto";

		CREATE TABLE IF NOT EXISTS providers (
			id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name            TEXT NOT NULL,
			refresh_token   TEXT NOT NULL,
			access_token    TEXT NOT NULL DEFAULT '',
			account_uuid    TEXT NOT NULL,
			device_id       TEXT NOT NULL,
			billing         TEXT NOT NULL,
			cap             BIGINT NOT NULL DEFAULT 0,
			window_seconds  INT NOT NULL DEFAULT 3600,
			earnings        NUMERIC(12,6) NOT NULL DEFAULT 0,
			created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS users (
			id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			api_key     TEXT NOT NULL UNIQUE,
			balance     NUMERIC(12,6) NOT NULL DEFAULT 0,
			total_used  NUMERIC(12,6) NOT NULL DEFAULT 0,
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS usage_log (
			id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id       UUID NOT NULL REFERENCES users(id),
			provider_id   UUID NOT NULL REFERENCES providers(id),
			input_tokens  INT NOT NULL DEFAULT 0,
			output_tokens INT NOT NULL DEFAULT 0,
			cost          NUMERIC(12,6) NOT NULL DEFAULT 0,
			created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`)
	return err
}

// Compile-time interface checks
var _ application.ProviderRepository = (*Postgres)(nil)

// adapter shims to satisfy separate interfaces via the same struct
type userRepo struct{ *Postgres }
type usageRepo struct{ *Postgres }

func (db *Postgres) AsUserRepo() application.UserRepository   { return &userRepo{db} }
func (db *Postgres) AsUsageRepo() application.UsageRepository { return &usageRepo{db} }

func (r *userRepo) Create(ctx context.Context, u *application.User) error {
	return r.CreateUser(ctx, u)
}
func (r *userRepo) FindByAPIKey(ctx context.Context, k string) (*application.User, error) {
	return r.Postgres.FindByAPIKey(ctx, k)
}
func (r *userRepo) FindAll(ctx context.Context) ([]*application.User, error) {
	return r.FindAllUsers(ctx)
}
func (r *userRepo) FindByID(ctx context.Context, id string) (*application.User, error) {
	return r.FindUserByID(ctx, id)
}
func (r *userRepo) Delete(ctx context.Context, id string) error { return r.DeleteUser(ctx, id) }

func (r *usageRepo) Log(ctx context.Context, u *application.UsageLog) error {
	return r.Postgres.Log(ctx, u)
}
func (r *usageRepo) FindByUser(ctx context.Context, id string) ([]*application.UsageLog, error) {
	return r.Postgres.FindByUser(ctx, id)
}

// suppress unused import
var _ = time.Now
