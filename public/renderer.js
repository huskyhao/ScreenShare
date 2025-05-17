// Import required Electron modules
const { ipcRenderer } = require('electron');
const WebRTCConnection = require('../src/network/webrtc-connection');

// DOM Elements
const captureSourceSelect = document.getElementById('capture-source');
const qualityPresetSelect = document.getElementById('quality-preset');
const customQualityControls = document.getElementById('custom-quality-controls');
const resolutionSelect = document.getElementById('resolution');
const framerateSelect = document.getElementById('framerate');
const bitrateSlider = document.getElementById('bitrate');
const bitrateValue = document.getElementById('bitrate-value');
const systemAudioCheckbox = document.getElementById('system-audio');
const microphoneCheckbox = document.getElementById('microphone');
const audioControls = document.getElementById('audio-controls');
const systemAudioDeviceSelect = document.getElementById('system-audio-device');
const systemAudioVolumeSlider = document.getElementById('system-audio-volume');
const systemAudioVolumeValue = document.getElementById('system-audio-volume-value');
const systemAudioMuteButton = document.getElementById('system-audio-mute');
const microphoneDeviceSelect = document.getElementById('microphone-device');
const microphoneVolumeSlider = document.getElementById('microphone-volume');
const microphoneVolumeValue = document.getElementById('microphone-volume-value');
const microphoneMuteButton = document.getElementById('microphone-mute');
const audioVisualizerContainer = document.getElementById('audio-visualizer');
const previewContainer = document.getElementById('preview-container');
const noPreview = document.getElementById('no-preview');
const previewVideo = document.getElementById('preview-video');
const startCaptureButton = document.getElementById('start-capture');
const stopCaptureButton = document.getElementById('stop-capture');
const sharingControls = document.getElementById('sharing-controls');
const connectionIdInput = document.getElementById('connection-id');
const copyIdButton = document.getElementById('copy-id');

// State variables
let isCapturing = false;
let localStream = null;
let audioStream = null;
let connectionId = null;
let audioVisualizer = null;
let audioContext = null;
let audioAnalyser = null;
let audioVisualizationData = null;
let visualizationInterval = null;
let audioDevices = {
  outputDevices: [],
  inputDevices: []
};
let webrtcConnection = null; // WebRTC connection instance
let audioMuted = {
  system: false,
  microphone: false
};
// Audio processing nodes
let audioSource = null;
let systemGainNode = null;
let microphoneGainNode = null;
let audioDestination = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeApp);
qualityPresetSelect.addEventListener('change', toggleCustomQualityControls);
bitrateSlider.addEventListener('input', updateBitrateValue);
startCaptureButton.addEventListener('click', startCapture);
stopCaptureButton.addEventListener('click', stopCapture);
copyIdButton.addEventListener('click', copyConnectionId);
systemAudioCheckbox.addEventListener('change', toggleAudioControls);
microphoneCheckbox.addEventListener('change', toggleAudioControls);
systemAudioVolumeSlider.addEventListener('input', updateSystemAudioVolume);
microphoneVolumeSlider.addEventListener('input', updateMicrophoneVolume);
systemAudioMuteButton.addEventListener('click', () => toggleAudioMute('system'));
microphoneMuteButton.addEventListener('click', () => toggleAudioMute('microphone'));

// Initialize the application
function initializeApp() {
  console.log('Initializing ScreenShare application');
  toggleCustomQualityControls();

  // Initialize audio controls
  initializeAudioControls();

  // Get available audio devices
  getAudioDevices();
}

// Toggle custom quality controls based on quality preset selection
function toggleCustomQualityControls() {
  if (qualityPresetSelect.value === 'custom') {
    customQualityControls.classList.remove('hidden');
  } else {
    customQualityControls.classList.add('hidden');
  }
}

// Update bitrate value display
function updateBitrateValue() {
  bitrateValue.textContent = `${bitrateSlider.value} Mbps`;
}

