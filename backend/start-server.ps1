# Safe server start script
# This script checks if the server is already running before starting it

Write-Host "[CHECK] Checking if server is already running..." -ForegroundColor Cyan

# Check for existing Node.js processes
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "[WARNING] Found $($nodeProcesses.Count) Node.js process(es) already running!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options:" -ForegroundColor White
    Write-Host "  1. Kill all Node.js processes and start fresh" -ForegroundColor Green
    Write-Host "  2. Exit (server might already be running)" -ForegroundColor Red
    Write-Host ""
    
    $choice = Read-Host "Enter your choice (1 or 2)"
    
    if ($choice -eq "1") {
        Write-Host "[STOP] Stopping all Node.js processes..." -ForegroundColor Yellow
        Stop-Process -Name node -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "[OK] Processes stopped" -ForegroundColor Green
    } else {
        Write-Host "[EXIT] Exiting. Server may already be running on port 5050" -ForegroundColor Red
        exit 0
    }
}

# Check if port 5050 is in use
Write-Host "[CHECK] Checking port 5050..." -ForegroundColor Cyan
$portCheck = netstat -ano | findstr ":5050"

if ($portCheck) {
    Write-Host "[WARNING] Port 5050 is in use. Waiting for it to clear..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}

# Start the server
Write-Host ""
Write-Host "[START] Starting backend server..." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Gray
Write-Host ""

npm run dev
