# ScreenShare

A lightweight screen sharing application that allows users to share high-quality game footage and system audio with friends.

## Features

- **High-Quality Screen Capture**: Powered by OBS for professional-grade capture
- **P2P Direct Connection**: Low-latency streaming directly to viewers
- **Customizable Quality**: Adjust resolution (up to 1080p+) and frame rate (up to 60fps)
- **Audio Sharing**: Stream system audio and optional microphone input
- **Browser Viewing**: Recipients can watch the stream in any modern browser

## Development Status

This project is currently in early development. Below is the roadmap:

1. ✅ Project initialization
2. ✅ Basic screen capture and local preview
3. ✅ P2P connection implementation
4. ✅ Video quality control
5. ✅ Audio sharing
6. ✅ UI optimization and user experience improvements

## Current Version

**v0.8.0** - Latest release with comprehensive CI/CD pipeline and Docker support. Fixed CI/CD Docker build issues by adding package-lock.json and updating npm ci command.

For detailed version history and changelog, see [CHANGELOG.md](CHANGELOG.md).

## Technical Stack

- Electron for desktop application
- OBS for screen and audio capture
- WebRTC for P2P streaming
- Web technologies (HTML, CSS, JavaScript) for UI

## Getting Started

### Prerequisites

- Node.js (v14+)
- OBS Studio (for full functionality)

### Installation

```bash
# Clone the repository
git clone [repository-url]

# Navigate to the project directory
cd screenshare

# Install dependencies
npm install

# Start the application
npm start

# In a separate terminal, start the signaling server
npm run server
```

### Usage

1. Start the application and signaling server as described above
2. Configure your capture settings:
   - Select capture source (screen, window, or game)
   - Choose quality preset or customize resolution and frame rate
   - Enable/disable system audio and microphone capture
3. Click "Start Capture" to begin capturing
4. Share the generated Connection ID with viewers:
   - Click "Copy ID" to copy both the Connection ID and a direct link to your clipboard
   - Share this information with viewers
5. Viewers can connect in two ways:
   - By opening the direct link (which automatically connects to your stream)
   - By opening `http://localhost:3000/viewer` in their browser and entering the Connection ID manually

Note: The direct link includes the stream ID and auto-connect parameters for a seamless viewing experience.

### Viewer Features

The viewer interface includes several features to enhance the viewing experience:

- **Connection Status Indicator**: Shows the current connection quality (good, fair, poor)
- **Statistics Display**: Shows resolution, bitrate, framerate, latency, and audio information
- **Quality Selection**: Allows viewers to adjust the stream quality based on their connection
- **Audio Visualization**: Real-time visualization of audio levels
- **Keyboard Shortcuts**:
  - `M`: Toggle mute
  - `F`: Toggle fullscreen
  - `S`: Toggle statistics display
  - `Q`: Show quality options
  - `Esc`: Disconnect (when not in fullscreen)

### Audio Features

The application includes comprehensive audio sharing capabilities:

- **System Audio Capture**: Capture and share system sounds and game audio
- **Microphone Input**: Optional microphone input for commentary
- **Individual Controls**: Separate volume controls and mute toggles for each audio source
- **Device Selection**: Choose specific audio output and input devices
- **Audio Visualization**: Real-time visualization of audio levels
- **Audio Synchronization**: Automatic synchronization of audio and video

### Connection Reliability

The application includes several features to ensure reliable connections:

- **Automatic Reconnection**: Attempts to reconnect automatically if the connection is lost
- **Connection Quality Monitoring**: Monitors connection quality and adjusts settings accordingly
- **Status Feedback**: Provides clear feedback about the current connection state
- **IPv6/IPv4 Interoperability**: Supports connections between different network types using STUN servers

### IPv6/IPv4 Interoperability

The application supports connections between different network types:

- **Multiple STUN Servers**: Uses a variety of public STUN servers to maximize connectivity
- **IPv6/IPv4 Translation**: Enables connections between IPv6-only and IPv4-only networks
- **ICE Candidate Optimization**: Efficiently gathers and prioritizes connection candidates
- **Network Type Detection**: Automatically adapts to the available network connectivity
- **ICE Servers Used**:
  - **STUN Servers**: Google (stun.l.google.com), Cloudflare (stun.cloudflare.com), Nextcloud (stun.nextcloud.com), Metered (relay.metered.ca)
  - **TURN Servers**: OpenRelay free TURN servers (relay.metered.ca, openrelay.metered.ca) for NAT traversal when direct connection fails
  - **Multiple Transports**: UDP, TCP, and TLS support for maximum compatibility
  - **Automatic Fallback**: Graceful fallback from STUN to TURN when direct P2P connection fails

### Configuration Management

The application uses a centralized configuration system for easy management of server settings and network configuration:

#### Configuration File Setup

The application uses a configuration file system to keep sensitive server information secure:

1. **Copy the example configuration**:
   ```bash
   cp config/server.example.json config/server.json
   ```