// Start screen capture
function startCapture() {
  if (isCapturing) return;

  const captureOptions = {
    source: captureSourceSelect.value,
    quality: qualityPresetSelect.value,
    resolution: resolutionSelect.value,
    framerate: parseInt(framerateSelect.value),
    bitrate: parseInt(bitrateSlider.value),
    audio: {
      system: systemAudioCheckbox.checked,
      microphone: microphoneCheckbox.checked
    }
  };

  console.log('Starting capture with options:', captureOptions);

  // Request capture sources from the main process
  ipcRenderer.send('start-capture', captureOptions);

  // Show loading state
  startCaptureButton.disabled = true;
  startCaptureButton.textContent = 'Starting...';
}

// Stop screen capture
function stopCapture() {
  if (!isCapturing) return;

  console.log('Stopping capture');

  // Stop all tracks in the video stream (which may include audio tracks after combining)
  if (localStream) {
    console.log(`Stopping all tracks in localStream: Video tracks: ${localStream.getVideoTracks().length}, Audio tracks: ${localStream.getAudioTracks().length}`);
    localStream.getTracks().forEach(track => {
      console.log(`Stopping ${track.kind} track`);
      track.stop();
    });
    localStream = null;
  }

  // Stop separate audio stream if it exists
  if (window.audioStream) {
    console.log(`Stopping all tracks in audioStream: Audio tracks: ${window.audioStream.getAudioTracks().length}`);
    window.audioStream.getTracks().forEach(track => {
      console.log(`Stopping audio track`);
      track.stop();
    });
    window.audioStream = null;
  }

  // Stop audio visualization
  stopAudioVisualization();

  // Clean up audio processing nodes
  if (audioSource) {
    audioSource.disconnect();
    audioSource = null;
  }

  if (systemGainNode) {
    systemGainNode.disconnect();
    systemGainNode = null;
  }

  if (microphoneGainNode) {
    microphoneGainNode.disconnect();
    microphoneGainNode = null;
  }

  if (audioDestination) {
    audioDestination.disconnect();
    audioDestination = null;
  }

  if (audioContext) {
    // Close the audio context
    try {
      audioContext.close().then(() => {
        console.log('Audio context closed');
        audioContext = null;
      }).catch(err => {
        console.error('Error closing audio context:', err);
      });
    } catch (error) {
      console.error('Error closing audio context:', error);
    }
  }

  // Reset the preview
  previewVideo.srcObject = null;
  previewVideo.classList.add('hidden');
  noPreview.classList.remove('hidden');

  // Update UI state
  isCapturing = false;
  startCaptureButton.disabled = false;
  stopCaptureButton.disabled = true;
  sharingControls.classList.add('hidden');

  // Notify the main process
  ipcRenderer.send('stop-capture');

  // Notify about audio stopping
  if (systemAudioCheckbox.checked || microphoneCheckbox.checked) {
    ipcRenderer.send('toggle-audio', {
      systemAudio: false,
      microphone: false
    });
  }

  // Clean up WebRTC connection
  if (webrtcConnection) {
    try {
      webrtcConnection.shutdown();
      webrtcConnection = null;
      console.log('WebRTC connection closed');
    } catch (error) {
      console.error('Error shutting down WebRTC connection:', error);
    }
  }
}

// Copy connection ID to clipboard
function copyConnectionId() {
  if (!connectionId) return;

  // Get the port from the signaling server
  ipcRenderer.send('get-signaling-server-port');
  ipcRenderer.once('signaling-server-port', (event, port) => {
    // Create a viewer URL with the connection ID
    const viewerUrl = `http://localhost:${port}/viewer?id=${connectionId}&autoconnect=true`;

    // Create a message with both the ID and the URL
    const message = `Connection ID: ${connectionId}\n\nDirect link: ${viewerUrl}`;

    // Copy to clipboard
    navigator.clipboard.writeText(message)
      .then(() => {
        alert('Connection ID and direct link copied to clipboard!\n\nShare this with viewers to connect to your stream.');
      })
      .catch(err => {
        console.error('Failed to copy connection info:', err);
        // Fallback to just copying the ID if the clipboard API fails
        alert(`Connection ID: ${connectionId}\n\nDirect link: ${viewerUrl}\n\n(Please copy this manually)`);
      });
  });
}

