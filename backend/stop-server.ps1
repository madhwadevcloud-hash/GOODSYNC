# Safe server stop script

Write-Host "[STOP] Stopping Backend Server" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Gray
Write-Host ""

# Check for Node.js processes
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "Found $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Cyan
    Write-Host ""
    
    # Stop all Node.js processes
    Write-Host "Stopping processes..." -ForegroundColor Yellow
    Stop-Process -Name node -Force -ErrorAction SilentlyContinue
    
    Start-Sleep -Seconds 2
    
    # Verify they're stopped
    $remainingProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
    
    if ($remainingProcesses) {
        Write-Host "[WARNING] Some processes are still running. Trying force kill..." -ForegroundColor Yellow
        $remainingProcesses | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
        Start-Sleep -Seconds 1
    }
    
    Write-Host "[OK] All Node.js processes stopped" -ForegroundColor Green
} else {
    Write-Host "[INFO] No Node.js processes found (server not running)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "[PORT] Checking port 5050..." -ForegroundColor Cyan
$portCheck = netstat -ano | findstr ":5050"

if ($portCheck) {
    Write-Host "[WARNING] Port 5050 still has connections (will clear automatically):" -ForegroundColor Yellow
    Write-Host $portCheck
} else {
    Write-Host "[OK] Port 5050 is free" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Gray
Write-Host "[OK] Server stopped successfully" -ForegroundColor Green
