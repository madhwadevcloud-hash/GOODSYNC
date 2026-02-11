# ⚠️ CRITICAL: STOP RUNNING `npm run dev` MULTIPLE TIMES!

## 🔴 What You Keep Doing Wrong

```
YOU:  npm run dev     ← First time (CORRECT)
      ✅ Server starts on port 5050

YOU:  npm run dev     ← Second time (WRONG!)
      ❌ ERROR: Port 5050 already in use!
      
YOU:  npm run dev     ← Third time (STILL WRONG!)
      ❌ ERROR: Port 5050 already in use!
```

## 🎯 The Problem Explained

When you run `npm run dev`:
1. **Nodemon starts** (Process 1)
2. **Node.js server starts** (Process 2)
3. **Server binds to port 5050** ✅

If you run it AGAIN while the first one is still running:
1. **Another Nodemon starts** (Process 3)
2. **Another Node.js server tries to start** (Process 4)
3. **Tries to bind to port 5050** ❌ **ALREADY TAKEN!**
4. **CRASH: EADDRINUSE error**

## ✅ What You SHOULD Do

### Before Starting the Server:

```powershell
# Step 1: Check if it's already running
.\check-server.ps1
```

If it says "Server is responding" → **DON'T START IT AGAIN!**

### To Start the Server:

```powershell
# Use the safe start script
.\start-server.ps1
```

This script will:
- ✅ Check if server is already running
- ✅ Ask if you want to kill existing processes
- ✅ Start the server safely

### To Stop the Server:

```powershell
# Stop all Node.js processes
.\stop-server.ps1
```

## 🚫 NEVER Do This:

```powershell
# ❌ DON'T run npm run dev directly
npm run dev

# ❌ DON'T run it multiple times
npm run dev
npm run dev  # This causes the error!
npm run dev  # Stop doing this!
```

## 📊 How to Check Server Status

```powershell
# Quick check
.\check-server.ps1

# Or manually check processes
Get-Process -Name node

# Check port 5050
netstat -ano | findstr :5050

# Test health endpoint
Invoke-RestMethod -Uri http://localhost:5050/api/health
```

## 🔧 Quick Fix When You Get EADDRINUSE Error

```powershell
# 1. Stop everything
.\stop-server.ps1

# 2. Wait a few seconds
Start-Sleep -Seconds 3

# 3. Start fresh
.\start-server.ps1
```

## 📝 Current Status (as of now)

✅ **Server is RUNNING**
- Port: 5050
- Status: OK
- Processes: 3 (normal)

**DO NOT START IT AGAIN!**

## 🎓 Understanding the Error

```
Error: listen EADDRINUSE: address already in use :::5050
```

This means:
- **EADDRINUSE** = Error: Address Already In Use
- **:::5050** = Port 5050 is already bound to another process
- **Solution** = Stop the existing process first!

## 💡 Pro Tips

1. **One terminal, one server**
   - Open ONE terminal for the backend
   - Start the server ONCE
   - Leave it running

2. **Nodemon auto-restarts**
   - When you save a file, nodemon automatically restarts
   - You DON'T need to manually restart
   - Just save your code and nodemon handles it

3. **Check before starting**
   - Always run `.\check-server.ps1` first
   - If it's running, don't start it again

4. **Use the helper scripts**
   - They prevent these issues
   - They're designed to be safe

## 🆘 Emergency Commands

If nothing works:

```powershell
# Nuclear option: Kill everything
Stop-Process -Name node -Force

# Wait for port to clear
Start-Sleep -Seconds 5

# Start fresh
npm run dev
```

---

## 📖 Summary

**THE RULE:**
- ✅ Start the server **ONCE**
- ✅ Let nodemon handle restarts
- ✅ Use helper scripts
- ❌ **NEVER** run `npm run dev` multiple times

**REMEMBER:**
If you see "Server is responding" → **IT'S ALREADY RUNNING!**

---

**Please read this file before starting the server again!**