// Generate a random connection ID
function generateRandomId() {
  return Math.random().toString(36).substring(2, 10);
}

// Handle IPC messages from the main process

// Handle capture sources response
ipcRenderer.on('capture-sources', async (event, sources) => {
  console.log('Received capture sources:', sources);

  // If no sources found
  if (!sources || sources.length === 0) {
    alert('No capture sources found');
    startCaptureButton.disabled = false;
    startCaptureButton.textContent = 'Start Capture';
    return;
  }

  try {
    // Find the appropriate source based on user selection
    let selectedSource;
    const sourceType = captureSourceSelect.value;

    if (sourceType === 'screen') {
      // Find a screen source
      selectedSource = sources.find(source => source.id.includes('screen'));
    } else if (sourceType === 'window') {
      // Find a window source
      selectedSource = sources.find(source => source.id.includes('window'));
    } else {
      // Default to the first source
      selectedSource = sources[0];
    }

    if (!selectedSource) {
      selectedSource = sources[0]; // Fallback to first source
    }

    console.log('Selected source:', selectedSource);

    // Create constraints based on quality settings
    const constraints = {
      audio: {
        mandatory: {
          chromeMediaSource: 'desktop'
        }
      },
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: selectedSource.id
        }
      }
    };

    // Add resolution constraints based on quality
    const resolution = resolutionSelect.value;
    if (resolution === '720p') {
      constraints.video.mandatory.maxWidth = 1280;
      constraints.video.mandatory.maxHeight = 720;
    } else if (resolution === '1080p') {
      constraints.video.mandatory.maxWidth = 1920;
      constraints.video.mandatory.maxHeight = 1080;
    } else if (resolution === '1440p') {
      constraints.video.mandatory.maxWidth = 2560;
      constraints.video.mandatory.maxHeight = 1440;
    } else if (resolution === '4k') {
      constraints.video.mandatory.maxWidth = 3840;
      constraints.video.mandatory.maxHeight = 2160;
    }

    // Get the stream
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    // Add the stream to the video element
    localStream = stream;
    previewVideo.srcObject = stream;
    previewVideo.classList.remove('hidden');
    noPreview.classList.add('hidden');

    // Update UI state
    isCapturing = true;
    startCaptureButton.disabled = true;
    startCaptureButton.textContent = 'Start Capture';
    stopCaptureButton.disabled = false;
    sharingControls.classList.remove('hidden');

    // Initialize WebRTC connection
    try {
      console.log('Creating WebRTC connection...');
      // Create a new WebRTC connection
      webrtcConnection = new WebRTCConnection();

      // Set up error event listener before initialization
      webrtcConnection.on('error', (error) => {
        console.error('WebRTC error:', error);
        alert('WebRTC error: ' + (error.message || 'Unknown error'));
      });

      console.log('Initializing WebRTC connection...');
      // Get the dynamically assigned port from the main process
      const port = await new Promise((resolve) => {
        ipcRenderer.once('signaling-server-port', (event, port) => {
          resolve(port);
        });
        ipcRenderer.send('get-signaling-server-port');
      });

      console.log(`Using signaling server at port: ${port}`);

      // Initialize as host with a timeout
      const connectionId = await Promise.race([
        webrtcConnection.initialize({
          isHost: true,
          signalingServer: `http://localhost:${port}`  // Use the dynamic port
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout - server might not be running')), 10000)
        )
      ]);

      // Set the connection ID
      connectionIdInput.value = connectionId;

      // Set the local stream
      console.log('Setting local stream to WebRTC connection');

      // Log stream details
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      console.log(`Stream details - Video tracks: ${videoTracks.length}, Audio tracks: ${audioTracks.length}`);

      if (videoTracks.length > 0) {
        console.log('Video track settings:', videoTracks[0].getSettings());
      }

      webrtcConnection.setLocalStream(stream);

      // Set up event listeners
      webrtcConnection.on('viewer-joined', (data) => {
        console.log('Viewer joined:', data.viewerId);
      });

      webrtcConnection.on('viewer-left', (data) => {
        console.log('Viewer left:', data.viewerId);
      });

      console.log('WebRTC connection initialized with ID:', connectionId);
    } catch (error) {
      console.error('Failed to initialize WebRTC connection:', error);
      alert('Failed to initialize connection: ' + error.message);

      // Clean up if initialization failed
      if (webrtcConnection) {
        try {
          webrtcConnection.shutdown();
        } catch (e) {
          console.error('Error shutting down failed WebRTC connection:', e);
        }
        webrtcConnection = null;
      }
    }

    // Handle stream ending
    stream.getVideoTracks()[0].onended = () => {
      stopCapture();
    };

    // Handle audio if enabled
    if (systemAudioCheckbox.checked || microphoneCheckbox.checked) {
      try {
        // Create audio constraints
        const audioConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        };

        // Add device ID if microphone is selected
        if (microphoneCheckbox.checked && microphoneDeviceSelect.value !== 'default') {
          audioConstraints.audio.deviceId = { exact: microphoneDeviceSelect.value };
        }

        // Get audio stream
        navigator.mediaDevices.getUserMedia(audioConstraints)
          .then(audioStream => {
            // Store the audio stream
            window.audioStream = audioStream;

            // Start audio visualization
            startAudioVisualization(audioStream);

            // Notify the main process
            ipcRenderer.send('toggle-audio', {
              systemAudio: systemAudioCheckbox.checked,
              microphone: microphoneCheckbox.checked
            });

            // Add audio tracks to the stream that's being shared via WebRTC
            if (localStream && webrtcConnection) {
              console.log('Adding audio tracks to WebRTC stream with audio processing');

              // Create audio context if it doesn't exist
              if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
              }

              // Create a new stream that combines video from screen capture and processed audio
              const combinedStream = new MediaStream();

              // Add all video tracks from the screen capture
              localStream.getVideoTracks().forEach(track => {
                combinedStream.addTrack(track);
              });

              // Set up audio processing nodes
              // Create source from the audio stream
              audioSource = audioContext.createMediaStreamSource(audioStream);

              // Create gain nodes for volume control
              systemGainNode = audioContext.createGain();
              microphoneGainNode = audioContext.createGain();

              // Set initial gain values based on slider positions
              systemGainNode.gain.value = systemAudioVolumeSlider.value / 100;
              microphoneGainNode.gain.value = microphoneVolumeSlider.value / 100;

              // Create destination node to output the processed audio
              audioDestination = audioContext.createMediaStreamDestination();

              // Connect the nodes: source -> gain -> destination
              audioSource.connect(systemGainNode);
              systemGainNode.connect(audioDestination);

              // Apply initial mute state if needed
              if (audioMuted.system) {
                systemGainNode.gain.value = 0;
              }

              if (audioMuted.microphone) {
                microphoneGainNode.gain.value = 0;
              }

              // Add the processed audio tracks to the combined stream
              audioDestination.stream.getAudioTracks().forEach(track => {
                combinedStream.addTrack(track);
              });

              // Log the combined stream details
              console.log(`Combined stream - Video tracks: ${combinedStream.getVideoTracks().length}, Audio tracks: ${combinedStream.getAudioTracks().length}`);

              // Update the local stream reference
              localStream = combinedStream;

              // Update the preview with the combined stream
              previewVideo.srcObject = combinedStream;

              // Set the combined stream in the WebRTC connection
              webrtcConnection.setLocalStream(combinedStream);
            }
          })
          .catch(error => {
            console.error('Error getting audio stream:', error);
          });
      } catch (error) {
        console.error('Error setting up audio:', error);
      }
    }
  } catch (error) {
    console.error('Error starting capture:', error);
    alert('Failed to start capture: ' + error.message);
    startCaptureButton.disabled = false;
    startCaptureButton.textContent = 'Start Capture';
  }
});

