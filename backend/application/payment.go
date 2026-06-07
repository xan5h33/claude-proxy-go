package application

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/checkout/session"
	"github.com/stripe/stripe-go/v76/webhook"
)

type Tier struct {
	AmountCents int64
	Tokens      int64
	Label       string
}

var Tiers = map[string]Tier{
	"starter": {AmountCents: 200, Tokens: 200_000, Label: "Starter"},
	"regular": {AmountCents: 800, Tokens: 1_000_000, Label: "Regular"},
	"heavy":   {AmountCents: 1500, Tokens: 2_000_000, Label: "Heavy"},
}

type PaymentService struct {
	users         *UserService
	webhookSecret string
	appURL        string
}

func NewPaymentService(users *UserService, stripeSecretKey, webhookSecret, appURL string) *PaymentService {
	stripe.Key = stripeSecretKey
	return &PaymentService{users: users, webhookSecret: webhookSecret, appURL: appURL}
}

func (s *PaymentService) CreateCheckoutSession(ctx context.Context, userID, tierKey string) (string, error) {
	tier, ok := Tiers[tierKey]
	if !ok {
		return "", fmt.Errorf("unknown tier: %s", tierKey)
	}

	params := &stripe.CheckoutSessionParams{
		Mode: stripe.String(string(stripe.CheckoutSessionModePayment)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("usd"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name: stripe.String(fmt.Sprintf("ladle — %s (%s tokens)", tier.Label, formatTokens(tier.Tokens))),
					},
					UnitAmount: stripe.Int64(tier.AmountCents),
				},
				Quantity: stripe.Int64(1),
			},
		},
		Metadata: map[string]string{
			"user_id": userID,
			"tokens":  fmt.Sprintf("%d", tier.Tokens),
		},
		SuccessURL: stripe.String(s.appURL + "/topup/success?session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:  stripe.String(s.appURL + "/topup"),
	}

	sess, err := session.New(params)
	if err != nil {
		return "", err
	}
	return sess.URL, nil
}

func (s *PaymentService) HandleWebhook(ctx context.Context, payload []byte, sig string) error {
	event, err := webhook.ConstructEvent(payload, sig, s.webhookSecret)
	if err != nil {
		return fmt.Errorf("webhook signature: %w", err)
	}

	if event.Type != "checkout.session.completed" {
		return nil
	}

	var sess stripe.CheckoutSession
	if err := json.Unmarshal(event.Data.Raw, &sess); err != nil {
		return err
	}

	userID := sess.Metadata["user_id"]
	tokensStr := sess.Metadata["tokens"]
	if userID == "" || tokensStr == "" {
		return fmt.Errorf("missing metadata in checkout session")
	}

	var tokens int64
	if _, err := fmt.Sscanf(tokensStr, "%d", &tokens); err != nil {
		return fmt.Errorf("invalid tokens in metadata: %w", err)
	}

	return s.users.TopUp(ctx, userID, tokens)
}

func formatTokens(n int64) string {
	if n >= 1_000_000 {
		return fmt.Sprintf("%dM", n/1_000_000)
	}
	if n >= 1_000 {
		return fmt.Sprintf("%dK", n/1_000)
	}
	return fmt.Sprintf("%d", n)
}
