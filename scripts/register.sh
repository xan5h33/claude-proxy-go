#!/bin/bash
set -e

PROXY_URL="${PROXY_URL:-http://localhost:8080}"
NAME="${NAME:-$(hostname)}"

echo "Reading credentials from keychain..."

CREDS=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null)
if [ -z "$CREDS" ]; then
  echo "Error: Claude Code credentials not found in keychain. Run 'claude login' first."
  exit 1
fi

ACCESS_TOKEN=$(echo "$CREDS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['claudeAiOauth']['accessToken'])")
REFRESH_TOKEN=$(echo "$CREDS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['claudeAiOauth']['refreshToken'])")

if [ -z "$ACCESS_TOKEN" ] || [ -z "$REFRESH_TOKEN" ]; then
  echo "Error: Could not extract tokens from keychain"
  exit 1
fi

echo "Reading Claude Code config..."

CONFIG_FILE="$HOME/.claude/.credentials.json"
if [ ! -f "$CONFIG_FILE" ]; then
  CONFIG_FILE="$HOME/.claude/credentials.json"
fi

ACCOUNT_UUID=$(python3 -c "
import json, os
cfg = '$HOME/.claude/settings.json'
try:
    with open(cfg) as f:
        d = json.load(f)
    print(d.get('oauthAccount', {}).get('accountUuid', ''))
except:
    print('')
")

DEVICE_ID=$(python3 -c "
import subprocess, json
try:
    out = subprocess.check_output(['security', 'find-generic-password', '-s', 'Claude Code-credentials', '-w'], stderr=subprocess.DEVNULL)
    d = json.loads(out)
    print(d.get('claudeAiOauth', {}).get('device_id', ''))
except:
    print('')
")

if [ -z "$ACCOUNT_UUID" ]; then
  echo "Warning: Could not read account UUID from config, using placeholder"
  ACCOUNT_UUID="unknown"
fi

BILLING="cc_version=2.1.150.474; cc_entrypoint=cli; cch=ad5c4;"

echo "Registering provider '$NAME' at $PROXY_URL..."

RESPONSE=$(curl -sf -X POST "$PROXY_URL/admin/providers" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$NAME\",
    \"refresh_token\": \"$REFRESH_TOKEN\",
    \"access_token\": \"$ACCESS_TOKEN\",
    \"account_uuid\": \"$ACCOUNT_UUID\",
    \"device_id\": \"$(system_profiler SPHardwareDataType 2>/dev/null | awk '/UUID/ {print $3}' || echo 'unknown')\",
    \"billing\": \"$BILLING\",
    \"cap\": 0,
    \"window_seconds\": 3600
  }")

echo "Registered:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
