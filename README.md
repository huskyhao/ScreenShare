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

### v0.6.4 (Current)
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
4. Share the generated Connection ID with viewers
5. Viewers can connect by opening `http://your-ip:3000/viewer` in their browser and entering the Connection ID

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

## License

This project is licensed under the MIT License - see the LICENSE file for details.
