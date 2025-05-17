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

  // TODO: Replace with actual OBS integration
  // For now, we'll use the browser's getDisplayMedia API for demonstration
  navigator.mediaDevices.getDisplayMedia({
    video: {
      cursor: 'always',
      displaySurface: captureOptions.source === 'screen' ? 'monitor' : 'window'
    },
    audio: captureOptions.audio.system
  })
  .then(stream => {
    localStream = stream;
    
    // Show the preview
    previewVideo.srcObject = stream;
    previewVideo.classList.remove('hidden');
    noPreview.classList.add('hidden');
    
    // Update UI state
    isCapturing = true;
    startCaptureButton.disabled = true;
    stopCaptureButton.disabled = false;
    sharingControls.classList.remove('hidden');
    
    // Generate a random connection ID (this would be replaced with actual P2P connection setup)
    connectionId = generateRandomId();
    connectionIdInput.value = connectionId;
    
    // Notify the main process
    ipcRenderer.send('start-capture', captureOptions);
    
    // Handle stream ending (e.g., when user clicks "Stop sharing" in browser dialog)
    stream.getVideoTracks()[0].onended = () => {
      stopCapture();
    };
  })
  .catch(error => {
    console.error('Error starting capture:', error);
    alert('Failed to start capture: ' + error.message);
  });
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
ipcRenderer.on('peer-connected', (event, peerId) => {
  console.log('Peer connected:', peerId);
  // TODO: Implement peer connection handling
});

ipcRenderer.on('peer-disconnected', (event, peerId) => {
  console.log('Peer disconnected:', peerId);
  // TODO: Implement peer disconnection handling
});

// Clean up resources when the window is closed
window.addEventListener('beforeunload', () => {
  stopCapture();
});
