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

## Version History

### v0.8.0 (Current)
- Implemented comprehensive CI/CD pipeline with GitHub Actions
- Added Docker containerization support for consistent deployments
- Created automated deployment scripts with rollback mechanisms
- Integrated ESLint for code quality checks and security auditing
- Added multi-platform Electron app building (Windows, macOS, Linux)
- Implemented automated server deployment with PM2 process management
- Created detailed CI/CD setup documentation and configuration guides
- Added Docker Compose for easy service orchestration
- Enhanced package.json with new deployment and maintenance scripts
- Implemented secure configuration management with environment variables

### v0.7.3
- Fixed DNS resolution issues with STUN servers that caused connection failures
- Added TURN server support for improved NAT traversal in long-distance connections
- Enhanced WebRTC configuration with better ICE gathering and connection timeouts
- Implemented automatic connection recovery and reconnection mechanisms
- Added comprehensive connection quality monitoring and error handling
- Improved ICE candidate gathering with multiple reliable STUN/TURN servers
- Enhanced connection stability for 2000km+ distance P2P connections
- Added proper cleanup and resource management for failed connections

### v0.7.2
- Added centralized configuration management system
- Created `config/server.json` for easy server and STUN server configuration
- Implemented configuration loading modules for both Node.js and browser environments
- Replaced hardcoded server URLs with configurable settings
- Added `/config` API endpoint for browser-based configuration loading
- Improved maintainability by eliminating hardcoded network settings

### v0.7.1
- Fixed STUN server URL format error that caused RTCPeerConnection construction to fail
- Removed invalid query parameter from Twilio STUN server URL
- Corrected STUN URL format to comply with WebRTC standards
- Improved connection reliability by fixing malformed STUN server configuration

### v0.7.0
- Added support for hosting the signaling server on a public server
- Modified client code to connect to remote signaling server
- Updated connection sharing to use the public server URL
- Improved cross-network connectivity with remote signaling
- Enhanced documentation for server deployment

### v0.6.9
- Added IPv6/IPv4 interoperability support using multiple public STUN servers
- Implemented WebRTC configuration for cross-network connectivity
- Added support for connections between IPv6 and IPv4 networks
- Enhanced ICE candidate gathering with optimized STUN server selection
- Improved connection reliability across different network types
- Added Cloudflare, Twilio, and OpenRelay STUN servers for better connectivity

### v0.6.8
- Fixed audio balance control between system sound and microphone input
- Implemented proper audio mixing with independent volume controls for each source
- Enhanced audio visualization to show mixed audio levels
- Improved system audio capture and processing
- Added detailed logging for audio mixing and processing

### v0.6.7
- Implemented audio control functionality allowing independent adjustment of system sound and microphone volume
- Added audio processing nodes (GainNode) for real-time volume control
- Fixed mute functionality to work correctly
- Improved audio stream processing and cleanup mechanisms
- Added detailed audio processing logs for debugging

### v0.6.6
- Fixed audio sharing issue where system audio wasn't being transmitted to viewers
- Improved audio stream handling by properly combining video and audio streams
- Enhanced audio track management in WebRTC connections
- Added detailed logging for audio stream debugging
- Improved stream cleanup when stopping capture

### v0.6.5
- Fixed "Connection failed: Stream not found" error when connecting to streams
- Enhanced error handling with detailed troubleshooting tips for users
- Improved stream management to prevent orphaned streams
- Added direct link generation for easier stream sharing
- Added support for connecting via URL parameters (e.g., ?id=streamID&autoconnect=true)
- Improved logging for better diagnostics
- Enhanced connection reliability with better host status verification
- Added auto-connect functionality via URL parameters

### v0.6.4
- Fixed Socket.IO connection issues with relative URLs
- Added missing WebRTC methods for handling answers and ICE candidates
- Improved cross-device compatibility
- Fixed "xhr poll error" when connecting from different devices

### v0.6.3
- Fixed WebRTC connection implementation for proper screen and audio sharing
- Implemented ICE candidate exchange between peers
- Fixed track event handling to properly display remote video
- Improved connection statistics with real-time data
- Enhanced reconnection logic for better reliability
- Removed simulation code from viewer page

### v0.6.2
- Fixed stream ID mismatch error by modifying the server to use client-provided IDs
- Improved stream creation process in the signaling server

### v0.6.1
- Fixed WebRTCConnection class export to properly instantiate the class
- Added missing methods to WebRTCConnection class (on, _emitEvent, shutdown, _startStatsCollection)
- Fixed event handling in WebRTC connections
- Improved error handling in WebRTC connections

### v0.6.0
- Fixed WebRTC connection implementation for proper screen content transmission
- Implemented complete P2P connection between host and viewer
- Fixed signaling server to properly handle stream joining
- Enhanced viewer page to properly receive and display the screen content
- Improved connection reliability with better error handling
- Added proper cleanup of WebRTC connections when disconnecting
- Fixed audio transmission through WebRTC

### v0.5.0
- Added comprehensive audio capture and sharing functionality
- Implemented system audio and microphone capture with individual controls
- Added audio visualization for both streamer and viewer
- Added volume controls and mute toggles for each audio source
- Implemented audio device selection for system audio and microphone
- Added audio level monitoring and visualization
- Enhanced statistics display to include audio information

### v0.4.0
- Enhanced viewer UI with connection status indicators
- Added real-time connection quality monitoring
- Implemented automatic reconnection for dropped connections
- Added connection statistics display (resolution, bitrate, framerate, latency)
- Added keyboard shortcuts for common actions
- Improved user feedback during connection process
- Added quality selection options

### v0.3.0
- Added improved error handling with simple logger
- Enhanced WebRTC connection reliability with Socket.io client
- Added support for reconnection to signaling server
- Improved P2P connection stability with better ICE candidate handling
- Added connection quality monitoring

### v0.2.0
- Enhanced OBS integration with more detailed implementation
- Improved screen capture with multiple source options (screen, window, game)
- Added support for different resolutions and frame rates
- Implemented fallback mechanisms for screen capture
- Added detailed documentation for OBS integration

### v0.1.0
- Initial project setup
- Basic application structure
- Simple UI for capture controls
- Placeholder implementation for OBS integration
- Basic WebRTC connection setup

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
