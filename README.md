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
3. ⬜ P2P connection implementation
4. ⬜ Video quality control
5. ⬜ Audio sharing
6. ⬜ UI optimization and user experience improvements

## Version History

### v0.2.0 (Current)
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

## License

This project is licensed under the MIT License - see the LICENSE file for details.
