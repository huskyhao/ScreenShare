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

### v0.7.2 (Current)
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
- **Public STUN Servers Used**:
  - Google STUN servers (stun.l.google.com)
  - Cloudflare STUN server (stun.cloudflare.com)
  - Twilio STUN server (global.stun.twilio.com)
  - OpenRelay STUN server (stun.openrelay.metered.ca)

### Configuration Management

The application uses a centralized configuration system for easy management of server settings and network configuration:

#### Configuration File

All network settings are stored in `config/server.json`:

```json
{
  "signaling": {
    "host": "123.56.80.178",
    "port": 3000,
    "protocol": "http"
  },
  "stun": {
    "servers": [
      {
        "urls": "stun:stun.l.google.com:19302",
        "description": "Google STUN server (IPv6/IPv4 support)"
      },
      {
        "urls": "stun:global.stun.twilio.com:3478",
        "description": "Twilio STUN server (reliable IPv6/IPv4 support)"
      }
    ]
  },
  "webrtc": {
    "iceCandidatePoolSize": 10,
    "iceTransportPolicy": "all",
    "sdpSemantics": "unified-plan"
  }
}
```

#### Configuration Options

- **signaling.host**: IP address or hostname of your signaling server
- **signaling.port**: Port number for the signaling server (default: 3000)
- **signaling.protocol**: Protocol to use (http or https)
- **stun.servers**: Array of STUN servers for NAT traversal
- **webrtc**: WebRTC-specific configuration options

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
- **Deployment Options**:
  ```bash
  # On your server
  git clone [repository-url]
  cd screenshare
  npm install

  # Update config/server.json with your server's IP address
  # Edit the "host" field in the signaling section

  # Run just the signaling server
  node src/server.js

  # Or use PM2 for persistent operation
  npm install -g pm2
  pm2 start src/server.js --name "screenshare-signaling"
  ```

- **Client Configuration**: Simply update `config/server.json` with your server's details:
  - Change `signaling.host` to your server's IP address or domain
  - Update `signaling.port` if using a different port
  - Modify `signaling.protocol` to "https" if using SSL

## License

This project is licensed under the MIT License - see the LICENSE file for details.