// Handle capture error
ipcRenderer.on('capture-error', (event, error) => {
  console.error('Capture error:', error);
  alert('Failed to start capture: ' + error.message);
  startCaptureButton.disabled = false;
  startCaptureButton.textContent = 'Start Capture';
});

// Handle peer connection
ipcRenderer.on('peer-connected', (event, peerId) => {
  console.log('Peer connected:', peerId);
  // TODO: Implement peer connection handling
});

// Handle peer disconnection
ipcRenderer.on('peer-disconnected', (event, peerId) => {
  console.log('Peer disconnected:', peerId);
  // TODO: Implement peer disconnection handling
});

// Initialize audio controls
function initializeAudioControls() {
  // Set initial volume values
  systemAudioVolumeValue.textContent = `${systemAudioVolumeSlider.value}%`;
  microphoneVolumeValue.textContent = `${microphoneVolumeSlider.value}%`;

  // Initialize audio visualizer
  audioVisualizer = new AudioVisualizer(audioVisualizerContainer, {
    type: 'bar',
    color: '#4a6bff',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    smoothing: 0.7
  });

  // Hide audio controls initially
  audioControls.classList.add('hidden');
}

// Get available audio devices
async function getAudioDevices() {
  try {
    // Request permission to access audio devices
    await navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        // Stop the stream immediately after getting permission
        stream.getTracks().forEach(track => track.stop());
      });

    // Get all media devices
    const devices = await navigator.mediaDevices.enumerateDevices();

    // Filter audio devices
    audioDevices.outputDevices = devices.filter(device => device.kind === 'audiooutput');
    audioDevices.inputDevices = devices.filter(device => device.kind === 'audioinput');

    // Populate device selectors
    populateAudioDeviceSelectors();

    // Notify the main process
    ipcRenderer.send('get-audio-devices');
  } catch (error) {
    console.error('Failed to get audio devices:', error);
  }
}

