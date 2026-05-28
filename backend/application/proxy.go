package application

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"time"
)

type UsageLog struct {
	ID           string
	UserID       string
	ProviderID   string
	InputTokens  int
	OutputTokens int
	CreatedAt    time.Time
}

type UsageRepository interface {
	Log(ctx context.Context, u *UsageLog) error
	AddTokens(ctx context.Context, userID, providerID string, input, output int) error
	FindByUser(ctx context.Context, userID string) ([]*UsageLog, error)
}

type AnthropicClient interface {
	Forward(ctx context.Context, req *ForwardRequest, provider *Provider) (*ForwardResponse, error)
	RefreshToken(ctx context.Context, provider *Provider) (accessToken, refreshToken string, err error)
}

type ForwardRequest struct {
	Method  string
	Path    string
	Headers map[string]string
	Body    []byte
}

type ForwardResponse struct {
	StatusCode int
	Headers    map[string]string
	Body       io.ReadCloser
	IsStream   bool
	ProviderID string
}

type Selector interface {
	Select(ctx context.Context) (*Provider, error)
}

type ProxyService struct {
	client   AnthropicClient
	selector Selector
	usage    UsageRepository
	provRepo ProviderRepository
}

func NewProxyService(client AnthropicClient, selector Selector, usage UsageRepository, provRepo ProviderRepository) *ProxyService {
	return &ProxyService{
		client:   client,
		selector: selector,
		usage:    usage,
		provRepo: provRepo,
	}
}

func (s *ProxyService) Forward(ctx context.Context, req *ForwardRequest, userID string) (*ForwardResponse, error) {
	provider, err := s.selector.Select(ctx)
	if err != nil {
		return nil, err
	}

	mutated, err := s.mutateBody(req.Body, provider)
	if err != nil {
		return nil, err
	}
	req.Body = mutated

	resp, err := s.client.Forward(ctx, req, provider)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode == 401 {
		resp.Body.Close()
		access, refresh, err := s.client.RefreshToken(ctx, provider)
		if err != nil {
			return nil, err
		}
		provider.AccessToken = access
		provider.RefreshToken = refresh
		if err := s.provRepo.UpdateTokens(ctx, provider.ID, access, refresh); err != nil {
			log.Printf("update tokens: %v", err)
		}
		resp, err = s.client.Forward(ctx, req, provider)
		if err != nil {
			return nil, err
		}
	}

	resp.ProviderID = provider.ID
	return resp, nil
}

func (s *ProxyService) LogUsage(ctx context.Context, userID, providerID string, input, output int) {
	if input == 0 && output == 0 {
		return
	}
	if err := s.usage.Log(ctx, &UsageLog{
		UserID:       userID,
		ProviderID:   providerID,
		InputTokens:  input,
		OutputTokens: output,
		CreatedAt:    time.Now().UTC(),
	}); err != nil {
		log.Printf("usage log: %v", err)
	}
	if err := s.usage.AddTokens(ctx, userID, providerID, input, output); err != nil {
		log.Printf("add tokens: %v", err)
	}
}

func (s *ProxyService) mutateBody(raw []byte, p *Provider) ([]byte, error) {
	if len(raw) == 0 {
		return raw, nil
	}
	var body map[string]any
	if err := json.Unmarshal(raw, &body); err != nil {
		return nil, err
	}

	billingText := "x-anthropic-billing-header: " + p.Billing
	system, _ := body["system"].([]any)
	found := false
	for i, block := range system {
		m, ok := block.(map[string]any)
		if !ok {
			continue
		}
		text, _ := m["text"].(string)
		if len(text) > 28 && text[:28] == "x-anthropic-billing-header: " {
			system[i].(map[string]any)["text"] = billingText
			found = true
			break
		}
	}
	if !found {
		system = append([]any{map[string]any{"type": "text", "text": billingText}}, system...)
	}
	body["system"] = system

	if meta, ok := body["metadata"].(map[string]any); ok {
		if raw, ok := meta["user_id"].(string); ok {
			var uid map[string]any
			if err := json.Unmarshal([]byte(raw), &uid); err == nil {
				uid["account_uuid"] = p.AccountUUID
				uid["device_id"] = p.DeviceID
				b, _ := json.Marshal(uid)
				meta["user_id"] = string(b)
			}
		}
	}

	return json.Marshal(body)
}
