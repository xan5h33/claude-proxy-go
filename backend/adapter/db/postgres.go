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

const providerCols = `id, COALESCE(user_id::text,''), name, account_uuid, cap, is_active, window_start_hour, window_end_hour, window_timezone, rate_limited_until, total_input_tokens, total_output_tokens, created_at, updated_at`
const providerFullCols = `id, COALESCE(user_id::text,''), name, refresh_token, access_token, account_uuid, device_id, billing, cap, is_active, window_start_hour, window_end_hour, window_timezone, rate_limited_until, total_input_tokens, total_output_tokens, created_at, updated_at`

func scanProvider(row interface {
	Scan(...any) error
}, p *application.Provider, full bool) error {
	if full {
		return row.Scan(&p.ID, &p.UserID, &p.Name, &p.RefreshToken, &p.AccessToken, &p.AccountUUID, &p.DeviceID, &p.Billing,
			&p.Cap, &p.IsActive, &p.WindowStartHour, &p.WindowEndHour, &p.WindowTimezone, &p.RateLimitedUntil,
			&p.TotalInputTokens, &p.TotalOutputTokens, &p.CreatedAt, &p.UpdatedAt)
	}
	return row.Scan(&p.ID, &p.UserID, &p.Name, &p.AccountUUID,
		&p.Cap, &p.IsActive, &p.WindowStartHour, &p.WindowEndHour, &p.WindowTimezone, &p.RateLimitedUntil,
		&p.TotalInputTokens, &p.TotalOutputTokens, &p.CreatedAt, &p.UpdatedAt)
}