// Populate audio device selectors
function populateAudioDeviceSelectors() {
  // Clear existing options (except the default)
  while (systemAudioDeviceSelect.options.length > 1) {
    systemAudioDeviceSelect.remove(1);
  }

  while (microphoneDeviceSelect.options.length > 1) {
    microphoneDeviceSelect.remove(1);
  }

  // Add output devices
  audioDevices.outputDevices.forEach(device => {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.text = device.label || `Output Device ${systemAudioDeviceSelect.options.length}`;
    systemAudioDeviceSelect.appendChild(option);
  });

  // Add input devices
  audioDevices.inputDevices.forEach(device => {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.text = device.label || `Input Device ${microphoneDeviceSelect.options.length}`;
    microphoneDeviceSelect.appendChild(option);
  });
}

// Toggle audio controls based on checkbox state
function toggleAudioControls() {
  const showControls = systemAudioCheckbox.checked || microphoneCheckbox.checked;

  if (showControls) {
    audioControls.classList.remove('hidden');
  } else {
    audioControls.classList.add('hidden');
  }

  // Enable/disable device selectors based on checkbox state
  systemAudioDeviceSelect.disabled = !systemAudioCheckbox.checked;
  microphoneDeviceSelect.disabled = !microphoneCheckbox.checked;
}

// Update system audio volume
function updateSystemAudioVolume() {
  const volume = systemAudioVolumeSlider.value;
  systemAudioVolumeValue.textContent = `${volume}%`;

  if (isCapturing && systemGainNode) {
    // Apply volume change directly to the gain node
    const normalizedVolume = volume / 100;
    console.log(`Setting system audio volume to ${normalizedVolume}`);
    systemGainNode.gain.value = normalizedVolume;

    // Also send to main process for logging
    ipcRenderer.send('set-audio-volume', {
      source: 'system',
      volume: normalizedVolume
    });
  }
}

