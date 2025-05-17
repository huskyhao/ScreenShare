/**
 * Audio Capture Module
 * 
 * This module handles system audio and microphone capture.
 * It provides functionality for:
 * - Capturing system audio
 * - Capturing microphone input
 * - Mixing audio sources
 * - Audio visualization
 * - Volume control
 */

const { desktopCapturer } = require('electron');
const logger = require('../utils/logger').getComponentLogger('AudioCapture');
const { AppError } = require('../utils/error-handler');

class AudioCapture {
  constructor() {
    this.isInitialized = false;
    this.systemAudioStream = null;
    this.microphoneStream = null;
    this.mixedAudioStream = null;
    this.audioContext = null;
    this.systemAudioSource = null;
    this.microphoneSource = null;
    this.systemAudioGain = null;
    this.microphoneGain = null;
    this.audioAnalyser = null;
    this.audioVisualizationData = null;
    this.audioDevices = {
      outputDevices: [],
      inputDevices: []
    };
    this.selectedDevices = {
      output: 'default',
      input: 'default'
    };
    this.volumes = {
      system: 1.0,
      microphone: 0.8
    };
    this.muted = {
      system: false,
      microphone: false
    };
    this.visualizationInterval = null;
    this.onAudioLevelCallback = null;
  }

  /**
   * Initialize the audio capture module
   * @returns {Promise<boolean>} True if initialization was successful
   */
  async initialize() {
    try {
      logger.info('Initializing audio capture module');
      
      // Get available audio devices
      await this.refreshAudioDevices();
      
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      this.isInitialized = true;
      logger.info('Audio capture module initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize audio capture module:', error);
      this.isInitialized = false;
      throw new AppError('Failed to initialize audio capture', 'AUDIO_INIT_ERROR', { originalError: error });
    }
  }

  /**
   * Refresh the list of available audio devices
   * @returns {Promise<Object>} Object containing lists of input and output devices
   */
  async refreshAudioDevices() {
    try {
      logger.info('Refreshing audio devices');
      
      // Get all media devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      // Filter audio devices
      this.audioDevices.outputDevices = devices.filter(device => device.kind === 'audiooutput');
      this.audioDevices.inputDevices = devices.filter(device => device.kind === 'audioinput');
      
      logger.info(`Found ${this.audioDevices.outputDevices.length} output devices and ${this.audioDevices.inputDevices.length} input devices`);
      
      return this.audioDevices;
    } catch (error) {
      logger.error('Failed to refresh audio devices:', error);
      throw new AppError('Failed to get audio devices', 'AUDIO_DEVICE_ERROR', { originalError: error });
    }
  }

