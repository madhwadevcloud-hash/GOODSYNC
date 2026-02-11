# Quick server status check script

Write-Host "[CHECK] Backend Server Status Check" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Gray
Write-Host ""

# Check Node.js processes
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "[OK] Node.js processes running: $($nodeProcesses.Count)" -ForegroundColor Green
    $nodeProcesses | Select-Object Id, @{Name='Memory(MB)';Expression={[math]::Round($_.WorkingSet64/1MB,2)}} | Format-Table
} else {
    Write-Host "[NONE] No Node.js processes found" -ForegroundColor Red
}

# Check port 5050
Write-Host "[PORT] Port 5050 status:" -ForegroundColor Cyan
$portCheck = netstat -ano | findstr ":5050"
if ($portCheck) {
    Write-Host "[OK] Port 5050 is in use" -ForegroundColor Green
    Write-Host $portCheck
} else {
    Write-Host "[FREE] Port 5050 is free (server not running)" -ForegroundColor Red
}

Write-Host ""

# Try to hit the health endpoint
Write-Host "[HEALTH] Testing health endpoint..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri http://localhost:5050/api/health -Method Get -TimeoutSec 3
    Write-Host "[OK] Server is responding!" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor White
    Write-Host "   Timestamp: $($response.timestamp)" -ForegroundColor White
} catch {
    Write-Host "[ERROR] Server is not responding" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Gray
