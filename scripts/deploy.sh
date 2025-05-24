#!/bin/bash

# ScreenShare CI/CD Deployment Script
# This script handles automated deployment with proper error handling and rollback

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="screenshare-signaling"
BACKUP_DIR="$PROJECT_DIR/backups/$(date +%Y%m%d_%H%M%S)"
LOG_FILE="$PROJECT_DIR/logs/deploy.log"

# Environment variables (can be set by CI/CD)
ENVIRONMENT="${ENVIRONMENT:-production}"
SKIP_BACKUP="${SKIP_BACKUP:-false}"
SKIP_TESTS="${SKIP_TESTS:-false}"
FORCE_RESTART="${FORCE_RESTART:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

log "🚀 Starting ScreenShare deployment to $ENVIRONMENT environment..."

# Pre-deployment checks
check_prerequisites() {
    log "🔍 Checking prerequisites..."
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -d "src" ]; then
        error "Not in ScreenShare project directory. Please cd to the project root."
        exit 1
    fi
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 14 ]; then
        error "Node.js version 14+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        warn "PM2 not found. Installing PM2..."
        npm install -g pm2
    fi
    
    log "✅ Prerequisites check passed"
}

# Create backup
create_backup() {
    if [ "$SKIP_BACKUP" = "true" ]; then
        warn "Skipping backup as requested"
        return
    fi
    
    log "📦 Creating backup..."
    mkdir -p "$BACKUP_DIR"
    
    # Backup configuration
    if [ -f "config/server.json" ]; then
        cp config/server.json "$BACKUP_DIR/server.json"
        log "Configuration backed up to: $BACKUP_DIR/server.json"
    else
        warn "No server.json found to backup"
    fi
    
    # Backup current state
    git rev-parse HEAD > "$BACKUP_DIR/commit.txt" 2>/dev/null || echo "unknown" > "$BACKUP_DIR/commit.txt"
    
    log "✅ Backup created at: $BACKUP_DIR"
}

# Run tests
run_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        warn "Skipping tests as requested"
        return
    fi
    
    log "🧪 Running pre-deployment tests..."
    
    # Install dependencies
    npm ci --production
    
    # Test server startup
    log "Testing server startup..."
    timeout 10s npm run server &
    SERVER_PID=$!
    sleep 5
    
    if curl -f http://localhost:3000/config > /dev/null 2>&1; then
        log "✅ Server startup test passed"
    else
        error "❌ Server startup test failed"
        kill $SERVER_PID 2>/dev/null || true
        exit 1
    fi
    
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
}

# Deploy application
deploy_application() {
    log "🚀 Deploying application..."
    
    # Stop the service
    log "Stopping service: $SERVICE_NAME"
    if pm2 stop "$SERVICE_NAME" 2>/dev/null; then
        log "Service stopped successfully"
    else
        warn "Service was not running"
    fi
    
    # Pull latest changes (if in git repository)
    if [ -d ".git" ]; then
        log "Pulling latest changes from repository..."
        git fetch origin
        git pull origin master
        
        # Show what changed
        log "Recent changes:"
        git log --oneline -5 | tee -a "$LOG_FILE"
    fi
    
    # Install/update dependencies
    log "Installing/updating dependencies..."
    npm ci --production
    
    # Restore configuration if needed
    if [ ! -f "config/server.json" ] && [ -f "$BACKUP_DIR/server.json" ]; then
        log "Restoring server configuration..."
        cp "$BACKUP_DIR/server.json" config/server.json
    elif [ ! -f "config/server.json" ] && [ -f "config/server.example.json" ]; then
        warn "No server.json found. Using example configuration."
        warn "Please edit config/server.json with your server details"
        cp config/server.example.json config/server.json
    fi
    
    # Start the service
    log "Starting service: $SERVICE_NAME"
    if pm2 start src/server.js --name "$SERVICE_NAME"; then
        pm2 save
        log "✅ Service started successfully"
    else
        error "❌ Failed to start service"
        exit 1
    fi
}

# Verify deployment
verify_deployment() {
    log "🔍 Verifying deployment..."
    
    sleep 5
    
    # Check PM2 status
    if pm2 status "$SERVICE_NAME" | grep -q "online"; then
        log "✅ PM2 service is online"
    else
        error "❌ PM2 service is not online"
        pm2 logs "$SERVICE_NAME" --lines 10
        exit 1
    fi
    
    # Test HTTP endpoint
    if curl -f http://localhost:3000/config > /dev/null 2>&1; then
        log "✅ Service is responding correctly"
    else
        error "❌ Service is not responding"
        pm2 logs "$SERVICE_NAME" --lines 10
        exit 1
    fi
    
    log "✅ Deployment verification successful"
}

# Rollback function
rollback() {
    error "🔄 Rolling back deployment..."
    
    if [ -f "$BACKUP_DIR/server.json" ]; then
        cp "$BACKUP_DIR/server.json" config/server.json
        log "Configuration restored from backup"
    fi
    
    if [ -f "$BACKUP_DIR/commit.txt" ]; then
        BACKUP_COMMIT=$(cat "$BACKUP_DIR/commit.txt")
        if [ "$BACKUP_COMMIT" != "unknown" ] && [ -d ".git" ]; then
            git reset --hard "$BACKUP_COMMIT"
            log "Code restored to commit: $BACKUP_COMMIT"
        fi
    fi
    
    pm2 restart "$SERVICE_NAME" 2>/dev/null || pm2 start src/server.js --name "$SERVICE_NAME"
    pm2 save
    
    error "❌ Rollback completed"
    exit 1
}

# Cleanup function
cleanup() {
    log "🧹 Cleaning up..."
    
    # Remove old backups (keep last 5)
    if [ -d "$PROJECT_DIR/backups" ]; then
        cd "$PROJECT_DIR/backups"
        ls -t | tail -n +6 | xargs -r rm -rf
        log "Old backups cleaned up"
    fi
}

# Main deployment flow
main() {
    # Set trap for rollback on error
    trap rollback ERR
    
    check_prerequisites
    create_backup
    run_tests
    deploy_application
    verify_deployment
    cleanup
    
    log "🎉 Deployment completed successfully!"
    log "Backup location: $BACKUP_DIR"
    log "Service logs: pm2 logs $SERVICE_NAME"
    
    info "Next steps:"
    info "1. Check service logs: pm2 logs $SERVICE_NAME"
    info "2. Test the application from a client"
    info "3. Monitor for any issues"
}

# Run main function
main "$@"
