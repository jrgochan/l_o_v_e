# Chat WebSocket Troubleshooting Guide

## ✅ Diagnostic Results

### Database
- ✅ `chat_sessions` table exists
- ✅ `chat_messages` table exists

### Observer Service
- ✅ Running on http://localhost:8000
- ✅ WebSocket endpoint responding at `/observer/ws/chat/{session_id}`
- ✅ Route is registered (tested with curl)

### Issue Identified
**Browser Error:** "WebSocket connection failed: Insufficient resources"

**Root Cause:** This typically means:
1. Too many rapid connection attempts (connection loop)
2. WebSocket endpoint responding but not properly accepting connections
3. CORS or security headers blocking WebSocket upgrade

## 🔧 Potential Fixes

### Fix 1: Verify CORS Settings for WebSocket
FastAPI CORS middleware might need WebSocket-specific configuration.

### Fix 2: Check WebSocket Handshake
The endpoint might be rejecting the connection during the handshake phase.

### Fix 3: Add Debugging
Add logging to the WebSocket endpoint to see what's happening.

### Fix 4: Test with Simple WebSocket Client
Use `websocat` or browser console to test:
```javascript
const ws = new WebSocket('ws://localhost:8000/observer/ws/chat/test-123');
ws.onopen = () => console.log('Connected!');
ws.onerror = (e) => console.error('Error:', e);
ws.onmessage = (e) => console.log('Message:', e.data);
```

## 🎯 Recommended Actions

1. **Add WebSocket logging** to chat_websocket.py
2. **Test with browser console** WebSocket directly
3. **Check Observer terminal** for WebSocket-specific errors
4. **Verify AsyncSessionLocal** import in WebSocket route
5. **Check if database.py** properly exports AsyncSessionLocal

## 📝 Quick Test

Run this in browser console:
```javascript
const ws = new WebSocket('ws://localhost:8000/observer/ws/chat/test-session');
ws.onopen = () => console.log('✅ WebSocket Connected!');
ws.onerror = (e) => console.error('❌ WebSocket Error:', e);
ws.onclose = (e) => console.log('WebSocket Closed:', e.code, e.reason);
```

If this works, the issue is in the React hook's connection logic.
If this fails, the issue is in the Observer WebSocket implementation.