  /**
   * Start capturing system audio
   * @param {Object} options - Capture options
   * @param {string} [options.deviceId] - ID of the audio output device to capture
   * @returns {Promise<MediaStream>} The captured audio stream
   */
  async startSystemAudioCapture(options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      logger.info('Starting system audio capture');
      
      // Store selected device
      this.selectedDevices.output = options.deviceId || 'default';
      
      // Get system audio stream using desktopCapturer
      const sources = await desktopCapturer.getSources({ types: ['screen'] });
      
      if (sources.length === 0) {
        throw new AppError('No screen sources found', 'AUDIO_SOURCE_ERROR');
      }
      
      // Create constraints for system audio
      const constraints = {
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop'
          }
        },
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sources[0].id,
            minWidth: 1,
            maxWidth: 1,
            minHeight: 1,
            maxHeight: 1
          }
        }
      };
      
      // Get the stream
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // We only want the audio track
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
        throw new AppError('No audio track found in system audio stream', 'AUDIO_TRACK_ERROR');
      }
      
      // Create a new stream with just the audio track
      this.systemAudioStream = new MediaStream([audioTrack]);
      
      // Set up audio processing
      this.systemAudioSource = this.audioContext.createMediaStreamSource(this.systemAudioStream);
      this.systemAudioGain = this.audioContext.createGain();
      this.systemAudioGain.gain.value = this.volumes.system;
      
      // Connect the audio nodes
      this.systemAudioSource.connect(this.systemAudioGain);
      
      // If microphone is also active, mix the streams
      if (this.microphoneStream) {
        this._mixAudioStreams();
      } else {
        // Otherwise, just use the system audio
        this._setupAudioAnalyser(this.systemAudioGain);
        this.mixedAudioStream = this.systemAudioStream;
      }
      
      logger.info('System audio capture started successfully');
      return this.systemAudioStream;
    } catch (error) {
      logger.error('Failed to start system audio capture:', error);
      throw new AppError('Failed to capture system audio', 'SYSTEM_AUDIO_ERROR', { originalError: error });
    }
  }

  /**
   * Start capturing microphone audio
   * @param {Object} options - Capture options
   * @param {string} [options.deviceId] - ID of the microphone to capture
   * @returns {Promise<MediaStream>} The captured audio stream
   */
  async startMicrophoneCapture(options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      logger.info('Starting microphone capture');
      
      // Store selected device
      this.selectedDevices.input = options.deviceId || 'default';
      
      // Create constraints for microphone
      const constraints = {
        audio: {
          deviceId: this.selectedDevices.input ? { exact: this.selectedDevices.input } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      };
      
      // Get the stream
      this.microphoneStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Set up audio processing
      this.microphoneSource = this.audioContext.createMediaStreamSource(this.microphoneStream);
      this.microphoneGain = this.audioContext.createGain();
      this.microphoneGain.gain.value = this.volumes.microphone;
      
      // Connect the audio nodes
      this.microphoneSource.connect(this.microphoneGain);
      
      // If system audio is also active, mix the streams
      if (this.systemAudioStream) {
        this._mixAudioStreams();
      } else {
        // Otherwise, just use the microphone audio
        this._setupAudioAnalyser(this.microphoneGain);
        this.mixedAudioStream = this.microphoneStream;
      }
      
      logger.info('Microphone capture started successfully');
      return this.microphoneStream;
    } catch (error) {
      logger.error('Failed to start microphone capture:', error);
      throw new AppError('Failed to capture microphone', 'MICROPHONE_ERROR', { originalError: error });
    }
  }

  /**
   * Mix system audio and microphone streams
   * @private
   */
  _mixAudioStreams() {
    logger.info('Mixing audio streams');
    
    // Create a destination for the mixed audio
    const destination = this.audioContext.createMediaStreamDestination();
    
    // Connect both sources to the destination
    if (this.systemAudioGain && !this.muted.system) {
      this.systemAudioGain.connect(destination);
    }
    
    if (this.microphoneGain && !this.muted.microphone) {
      this.microphoneGain.connect(destination);
    }
    
    // Set up audio analyser for the mixed stream
    this._setupAudioAnalyser(destination);
    
    // Store the mixed stream
    this.mixedAudioStream = destination.stream;
    
    logger.info('Audio streams mixed successfully');
  }

  /**
   * Set up audio analyser for visualization
   * @param {AudioNode} sourceNode - The audio node to analyse
   * @private
   */
  _setupAudioAnalyser(sourceNode) {
    // Clean up existing analyser
    if (this.audioAnalyser) {
      this.audioAnalyser.disconnect();
    }
    
    // Create analyser
    this.audioAnalyser = this.audioContext.createAnalyser();
    this.audioAnalyser.fftSize = 256;
    this.audioVisualizationData = new Uint8Array(this.audioAnalyser.frequencyBinCount);
    
    // Connect source to analyser
    sourceNode.connect(this.audioAnalyser);
    
    // Start visualization if callback is set
    if (this.onAudioLevelCallback && !this.visualizationInterval) {
      this._startVisualization();
    }
  }

  /**
   * Start audio visualization
   * @private
   */
  _startVisualization() {
    if (this.visualizationInterval) {
      clearInterval(this.visualizationInterval);
    }
    
    this.visualizationInterval = setInterval(() => {
      if (this.audioAnalyser && this.onAudioLevelCallback) {
        this.audioAnalyser.getByteFrequencyData(this.audioVisualizationData);
        
        // Calculate average level
        let sum = 0;
        for (let i = 0; i < this.audioVisualizationData.length; i++) {
          sum += this.audioVisualizationData[i];
        }
        const average = sum / this.audioVisualizationData.length;
        
        // Normalize to 0-1
        const level = average / 255;
        
        // Call the callback with the level
        this.onAudioLevelCallback(level);
      }
    }, 100); // Update 10 times per second
  }

  /**
   * Set the callback for audio level updates
   * @param {Function} callback - Function to call with audio level (0-1)
   */
  setAudioLevelCallback(callback) {
    this.onAudioLevelCallback = callback;
    
    if (callback && this.audioAnalyser) {
      this._startVisualization();
    } else if (!callback && this.visualizationInterval) {
      clearInterval(this.visualizationInterval);
      this.visualizationInterval = null;
    }
  }

  /**
   * Set the volume for a specific audio source
   * @param {string} source - The audio source ('system' or 'microphone')
   * @param {number} volume - Volume level (0-1)
   */
  setVolume(source, volume) {
    if (volume < 0 || volume > 1) {
      throw new AppError('Volume must be between 0 and 1', 'INVALID_VOLUME');
    }
    
    logger.info(`Setting ${source} volume to ${volume}`);
    
    if (source === 'system' && this.systemAudioGain) {
      this.volumes.system = volume;
      this.systemAudioGain.gain.value = volume;
    } else if (source === 'microphone' && this.microphoneGain) {
      this.volumes.microphone = volume;
      this.microphoneGain.gain.value = volume;
    }
  }

  /**
   * Toggle mute for a specific audio source
   * @param {string} source - The audio source ('system' or 'microphone')
   * @param {boolean} [mute] - If provided, set mute state; otherwise toggle
   * @returns {boolean} The new mute state
   */
  toggleMute(source, mute) {
    const newMuteState = mute !== undefined ? mute : !this.muted[source];
    
    logger.info(`${newMuteState ? 'Muting' : 'Unmuting'} ${source} audio`);
    
    this.muted[source] = newMuteState;
    
    // Reconnect audio nodes to apply mute state
    if (this.systemAudioStream && this.microphoneStream) {
      this._mixAudioStreams();
    }
    
    return newMuteState;
  }

  /**
   * Get the mixed audio stream
   * @returns {MediaStream|null} The mixed audio stream
   */
  getMixedAudioStream() {
    return this.mixedAudioStream;
  }

  /**
   * Stop all audio capture
   */
  stopCapture() {
    logger.info('Stopping audio capture');
    
    // Stop visualization
    if (this.visualizationInterval) {
      clearInterval(this.visualizationInterval);
      this.visualizationInterval = null;
    }
    
    // Disconnect audio nodes
    if (this.systemAudioSource) {
      this.systemAudioSource.disconnect();
      this.systemAudioSource = null;
    }
    
    if (this.microphoneSource) {
      this.microphoneSource.disconnect();
      this.microphoneSource = null;
    }
    
    if (this.systemAudioGain) {
      this.systemAudioGain.disconnect();
      this.systemAudioGain = null;
    }
    
    if (this.microphoneGain) {
      this.microphoneGain.disconnect();
      this.microphoneGain = null;
    }
    
    if (this.audioAnalyser) {
      this.audioAnalyser.disconnect();
      this.audioAnalyser = null;
    }
    
    // Stop media tracks
    if (this.systemAudioStream) {
      this.systemAudioStream.getTracks().forEach(track => track.stop());
      this.systemAudioStream = null;
    }
    
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }
    
    this.mixedAudioStream = null;
    
    logger.info('Audio capture stopped');
  }
}

module.exports = new AudioCapture();
