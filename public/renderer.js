// Import required Electron modules
const { ipcRenderer } = require('electron');

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
let peerConnection = null;
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
let audioMuted = {
  system: false,
  microphone: false
};

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

  // Stop all tracks in the video stream
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }

  // Stop audio stream if it exists
  if (window.audioStream) {
    window.audioStream.getTracks().forEach(track => track.stop());
    window.audioStream = null;
  }

  // Stop audio visualization
  stopAudioVisualization();

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
}

// Copy connection ID to clipboard
function copyConnectionId() {
  if (!connectionId) return;

  navigator.clipboard.writeText(connectionId)
    .then(() => {
      alert('Connection ID copied to clipboard!');
    })
    .catch(err => {
      console.error('Failed to copy connection ID:', err);
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

    // Generate a random connection ID
    connectionId = Math.random().toString(36).substring(2, 10);
    connectionIdInput.value = connectionId;

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

  if (isCapturing && audioStream) {
    // Send volume change to main process
    ipcRenderer.send('set-audio-volume', {
      source: 'system',
      volume: volume / 100
    });
  }
}

// Update microphone volume
function updateMicrophoneVolume() {
  const volume = microphoneVolumeSlider.value;
  microphoneVolumeValue.textContent = `${volume}%`;

  if (isCapturing && audioStream) {
    // Send volume change to main process
    ipcRenderer.send('set-audio-volume', {
      source: 'microphone',
      volume: volume / 100
    });
  }
}

// Toggle audio mute
function toggleAudioMute(source) {
  const button = source === 'system' ? systemAudioMuteButton : microphoneMuteButton;

  // Toggle mute state
  audioMuted[source] = !audioMuted[source];

  // Update button text
  button.textContent = audioMuted[source] ? '🔇' : '🔊';

  if (isCapturing && audioStream) {
    // Send mute change to main process
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