func (db *Postgres) Create(ctx context.Context, p *application.Provider) error {
	userID := p.UserID
	if userID == "" {
		return db.pool.QueryRow(ctx, `
			INSERT INTO providers (name, refresh_token, access_token, account_uuid, device_id, billing, cap, window_timezone)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
			RETURNING id, created_at, updated_at`,
			p.Name, p.RefreshToken, p.AccessToken, p.AccountUUID, p.DeviceID, p.Billing, p.Cap, p.WindowTimezone,
		).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
	}
	return db.pool.QueryRow(ctx, `
		INSERT INTO providers (user_id, name, refresh_token, access_token, account_uuid, device_id, billing, cap, window_timezone)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		RETURNING id, created_at, updated_at`,
		userID, p.Name, p.RefreshToken, p.AccessToken, p.AccountUUID, p.DeviceID, p.Billing, p.Cap, p.WindowTimezone,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
}

func (db *Postgres) FindByUserID(ctx context.Context, userID string) ([]*application.Provider, error) {
	rows, err := db.pool.Query(ctx, `SELECT `+providerCols+` FROM providers WHERE user_id=$1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]*application.Provider, 0)
	for rows.Next() {
		p := &application.Provider{}
		if err := scanProvider(rows, p, false); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (db *Postgres) FindAll(ctx context.Context) ([]*application.Provider, error) {
	rows, err := db.pool.Query(ctx, `SELECT `+providerCols+` FROM providers ORDER BY (total_input_tokens + total_output_tokens) ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]*application.Provider, 0)
	for rows.Next() {
		p := &application.Provider{}
		if err := scanProvider(rows, p, false); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (db *Postgres) FindAvailable(ctx context.Context) ([]*application.Provider, error) {
	rows, err := db.pool.Query(ctx, `
		SELECT `+providerFullCols+` FROM providers
		WHERE is_active = true
		AND (rate_limited_until IS NULL OR rate_limited_until < NOW())
		AND (
			window_start_hour IS NULL
			OR (window_start_hour <= window_end_hour
				AND EXTRACT(HOUR FROM NOW() AT TIME ZONE window_timezone)::int >= window_start_hour
				AND EXTRACT(HOUR FROM NOW() AT TIME ZONE window_timezone)::int < window_end_hour)
			OR (window_start_hour > window_end_hour
				AND (EXTRACT(HOUR FROM NOW() AT TIME ZONE window_timezone)::int >= window_start_hour
				  OR EXTRACT(HOUR FROM NOW() AT TIME ZONE window_timezone)::int < window_end_hour))
		)
		ORDER BY (total_input_tokens + total_output_tokens) ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]*application.Provider, 0)
	for rows.Next() {
		p := &application.Provider{}
		if err := scanProvider(rows, p, true); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (db *Postgres) FindByID(ctx context.Context, id string) (*application.Provider, error) {
	p := &application.Provider{}
	err := scanProvider(db.pool.QueryRow(ctx,
		`SELECT `+providerCols+` FROM providers WHERE id=$1`, id), p, false)
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

func (db *Postgres) UpdateSettings(ctx context.Context, id string, s application.ProviderSettings) error {
	_, err := db.pool.Exec(ctx,
		`UPDATE providers SET cap=$1, window_start_hour=$2, window_end_hour=$3, window_timezone=$4, updated_at=NOW() WHERE id=$5`,
		s.Cap, s.WindowStartHour, s.WindowEndHour, s.WindowTimezone, id)
	return err
}

func (db *Postgres) SetActive(ctx context.Context, id string, active bool) error {
	_, err := db.pool.Exec(ctx,
		`UPDATE providers SET is_active=$1, updated_at=NOW() WHERE id=$2`, active, id)
	return err
}

func (db *Postgres) SetRateLimitedUntil(ctx context.Context, id string, until *time.Time) error {
	_, err := db.pool.Exec(ctx,
		`UPDATE providers SET rate_limited_until=$1, updated_at=NOW() WHERE id=$2`, until, id)
	return err
}


func (db *Postgres) Delete(ctx context.Context, id string) error {
	_, err := db.pool.Exec(ctx, `DELETE FROM providers WHERE id=$1`, id)
	return err
}

// ── UserRepository ────────────────────────────────────────────────────────────

func scanUser(row interface{ Scan(...any) error }, u *application.User) error {
	return row.Scan(&u.ID, &u.APIKey, &u.Email, &u.PasswordHash, &u.IsAdmin, &u.Balance, &u.TotalInputTokens, &u.TotalOutputTokens, &u.CreatedAt)
}

const userCols = `id, api_key, COALESCE(email,''), COALESCE(password_hash,''), is_admin, balance, total_input_tokens, total_output_tokens, created_at`

func (db *Postgres) CreateUser(ctx context.Context, u *application.User) error {
	if u.Email != "" {
		return db.pool.QueryRow(ctx,
			`INSERT INTO users (api_key, email, password_hash) VALUES ($1,$2,$3) RETURNING id, created_at`,
			u.APIKey, u.Email, u.PasswordHash,
		).Scan(&u.ID, &u.CreatedAt)
	}
	return db.pool.QueryRow(ctx,
		`INSERT INTO users (api_key) VALUES ($1) RETURNING id, created_at`,
		u.APIKey,
	).Scan(&u.ID, &u.CreatedAt)
}

func (db *Postgres) FindByAPIKey(ctx context.Context, apiKey string) (*application.User, error) {
	u := &application.User{}
	if err := scanUser(db.pool.QueryRow(ctx, `SELECT `+userCols+` FROM users WHERE api_key=$1`, apiKey), u); err != nil {
		return nil, err
	}
	return u, nil
}

func (db *Postgres) FindByEmail(ctx context.Context, email string) (*application.User, error) {
	u := &application.User{}
	if err := scanUser(db.pool.QueryRow(ctx, `SELECT `+userCols+` FROM users WHERE email=$1`, email), u); err != nil {
		return nil, err
	}
	return u, nil
}

func (db *Postgres) FindAllUsers(ctx context.Context) ([]*application.User, error) {
	rows, err := db.pool.Query(ctx, `SELECT `+userCols+` FROM users ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]*application.User, 0)
	for rows.Next() {
		u := &application.User{}
		if err := scanUser(rows, u); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

func (db *Postgres) FindUserByID(ctx context.Context, id string) (*application.User, error) {
	u := &application.User{}
	if err := scanUser(db.pool.QueryRow(ctx, `SELECT `+userCols+` FROM users WHERE id=$1`, id), u); err != nil {
		return nil, err
	}
	return u, nil
}

func (db *Postgres) TopUpUserBalance(ctx context.Context, id string, amount int64) error {
	_, err := db.pool.Exec(ctx, `UPDATE users SET balance=balance+$1 WHERE id=$2`, amount, id)
	return err
}

func (db *Postgres) DeductUserBalance(ctx context.Context, id string, amount int64) error {
	_, err := db.pool.Exec(ctx, `UPDATE users SET balance=GREATEST(0, balance-$1) WHERE id=$2`, amount, id)
	return err
}

func (db *Postgres) UpdateUserAPIKey(ctx context.Context, id, newKey string) error {
	_, err := db.pool.Exec(ctx, `UPDATE users SET api_key=$1 WHERE id=$2`, newKey, id)
	return err
}

func (db *Postgres) SetUserAdmin(ctx context.Context, id string, admin bool) error {
	_, err := db.pool.Exec(ctx, `UPDATE users SET is_admin=$1 WHERE id=$2`, admin, id)
	return err
}

func (db *Postgres) DeleteUser(ctx context.Context, id string) error {
	_, err := db.pool.Exec(ctx, `DELETE FROM users WHERE id=$1`, id)
	return err
}

// ── UsageRepository ───────────────────────────────────────────────────────────

func (db *Postgres) Log(ctx context.Context, u *application.UsageLog) error {
	return db.pool.QueryRow(ctx, `
		INSERT INTO usage_log (user_id, provider_id, input_tokens, output_tokens)
		VALUES ($1,$2,$3,$4) RETURNING id, created_at`,
		u.UserID, u.ProviderID, u.InputTokens, u.OutputTokens,
	).Scan(&u.ID, &u.CreatedAt)
}

func (db *Postgres) AddTokens(ctx context.Context, userID, providerID string, input, output int) error {
	total := int64(input + output)
	_, err := db.pool.Exec(ctx, `
		UPDATE users
		SET total_input_tokens=total_input_tokens+$1,
		    total_output_tokens=total_output_tokens+$2,
		    balance=GREATEST(0, balance-$3)
		WHERE id=$4`,
		input, output, total, userID)
	if err != nil {
		return err
	}
	_, err = db.pool.Exec(ctx, `
		UPDATE providers SET total_input_tokens=total_input_tokens+$1, total_output_tokens=total_output_tokens+$2, updated_at=NOW() WHERE id=$3`,
		input, output, providerID)
	return err
}

func (db *Postgres) FindByUser(ctx context.Context, userID string) ([]*application.UsageLog, error) {
	rows, err := db.pool.Query(ctx, `
		SELECT id, user_id, provider_id, input_tokens, output_tokens, created_at
		FROM usage_log WHERE user_id=$1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]*application.UsageLog, 0)
	for rows.Next() {
		u := &application.UsageLog{}
		if err := rows.Scan(&u.ID, &u.UserID, &u.ProviderID, &u.InputTokens, &u.OutputTokens, &u.CreatedAt); err != nil {
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
			id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name                TEXT NOT NULL,
			refresh_token       TEXT NOT NULL,
			access_token        TEXT NOT NULL DEFAULT '',
			account_uuid        TEXT NOT NULL,
			device_id           TEXT NOT NULL,
			billing             TEXT NOT NULL,
			cap                 BIGINT NOT NULL DEFAULT 0,
			is_active           BOOLEAN NOT NULL DEFAULT true,
			window_start_hour   INT,
			window_end_hour     INT,
			window_timezone     TEXT NOT NULL DEFAULT 'UTC',
			rate_limited_until  TIMESTAMPTZ,
			total_input_tokens  BIGINT NOT NULL DEFAULT 0,
			total_output_tokens BIGINT NOT NULL DEFAULT 0,
			created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS users (
			id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			api_key             TEXT NOT NULL UNIQUE,
			email               TEXT UNIQUE,
			password_hash       TEXT,
			is_admin            BOOLEAN NOT NULL DEFAULT false,
			balance             BIGINT NOT NULL DEFAULT 0,
			total_input_tokens  BIGINT NOT NULL DEFAULT 0,
			total_output_tokens BIGINT NOT NULL DEFAULT 0,
			created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS usage_log (
			id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id       UUID NOT NULL REFERENCES users(id),
			provider_id   UUID NOT NULL REFERENCES providers(id),
			input_tokens  INT NOT NULL DEFAULT 0,
			output_tokens INT NOT NULL DEFAULT 0,
			created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		ALTER TABLE providers
			ADD COLUMN IF NOT EXISTS is_active           BOOLEAN NOT NULL DEFAULT true,
			ADD COLUMN IF NOT EXISTS window_start_hour   INT,
			ADD COLUMN IF NOT EXISTS window_end_hour     INT,
			ADD COLUMN IF NOT EXISTS window_timezone     TEXT NOT NULL DEFAULT 'UTC',
			ADD COLUMN IF NOT EXISTS rate_limited_until  TIMESTAMPTZ,
			ADD COLUMN IF NOT EXISTS total_input_tokens  BIGINT NOT NULL DEFAULT 0,
			ADD COLUMN IF NOT EXISTS total_output_tokens BIGINT NOT NULL DEFAULT 0,
			DROP COLUMN IF EXISTS earnings,
			DROP COLUMN IF EXISTS window_seconds;

		ALTER TABLE users
			ADD COLUMN IF NOT EXISTS email               TEXT UNIQUE,
			ADD COLUMN IF NOT EXISTS password_hash       TEXT,
			ADD COLUMN IF NOT EXISTS is_admin            BOOLEAN NOT NULL DEFAULT false,
			ADD COLUMN IF NOT EXISTS balance             BIGINT NOT NULL DEFAULT 0,
			ADD COLUMN IF NOT EXISTS total_input_tokens  BIGINT NOT NULL DEFAULT 0,
			ADD COLUMN IF NOT EXISTS total_output_tokens BIGINT NOT NULL DEFAULT 0,
			DROP COLUMN IF EXISTS cap,
			DROP COLUMN IF EXISTS total_used;

		ALTER TABLE providers
			ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

		ALTER TABLE usage_log
			DROP COLUMN IF EXISTS cost;
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
func (r *userRepo) FindByEmail(ctx context.Context, email string) (*application.User, error) {
	return r.Postgres.FindByEmail(ctx, email)
}
func (r *userRepo) FindAll(ctx context.Context) ([]*application.User, error) {
	return r.FindAllUsers(ctx)
}
func (r *userRepo) FindByID(ctx context.Context, id string) (*application.User, error) {
	return r.FindUserByID(ctx, id)
}
func (r *userRepo) TopUp(ctx context.Context, id string, amount int64) error {
	return r.TopUpUserBalance(ctx, id, amount)
}
func (r *userRepo) DeductBalance(ctx context.Context, id string, amount int64) error {
	return r.DeductUserBalance(ctx, id, amount)
}
func (r *userRepo) UpdateAPIKey(ctx context.Context, id, newKey string) error {
	return r.UpdateUserAPIKey(ctx, id, newKey)
}
func (r *userRepo) SetAdmin(ctx context.Context, id string, admin bool) error {
	return r.SetUserAdmin(ctx, id, admin)
}
func (r *userRepo) Delete(ctx context.Context, id string) error { return r.DeleteUser(ctx, id) }

func (r *usageRepo) Log(ctx context.Context, u *application.UsageLog) error {
	return r.Postgres.Log(ctx, u)
}
func (r *usageRepo) AddTokens(ctx context.Context, userID, providerID string, input, output int) error {
	return r.Postgres.AddTokens(ctx, userID, providerID, input, output)
}
func (r *usageRepo) FindByUser(ctx context.Context, id string) ([]*application.UsageLog, error) {
	return r.Postgres.FindByUser(ctx, id)
}

// suppress unused import
var _ = time.Now
