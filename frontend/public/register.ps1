param(
    [Parameter(Mandatory=$true)][string]$ApiKey
)

$ProxyUrl = if ($env:PROXY_URL) { $env:PROXY_URL } else { "https://claude-proxy-backend.fly.dev" }
$Name     = if ($env:NAME)      { $env:NAME }      else { $env:COMPUTERNAME }

Write-Host "Reading Claude Code credentials..."

$credsPaths = @(
    "$env:APPDATA\Claude\.credentials.json",
    "$env:APPDATA\claude\.credentials.json",
    "$env:LOCALAPPDATA\Claude\.credentials.json"
)

$creds = $null
foreach ($p in $credsPaths) {
    if (Test-Path $p) {
        $creds = Get-Content $p -Raw | ConvertFrom-Json
        break
    }
}

if (-not $creds) {
    Write-Error "Could not find Claude Code credentials. Run 'claude login' first."
    exit 1
}

$accessToken  = $creds.claudeAiOauth.accessToken
$refreshToken = $creds.claudeAiOauth.refreshToken
$deviceId     = $creds.claudeAiOauth.device_id

if (-not $accessToken -or -not $refreshToken) {
    Write-Error "Could not extract tokens from credentials."
    exit 1
}

$settingsPaths = @(
    "$env:APPDATA\Claude\settings.json",
    "$env:APPDATA\claude\settings.json"
)

$accountUuid = "unknown"
foreach ($p in $settingsPaths) {
    if (Test-Path $p) {
        $s = Get-Content $p -Raw | ConvertFrom-Json
        if ($s.oauthAccount.accountUuid) {
            $accountUuid = $s.oauthAccount.accountUuid
            break
        }
    }
}

if (-not $deviceId) {
    $deviceId = (Get-WmiObject Win32_ComputerSystemProduct).UUID
}

Write-Host "Registering '$Name' at $ProxyUrl..."

$body = @{
    name          = $Name
    refresh_token = $refreshToken
    access_token  = $accessToken
    account_uuid  = $accountUuid
    device_id     = $deviceId
    billing       = "cc_version=2.1.150.474; cc_entrypoint=cli; cch=ad5c4;"
    cap           = 0
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "$ProxyUrl/user/me/providers" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{ "x-api-key" = $ApiKey } `
    -Body $body

Write-Host "Done:"
$response | ConvertTo-Json
