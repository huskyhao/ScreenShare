#!/bin/bash

# ScreenShare CI/CD Setup Script
# This script helps set up the CI/CD environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if running as root
check_root() {
    if [ "$EUID" -eq 0 ]; then
        error "Please do not run this script as root"
        exit 1
    fi
}

# Install Node.js and npm
install_nodejs() {
    log "Checking Node.js installation..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 18 ]; then
            log "Node.js $(node --version) is already installed"
            return
        else
            warn "Node.js version is too old. Installing newer version..."
        fi
    fi
    
    log "Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    log "Node.js $(node --version) installed successfully"
}

# Install PM2
install_pm2() {
    log "Checking PM2 installation..."
    
    if command -v pm2 &> /dev/null; then
        log "PM2 is already installed"
        return
    fi
    
    log "Installing PM2..."
    sudo npm install -g pm2
    
    log "PM2 installed successfully"
}

# Install Docker
install_docker() {
    log "Checking Docker installation..."
    
    if command -v docker &> /dev/null; then
        log "Docker is already installed"
        return
    fi
    
    log "Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    
    log "Docker installed successfully"
    warn "Please log out and log back in for Docker group changes to take effect"
}

# Setup project
setup_project() {
    log "Setting up project..."
    
    # Install dependencies
    log "Installing project dependencies..."
    npm install
    
    # Setup configuration
    if [ ! -f "config/server.json" ]; then
        log "Creating server configuration..."
        cp config/server.example.json config/server.json
        warn "Please edit config/server.json with your server details"
    fi
    
    # Create directories
    mkdir -p logs backups
    
    # Make scripts executable
    chmod +x scripts/*.sh
    
    log "Project setup completed"
}

# Generate SSH key for CI/CD
generate_ssh_key() {
    log "Generating SSH key for CI/CD..."
    
    SSH_KEY_PATH="$HOME/.ssh/screenshare_cicd"
    
    if [ -f "$SSH_KEY_PATH" ]; then
        warn "SSH key already exists at $SSH_KEY_PATH"
        return
    fi
    
    ssh-keygen -t rsa -b 4096 -C "cicd@screenshare" -f "$SSH_KEY_PATH" -N ""
    
    log "SSH key generated at $SSH_KEY_PATH"
    info "Public key content (add this to your server's authorized_keys):"
    echo "----------------------------------------"
    cat "$SSH_KEY_PATH.pub"
    echo "----------------------------------------"
    info "Private key content (add this to GitHub Secrets as SSH_PRIVATE_KEY):"
    echo "----------------------------------------"
    cat "$SSH_KEY_PATH"
    echo "----------------------------------------"
}

# Setup PM2 startup
setup_pm2_startup() {
    log "Setting up PM2 startup..."
    
    pm2 startup | grep -E '^sudo' | bash || true
    
    log "PM2 startup configured"
}

# Test deployment
test_deployment() {
    log "Testing deployment..."
    
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
        return 1
    fi
    
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
    
    # Test PM2 deployment
    log "Testing PM2 deployment..."
    pm2 start src/server.js --name screenshare-signaling-test
    sleep 3
    
    if pm2 status screenshare-signaling-test | grep -q "online"; then
        log "✅ PM2 deployment test passed"
        pm2 delete screenshare-signaling-test
    else
        error "❌ PM2 deployment test failed"
        pm2 delete screenshare-signaling-test 2>/dev/null || true
        return 1
    fi
    
    log "All tests passed!"
}

# Main setup function
main() {
    log "🚀 Starting ScreenShare CI/CD setup..."
    
    check_root
    
    # Update system
    log "Updating system packages..."
    sudo apt-get update
    
    # Install components
    install_nodejs
    install_pm2
    install_docker
    
    # Setup project
    setup_project
    
    # Generate SSH key
    read -p "Generate SSH key for CI/CD? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        generate_ssh_key
    fi
    
    # Setup PM2 startup
    setup_pm2_startup
    
    # Test deployment
    read -p "Run deployment tests? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        test_deployment
    fi
    
    log "🎉 CI/CD setup completed successfully!"
    
    info "Next steps:"
    info "1. Edit config/server.json with your server details"
    info "2. Add SSH keys to your server and GitHub Secrets"
    info "3. Configure GitHub Secrets in your repository"
    info "4. Test the deployment with: npm run deploy"
    info "5. Read docs/CI-CD-SETUP.md for detailed instructions"
}

# Run main function
main "$@"
