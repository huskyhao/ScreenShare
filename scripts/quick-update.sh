#!/bin/bash

# Quick ScreenShare Server Update Script
# Simple version for fast updates

echo "🔄 Quick update starting..."

# Backup config
[ -f config/server.json ] && cp config/server.json config/server.json.bak

# Stop service
pm2 stop screenshare-signaling 2>/dev/null || echo "Service not running"

# Update code
git pull origin master

# Install dependencies
npm install

# Restore config
[ -f config/server.json.bak ] && cp config/server.json.bak config/server.json

# Start service
pm2 start src/server.js --name "screenshare-signaling"

# Check status
pm2 status screenshare-signaling

echo "✅ Update complete!"
echo "Check logs: pm2 logs screenshare-signaling"
