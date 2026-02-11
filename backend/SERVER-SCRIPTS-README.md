# Backend Server Management Scripts

These PowerShell scripts help you safely manage the backend server and avoid port conflicts.

## 📋 Available Scripts

### 1. **check-server.ps1** - Check Server Status
Quickly check if the backend server is running and responding.

```powershell
.\check-server.ps1
```

**What it does:**
- ✅ Lists running Node.js processes
- ✅ Checks if port 5050 is in use
- ✅ Tests the health endpoint
- ✅ Shows server status and timestamp

---

### 2. **start-server.ps1** - Safe Server Start
Safely start the server with automatic conflict detection.

```powershell
.\start-server.ps1
```

**What it does:**
- ✅ Checks if server is already running
- ✅ Prompts to kill existing processes if found
- ✅ Waits for port to clear
- ✅ Starts the server with `npm run dev`

**Use this instead of `npm run dev` to avoid port conflicts!**

---

### 3. **stop-server.ps1** - Safe Server Stop
Safely stop all Node.js processes.

```powershell
.\stop-server.ps1
```

**What it does:**
- ✅ Finds all Node.js processes
- ✅ Stops them gracefully
- ✅ Force kills if necessary
- ✅ Verifies port 5050 is freed

---

## 🚨 Common Issues

### "EADDRINUSE: address already in use :::5050"

**Problem:** Multiple server instances are trying to use port 5050.

**Solution:**
1. Run `.\stop-server.ps1` to kill all Node.js processes
2. Wait 3-5 seconds for connections to clear
3. Run `.\start-server.ps1` to start fresh

### Multiple Node.js Processes

**Problem:** You accidentally started the server multiple times.

**Solution:**
```powershell
# Quick fix
.\stop-server.ps1
Start-Sleep -Seconds 3
.\start-server.ps1
```

---

## 💡 Best Practices

1. **Always check before starting:**
   ```powershell
   .\check-server.ps1
   ```

2. **Use the safe start script:**
   ```powershell
   .\start-server.ps1
   ```
   Instead of directly running `npm run dev`

3. **Stop cleanly when done:**
   ```powershell
   .\stop-server.ps1
   ```

4. **If nodemon crashes:**
   - Press `Ctrl+C` to stop nodemon
   - Run `.\stop-server.ps1` to ensure all processes are killed
   - Run `.\start-server.ps1` to restart

---

## 🔧 Manual Commands (if scripts don't work)

### Check running Node.js processes:
```powershell
Get-Process -Name node
```

### Kill all Node.js processes:
```powershell
Stop-Process -Name node -Force
```

### Check port 5050:
```powershell
netstat -ano | findstr :5050
```

### Test health endpoint:
```powershell
Invoke-RestMethod -Uri http://localhost:5050/api/health
```

---

## 📝 Notes

- **Nodemon** automatically restarts the server when files change
- **TIME_WAIT** connections are normal and will clear automatically (30-120 seconds)
- The server uses **3 Node.js processes** normally (nodemon parent + 2 children)
- Default port is **5050** (configured in `server.js`)

---

## 🐛 Troubleshooting

### Server won't start even after stopping processes

```powershell
# Wait longer for port to clear
Start-Sleep -Seconds 10

# Check what's using the port
netstat -ano | findstr :5050

# If a specific PID is blocking, kill it
Stop-Process -Id <PID> -Force
```

### Mongoose duplicate index warning

This warning is **not critical**. It means the email field has redundant index definitions. The server will still work fine.

To fix it, find the User schema and ensure email index is defined only once:
```javascript
// Either use this:
email: { type: String, index: true }

// OR this (not both):
email: { type: String }
schema.index({ email: 1 });
```

---

**Created:** 2025-11-08  
**Last Updated:** 2025-11-08