2. **Edit your local configuration**:
   ```json
   {
     "signaling": {
       "host": "your-server-ip-or-domain",
       "port": 3000,
       "protocol": "http"
     },
     "ice": {
       "servers": [
         {
           "urls": "stun:stun.l.google.com:19302",
           "description": "Google STUN server (primary)"
         },
         {
           "urls": "stun:stun.cloudflare.com:3478",
           "description": "Cloudflare STUN server (reliable)"
         },
         {
           "urls": ["turn:relay.metered.ca:80", "turn:relay.metered.ca:443"],
           "username": "openrelayproject",
           "credential": "openrelayproject",
           "description": "Free TURN server for NAT traversal"
         }
       ]
     },
     "webrtc": {
       "iceCandidatePoolSize": 15,
       "iceTransportPolicy": "all",
       "sdpSemantics": "unified-plan",
       "iceGatheringTimeout": 10000,
       "iceConnectionTimeout": 30000,
       "bundlePolicy": "max-bundle",
       "rtcpMuxPolicy": "require"
     },
     "connection": {
       "maxReconnectAttempts": 10,
       "reconnectInterval": 2000,
       "connectionTimeout": 15000,
       "keepAliveInterval": 30000,
       "qualityCheckInterval": 5000
     }
   }
   ```

**Important**: The `config/server.json` file is automatically ignored by git to protect your server IP address. Only the example template is tracked in version control.

#### Configuration Options

- **signaling.host**: IP address or hostname of your signaling server
- **signaling.port**: Port number for the signaling server (default: 3000)
- **signaling.protocol**: Protocol to use (http or https)
- **ice.servers**: Array of ICE servers (STUN and TURN) for NAT traversal
- **webrtc**: WebRTC-specific configuration options including timeouts and policies
- **connection**: Connection management settings for reconnection and quality monitoring

#### Updating Configuration

To change server settings:

1. Edit `config/server.json` with your server details
2. Restart the application
3. No code changes required - configuration is loaded automatically

### Remote Server Deployment

The application can be deployed with the signaling server on a public server for improved connectivity:

- **Lightweight Signaling**: The signaling server uses minimal bandwidth and resources
- **P2P Media Streaming**: Even with a remote signaling server, media streams flow directly between peers
- **Cross-Network Compatibility**: Solves connectivity issues between different network types
- **No Port Forwarding Required**: Eliminates the need for port forwarding on home routers

#### Initial Server Setup

```bash
# On your server
git clone https://github.com/huskyhao/ScreenShare.git
cd ScreenShare
npm install

# Copy and configure server settings
cp config/server.example.json config/server.json
nano config/server.json  # Edit with your server's IP address

# Install PM2 for process management
npm install -g pm2

# Start the signaling server
pm2 start src/server.js --name "screenshare-signaling"
pm2 save
pm2 startup  # Follow the instructions to enable auto-start
```

#### Updating Server Code

When new updates are available, use the provided update scripts:

```bash
# Make the update script executable (first time only)
chmod +x scripts/quick-update.sh

# Run the quick update
./scripts/quick-update.sh

# Or use the detailed update script
chmod +x scripts/update-server.sh
./scripts/update-server.sh
```

**Manual Update Process:**
```bash
# 1. Backup configuration
cp config/server.json config/server.json.backup

# 2. Stop service
pm2 stop screenshare-signaling

# 3. Pull latest changes
git pull origin master

# 4. Install dependencies
npm install

# 5. Restore configuration (if needed)
cp config/server.json.backup config/server.json

# 6. Restart service
pm2 start screenshare-signaling

# 7. Verify status
pm2 status
pm2 logs screenshare-signaling
```

#### Client Configuration

Simply update `config/server.json` with your server's details:
- Change `signaling.host` to your server's IP address or domain
- Update `signaling.port` if using a different port
- Modify `signaling.protocol` to "https" if using SSL

#### Security Considerations

- Your `config/server.json` file is automatically ignored by git
- Server IP addresses remain private when pushing to GitHub
- Use the provided update scripts to safely pull new changes
- Always backup your configuration before updating

## CI/CD 和自动化部署

本项目包含完整的 CI/CD 流水线，支持自动化构建、测试和部署。

### 快速设置

```bash
# 运行 CI/CD 设置脚本
chmod +x scripts/setup-cicd.sh
./scripts/setup-cicd.sh
```

### 部署方式

1. **自动部署** - 推送到 master 分支自动触发部署
2. **手动部署** - 通过 GitHub Actions 手动触发
3. **本地部署** - 使用 `npm run deploy` 命令
4. **Docker 部署** - 使用 `npm run docker:compose` 命令

### 主要功能

- ✅ 自动化代码质量检查 (ESLint)
- ✅ 安全审计和依赖检查
- ✅ 多平台 Electron 应用构建
- ✅ Docker 容器化部署
- ✅ 自动化服务器部署
- ✅ 部署验证和回滚机制
- ✅ 配置管理和安全保护

详细的 CI/CD 设置和使用说明请参考 [CI/CD 设置指南](docs/CI-CD-SETUP.md)。

## License

This project is licensed under the MIT License - see the LICENSE file for details.
