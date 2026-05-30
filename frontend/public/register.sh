#!/bin/bash
set -e

API_KEY="${1:-$API_KEY}"
PROXY_URL="${PROXY_URL:-https://claude-proxy-backend.fly.dev}"
NAME="${NAME:-$(hostname)}"

if [ -z "$API_KEY" ]; then
  echo "Usage: ./register.sh <api_key>"
  exit 1
fi

OS=$(uname -s)

echo "Reading Claude Code credentials..."

if [ "$OS" = "Darwin" ]; then
  CREDS=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null)
elif [ "$OS" = "Linux" ]; then
  for f in \
    "$HOME/.claude/.credentials.json" \
    "$HOME/.config/claude/.credentials.json" \
    "$HOME/.config/Claude/.credentials.json"; do
    if [ -f "$f" ]; then
      CREDS=$(cat "$f")
      break
    fi
  done
  if [ -z "$CREDS" ] && command -v secret-tool &>/dev/null; then
    CREDS=$(secret-tool lookup service "Claude Code-credentials" 2>/dev/null || true)
  fi
fi

if [ -z "$CREDS" ]; then
  echo "Error: Could not find Claude Code credentials. Run 'claude login' first."
  exit 1
fi

ACCESS_TOKEN=$(echo "$CREDS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['claudeAiOauth']['accessToken'])")
REFRESH_TOKEN=$(echo "$CREDS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['claudeAiOauth']['refreshToken'])")
DEVICE_ID=$(echo "$CREDS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['claudeAiOauth'].get('device_id',''))" 2>/dev/null || true)

if [ -z "$ACCESS_TOKEN" ] || [ -z "$REFRESH_TOKEN" ]; then
  echo "Error: Could not extract tokens from credentials"
  exit 1
fi

ACCOUNT_UUID=$(python3 -c "
import json, os
for p in [os.path.expanduser('~/.claude/settings.json'), os.path.expanduser('~/.config/claude/settings.json')]:
    try:
        with open(p) as f:
            d = json.load(f)
        v = d.get('oauthAccount', {}).get('accountUuid', '')
        if v:
            print(v)
            break
    except:
        pass
" 2>/dev/null || echo "unknown")

if [ -z "$DEVICE_ID" ]; then
  if [ "$OS" = "Darwin" ]; then
    DEVICE_ID=$(system_profiler SPHardwareDataType 2>/dev/null | awk '/UUID/ {print $3}' || echo "unknown")
  else
    DEVICE_ID=$(cat /etc/machine-id 2>/dev/null || cat /proc/sys/kernel/random/boot_id 2>/dev/null || echo "unknown")
  fi
fi

echo "Registering '$NAME' at $PROXY_URL..."

RESPONSE=$(curl -sf -X POST "$PROXY_URL/user/me/providers" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{
    \"name\": \"$NAME\",
    \"refresh_token\": \"$REFRESH_TOKEN\",
    \"access_token\": \"$ACCESS_TOKEN\",
    \"account_uuid\": \"$ACCOUNT_UUID\",
    \"device_id\": \"$DEVICE_ID\",
    \"billing\": \"cc_version=2.1.150.474; cc_entrypoint=cli; cch=ad5c4;\",
    \"cap\": 0
  }")

echo "Done:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