// Update microphone volume
function updateMicrophoneVolume() {
  const volume = microphoneVolumeSlider.value;
  microphoneVolumeValue.textContent = `${volume}%`;

  if (isCapturing && microphoneGainNode) {
    // Apply volume change directly to the gain node
    const normalizedVolume = volume / 100;
    console.log(`Setting microphone volume to ${normalizedVolume}`);
    microphoneGainNode.gain.value = normalizedVolume;

    // Also send to main process for logging
    ipcRenderer.send('set-audio-volume', {
      source: 'microphone',
      volume: normalizedVolume
    });
  }
}

// Toggle audio mute
function toggleAudioMute(source) {
  const button = source === 'system' ? systemAudioMuteButton : microphoneMuteButton;
  const gainNode = source === 'system' ? systemGainNode : microphoneGainNode;

  // Toggle mute state
  audioMuted[source] = !audioMuted[source];

  // Update button text
  button.textContent = audioMuted[source] ? '🔇' : '🔊';

  // Apply mute state directly to the gain node
  if (isCapturing && gainNode) {
    if (audioMuted[source]) {
      // Store the current volume to restore it later
      gainNode._previousVolume = gainNode.gain.value;
      // Set volume to 0 (mute)
      gainNode.gain.value = 0;
      console.log(`Muting ${source} audio`);
    } else {
      // Restore previous volume
      const previousVolume = gainNode._previousVolume || (source === 'system' ? systemAudioVolumeSlider.value / 100 : microphoneVolumeSlider.value / 100);
      gainNode.gain.value = previousVolume;
      console.log(`Unmuting ${source} audio, setting volume to ${previousVolume}`);
    }

    // Also send to main process for logging
    ipcRenderer.send('toggle-audio-mute', {
      source,
      mute: audioMuted[source]
    });
  }
}

// Start audio visualization
function startAudioVisualization(stream) {
  if (!stream || !audioVisualizer) return;

  // Create audio context if needed
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Create audio source from stream
  const source = audioContext.createMediaStreamSource(stream);

  // Create analyser
  audioAnalyser = audioContext.createAnalyser();
  audioAnalyser.fftSize = 256;
  audioVisualizationData = new Uint8Array(audioAnalyser.frequencyBinCount);

  // Connect source to analyser
  source.connect(audioAnalyser);

  // Start visualization
  if (visualizationInterval) {
    clearInterval(visualizationInterval);
  }

  visualizationInterval = setInterval(() => {
    if (audioAnalyser && audioVisualizer) {
      audioAnalyser.getByteFrequencyData(audioVisualizationData);

      // Calculate average level
      let sum = 0;
      for (let i = 0; i < audioVisualizationData.length; i++) {
        sum += audioVisualizationData[i];
      }
      const average = sum / audioVisualizationData.length;

      // Normalize to 0-1
      const level = average / 255;

      // Update visualizer
      audioVisualizer.updateLevel(level);
    }
  }, 50); // Update 20 times per second
}

// Stop audio visualization
function stopAudioVisualization() {
  if (visualizationInterval) {
    clearInterval(visualizationInterval);
    visualizationInterval = null;
  }

  if (audioAnalyser) {
    audioAnalyser.disconnect();
    audioAnalyser = null;
  }

  if (audioVisualizer) {
    audioVisualizer.updateLevel(0);
  }
}

// Handle audio toggle result
ipcRenderer.on('audio-toggle-result', (event, result) => {
  console.log('Audio toggle result:', result);
});

// Handle audio devices result
ipcRenderer.on('audio-devices-result', (event, result) => {
  console.log('Audio devices result:', result);
});

// Handle audio volume result
ipcRenderer.on('audio-volume-result', (event, result) => {
  console.log('Audio volume result:', result);
});

// Handle audio mute result
ipcRenderer.on('audio-mute-result', (event, result) => {
  console.log('Audio mute result:', result);
});

// Clean up resources when the window is closed
window.addEventListener('beforeunload', () => {
  stopCapture();
  stopAudioVisualization();

  if (audioVisualizer) {
    audioVisualizer.destroy();
    audioVisualizer = null;
  }
});
