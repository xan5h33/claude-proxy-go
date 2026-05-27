package anthropic

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	"claude-proxy/application"
)

const (
	target   = "https://api.anthropic.com"
	tokenURL = "https://platform.claude.com/v1/oauth/token"
	clientID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e"
)

type Client struct {
	httpClient *http.Client
}

func NewClient() *Client {
	return &Client{httpClient: &http.Client{}}
}

func (c *Client) Forward(ctx context.Context, req *application.ForwardRequest, provider *application.Provider) (*application.ForwardResponse, error) {
	return c.doRequest(ctx, req, provider.AccessToken)
}

func (c *Client) RefreshToken(ctx context.Context, provider *application.Provider) (access, refresh string, err error) {
	body, _ := json.Marshal(map[string]string{
		"grant_type":    "refresh_token",
		"refresh_token": provider.RefreshToken,
		"client_id":     clientID,
	})
	resp, err := c.httpClient.Post(tokenURL, "application/json", bytes.NewReader(body))
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	var result struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", "", err
	}
	if result.AccessToken == "" {
		return "", "", fmt.Errorf("refresh returned empty access token")
	}
	newRefresh := result.RefreshToken
	if newRefresh == "" {
		newRefresh = provider.RefreshToken
	}
	log.Printf("provider %s token refreshed", provider.ID)
	return result.AccessToken, newRefresh, nil
}

func (c *Client) doRequest(ctx context.Context, req *application.ForwardRequest, token string) (*application.ForwardResponse, error) {
	upstreamReq, err := http.NewRequestWithContext(ctx, req.Method, target+req.Path, nil)
	if err != nil {
		return nil, err
	}

	for k, v := range req.Headers {
		upstreamReq.Header.Set(k, v)
	}
	upstreamReq.Header.Set("Authorization", "Bearer "+token)
	upstreamReq.Header.Set("Host", "api.anthropic.com")

	if len(req.Body) > 0 {
		upstreamReq.Body = io.NopCloser(bytes.NewReader(req.Body))
		upstreamReq.ContentLength = int64(len(req.Body))
		upstreamReq.Header.Set("Content-Length", fmt.Sprintf("%d", len(req.Body)))
	}

	resp, err := c.httpClient.Do(upstreamReq)
	if err != nil {
		return nil, err
	}

	respHeaders := make(map[string]string, len(resp.Header))
	for k, v := range resp.Header {
		if len(v) > 0 {
			respHeaders[k] = v[0]
		}
	}

	return &application.ForwardResponse{
		StatusCode: resp.StatusCode,
		Headers:    respHeaders,
		Body:       resp.Body,
		IsStream:   resp.Header.Get("Content-Type") == "text/event-stream",
	}, nil
}
