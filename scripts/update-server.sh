#!/bin/bash

# ScreenShare Server Update Script
# This script safely updates the server with new code while preserving configuration

set -e  # Exit on any error

echo "🚀 Starting ScreenShare server update..."

# Configuration
PROJECT_DIR="$(pwd)"  # Use current directory
SERVICE_NAME="screenshare-signaling"
BACKUP_DIR="$PROJECT_DIR/backups/$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    print_error "Not in ScreenShare project directory. Please cd to the project root."
    exit 1
fi

# Create backup directory
print_status "Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Backup current configuration
if [ -f "config/server.json" ]; then
    print_status "Backing up server configuration..."
    cp config/server.json "$BACKUP_DIR/server.json"
    print_status "Configuration backed up to: $BACKUP_DIR/server.json"
else
    print_warning "No server.json found to backup"
fi

# Stop the service
print_status "Stopping service: $SERVICE_NAME"
if command -v pm2 &> /dev/null; then
    pm2 stop "$SERVICE_NAME" 2>/dev/null || print_warning "Service was not running"
else
    print_warning "PM2 not found, please manually stop any running node processes"
fi

# Pull latest changes
print_status "Pulling latest changes from GitHub..."
git fetch origin
git pull origin master

# Show what changed
print_status "Recent changes:"
git log --oneline -5

# Install/update dependencies
print_status "Installing/updating dependencies..."
npm install

# Restore configuration if it was removed
if [ ! -f "config/server.json" ] && [ -f "$BACKUP_DIR/server.json" ]; then
    print_status "Restoring server configuration..."
    cp "$BACKUP_DIR/server.json" config/server.json
elif [ ! -f "config/server.json" ] && [ -f "config/server.example.json" ]; then
    print_warning "No server.json found. Please copy from example and configure:"
    print_warning "cp config/server.example.json config/server.json"
    print_warning "Then edit config/server.json with your server details"
fi

# Start the service
print_status "Starting service: $SERVICE_NAME"
if command -v pm2 &> /dev/null; then
    pm2 start src/server.js --name "$SERVICE_NAME"
    pm2 save
else
    print_warning "PM2 not found. Starting with nohup..."
    nohup node src/server.js > server.log 2>&1 &
    echo $! > server.pid
fi

# Verify service is running
sleep 3
print_status "Verifying service status..."

if command -v pm2 &> /dev/null; then
    pm2 status "$SERVICE_NAME"
else
    if [ -f "server.pid" ]; then
        PID=$(cat server.pid)
        if ps -p $PID > /dev/null; then
            print_status "Service is running with PID: $PID"
        else
            print_error "Service failed to start"
            exit 1
        fi
    fi
fi

# Test the service
print_status "Testing service response..."
if curl -s http://localhost:3000/config > /dev/null; then
    print_status "✅ Service is responding correctly"
else
    print_error "❌ Service is not responding"
    exit 1
fi

print_status "🎉 Update completed successfully!"
print_status "Backup location: $BACKUP_DIR"
print_status "Service logs: pm2 logs $SERVICE_NAME"

echo ""
print_status "Next steps:"
echo "1. Check service logs: pm2 logs $SERVICE_NAME"
echo "2. Test the application from a client"
echo "3. Monitor for any issues"
