$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Import-DotEnv([string]$path) {
  if (-not (Test-Path $path)) { return }
  Write-Host "Loading env from $path"
  Get-Content $path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line) { return }
    if ($line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $name = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    if ($value.StartsWith('\"') -and $value.EndsWith('\"')) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    if ($name) { [System.Environment]::SetEnvironmentVariable($name, $value, 'Process') }
  }
}

# Load repo-root .env if present (DO NOT COMMIT real keys)
Import-DotEnv "$root\.env"

if (-not (Test-Path ".\\.venv")) {
  python -m venv .venv
}

Write-Host "Activating venv + installing deps (first run may take a bit)..."
. .\.venv\Scripts\Activate.ps1

$env:PYO3_USE_ABI3_FORWARD_COMPATIBILITY = "1"

python -m pip install -U pip
pip install -r requirements.txt

Write-Host "Starting services..."

# NOTE: child processes inherit environment variables set above.
# Do NOT call Import-DotEnv inside spawned shells (they don't know the function).
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root'; . .\.venv\Scripts\Activate.ps1; uvicorn services.ai_service.main:app --port 8001"
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root'; . .\.venv\Scripts\Activate.ps1; uvicorn services.data_service.main:app --port 8002"
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root'; . .\.venv\Scripts\Activate.ps1; uvicorn services.alerts_service.main:app --port 8003"
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root'; . .\.venv\Scripts\Activate.ps1; uvicorn services.scheduler_service.main:app --port 8004"
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root'; . .\.venv\Scripts\Activate.ps1; uvicorn gateway.main:app --port 8010"

Write-Host ""
Write-Host "Gateway:  http://127.0.0.1:8010/health"
Write-Host "AI:       http://127.0.0.1:8001/health"
Write-Host "Data:     http://127.0.0.1:8002/health"
Write-Host "Alerts:   http://127.0.0.1:8003/health"
Write-Host "Scheduler http://127.0.0.1:8004/health"
Write-Host ""
Write-Host "Frontend should use VITE_API_BASE=http://127.0.0.1:8010"

