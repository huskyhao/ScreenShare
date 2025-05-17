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
let peerConnection = null;
let connectionId = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeApp);
qualityPresetSelect.addEventListener('change', toggleCustomQualityControls);
bitrateSlider.addEventListener('input', updateBitrateValue);
startCaptureButton.addEventListener('click', startCapture);
stopCaptureButton.addEventListener('click', stopCapture);
copyIdButton.addEventListener('click', copyConnectionId);

// Initialize the application
function initializeApp() {
  console.log('Initializing ScreenShare application');
  toggleCustomQualityControls();
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

  // Stop all tracks in the stream
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
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

// Clean up resources when the window is closed
window.addEventListener('beforeunload', () => {
  stopCapture();
});
