# Backend Quick Start Guide

## ✅ Scripts Are Now Fixed!

All PowerShell scripts have been fixed and are ready to use.

---

## 🚀 How to Run Your Backend

### Option 1: Check Status First (Recommended)

```powershell
.\check-server.ps1
```

**Output will show:**
- `[OK] Server is responding!` → Server is already running ✅
- `[ERROR] Server is not responding` → Server needs to be started

---

### Option 2: Start the Server

```powershell
.\start-server.ps1
```

**What it does:**
- Checks if server is already running
- Prompts you to kill existing processes if found
- Starts the server safely

**If it finds existing processes:**
- Choose `1` to kill them and start fresh
- Choose `2` to exit (if server is already running fine)

---

### Option 3: Stop the Server

```powershell
.\stop-server.ps1
```

**What it does:**
- Stops all Node.js processes
- Verifies port 5050 is freed
- Shows confirmation

---

## 📋 Current Status

Your backend is **RUNNING** right now:
- ✅ 3 Node.js processes (normal)
- ✅ Port 5050 listening
- ✅ Health check: OK

**You don't need to start it - it's already working!**

---

## 🎯 Daily Workflow

### Morning:
```powershell
cd backend
.\check-server.ps1
```

If not running:
```powershell
.\start-server.ps1
```

### During Development:
- Edit your code
- Save files
- Nodemon auto-restarts
- **Don't touch the terminal!**

### Evening:
```powershell
.\stop-server.ps1
```

---

## 🆘 Troubleshooting

### "EADDRINUSE" Error

```powershell
.\stop-server.ps1
Start-Sleep -Seconds 3
.\start-server.ps1
```

### Scripts Not Working

Make sure you're in the backend directory:
```powershell
cd "D:\ssinphinite\Main Project\newwwwww\ERP2\ERP2\ERP\backend"
```

### Permission Errors

Run PowerShell as Administrator or set execution policy:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 💡 Pro Tips

1. **Always check before starting**
   ```powershell
   .\check-server.ps1
   ```

2. **Let nodemon handle restarts**
   - Save your file → nodemon restarts automatically
   - You'll see: `[nodemon] restarting due to changes...`

3. **One server instance only**
   - Don't run `npm run dev` multiple times
   - Use `.\start-server.ps1` instead

---

## 📝 Script Output Explained

### check-server.ps1
- `[OK]` = Everything is working
- `[NONE]` = No processes found
- `[FREE]` = Port is available
- `[ERROR]` = Server not responding

### start-server.ps1
- `[CHECK]` = Checking status
- `[WARNING]` = Found existing processes
- `[START]` = Starting server

### stop-server.ps1
- `[STOP]` = Stopping processes
- `[INFO]` = Informational message
- `[OK]` = Success

---

## ✅ Summary

**Right Now:**
- ✅ Backend is running
- ✅ Scripts are fixed
- ✅ Ready to develop

**Commands:**
- Check: `.\check-server.ps1`
- Start: `.\start-server.ps1`
- Stop: `.\stop-server.ps1`

**That's it!** Happy coding! 🎉
