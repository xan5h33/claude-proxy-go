package application

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

type Tier struct {
	Tokens int64
	Label  string
}

var Tiers = map[string]Tier{
	"starter": {Tokens: 200_000, Label: "Starter"},
	"regular": {Tokens: 1_000_000, Label: "Regular"},
	"heavy":   {Tokens: 2_000_000, Label: "Heavy"},
}

type PaymentService struct {
	users         *UserService
	apiKey        string
	webhookSecret string
	appURL        string
	productIDs    map[string]string // tier key → Polar product ID
}

func NewPaymentService(users *UserService, apiKey, webhookSecret, appURL string, productIDs map[string]string) *PaymentService {
	return &PaymentService{
		users:         users,
		apiKey:        apiKey,
		webhookSecret: webhookSecret,
		appURL:        appURL,
		productIDs:    productIDs,
	}
}

func (s *PaymentService) CreateCheckoutSession(ctx context.Context, userID, tierKey string) (string, error) {
	tier, ok := Tiers[tierKey]
	if !ok {
		return "", fmt.Errorf("unknown tier: %s", tierKey)
	}
	productID, ok := s.productIDs[tierKey]
	if !ok || productID == "" {
		return "", fmt.Errorf("product not configured for tier: %s", tierKey)
	}

	payload, _ := json.Marshal(map[string]any{
		"product_id":  productID,
		"success_url": s.appURL + "/topup/success",
		"customer_metadata": map[string]string{
			"user_id": userID,
			"tokens":  fmt.Sprintf("%d", tier.Tokens),
		},
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.polar.sh/v1/checkouts", bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("polar API error %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		URL string `json:"url"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}
	if result.URL == "" {
		return "", fmt.Errorf("polar returned empty checkout URL")
	}
	return result.URL, nil
}

func (s *PaymentService) HandleWebhook(ctx context.Context, payload []byte, webhookID, webhookTimestamp, webhookSig string) error {
	if err := s.verifySignature(payload, webhookID, webhookTimestamp, webhookSig); err != nil {
		return err
	}

	var event struct {
		Type string          `json:"type"`
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(payload, &event); err != nil {
		return err
	}

	// order.created fires when a one-time payment succeeds
	if event.Type != "order.created" {
		return nil
	}

	var order struct {
		Customer struct {
			Metadata map[string]string `json:"metadata"`
		} `json:"customer"`
	}
	if err := json.Unmarshal(event.Data, &order); err != nil {
		return err
	}

	userID := order.Customer.Metadata["user_id"]
	tokensStr := order.Customer.Metadata["tokens"]
	if userID == "" || tokensStr == "" {
		return fmt.Errorf("missing metadata in order")
	}

	var tokens int64
	if _, err := fmt.Sscanf(tokensStr, "%d", &tokens); err != nil {
		return fmt.Errorf("invalid tokens in metadata: %w", err)
	}

	return s.users.TopUp(ctx, userID, tokens)
}

// verifySignature implements the Standardwebhooks verification spec.
func (s *PaymentService) verifySignature(payload []byte, msgID, msgTimestamp, msgSig string) error {
	if msgID == "" || msgTimestamp == "" || msgSig == "" {
		return fmt.Errorf("missing webhook signature headers")
	}

	secret := s.webhookSecret
	if after, ok := strings.CutPrefix(secret, "whsec_"); ok {
		secret = after
	}
	// Try base64 decode first; fall back to raw bytes
	var secretBytes []byte
	if decoded, err := base64.StdEncoding.DecodeString(secret); err == nil {
		secretBytes = decoded
	} else {
		secretBytes = []byte(secret)
	}

	toSign := fmt.Sprintf("%s.%s.%s", msgID, msgTimestamp, string(payload))
	mac := hmac.New(sha256.New, secretBytes)
	mac.Write([]byte(toSign))
	expected := "v1," + base64.StdEncoding.EncodeToString(mac.Sum(nil))

	for _, sig := range strings.Fields(msgSig) {
		if hmac.Equal([]byte(sig), []byte(expected)) {
			return nil
		}
	}
	return fmt.Errorf("webhook signature mismatch")
}
