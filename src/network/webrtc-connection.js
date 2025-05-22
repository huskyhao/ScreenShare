/**
 * WebRTC Connection Module
 *
 * This module handles P2P connections using WebRTC for low-latency streaming.
 *
 * Features:
 * - Direct peer-to-peer connections for minimal latency
 * - Fallback to TURN relay if direct connection fails
 * - Automatic reconnection on connection loss
 * - Bandwidth adaptation for varying network conditions
 * - Support for multiple simultaneous viewers
 * - Signaling through WebSocket server
 */

const io = require('socket.io-client');
const adapter = require('webrtc-adapter');
const configManager = require('../utils/config');

class WebRTCConnection {
  constructor() {
    this.peerConnections = new Map(); // Map of peer ID to RTCPeerConnection
    this.dataChannels = new Map(); // Map of peer ID to RTCDataChannel
    this.pendingCandidates = new Map(); // Map of peer ID to pending ICE candidates
    this.localStream = null;
    this.signaling = null; // Will hold the signaling server connection
    this.connectionId = null;
    this.isHost = false; // Whether this client is the host or a viewer
    this.reconnectAttempts = 0;
    this.connectionState = 'disconnected';
    this.eventListeners = new Map(); // Event listeners for custom events
    this.stats = {
      bytesReceived: 0,
      bytesSent: 0,
      packetsReceived: 0,
      packetsSent: 0,
      packetsLost: 0,
      roundTripTime: 0,
      jitter: 0
    };
    this.statsInterval = null;

    // Load connection configuration
    this.connectionConfig = configManager.getConnectionConfig();
    this.maxReconnectAttempts = this.connectionConfig.maxReconnectAttempts;
    this.reconnectInterval = this.connectionConfig.reconnectInterval;
    this.connectionTimeout = this.connectionConfig.connectionTimeout;

    // Connection quality monitoring
    this.qualityCheckInterval = null;
    this.lastQualityCheck = Date.now();
    this.connectionQuality = 'unknown';

    // ICE gathering state tracking
    this.iceGatheringComplete = new Map(); // Map of peer ID to boolean
    this.iceGatheringTimeouts = new Map(); // Map of peer ID to timeout

    // Enhanced error handling
    this.connectionErrors = new Map(); // Map of peer ID to error count
    this.lastConnectionAttempt = new Map(); // Map of peer ID to timestamp
  }

  /**
   * Initialize the WebRTC connection
   * @param {Object} options - Initialization options
   * @param {boolean} [options.isHost=false] - Whether this client is the host
   * @param {string} [options.signalingServer='http://localhost:3000'] - URL of the signaling server
   * @param {string} [options.existingConnectionId] - Existing connection ID to join (for viewers)
   * @returns {Promise<string>} Connection ID for sharing
   */
  async initialize(options = {}) {
    try {
      console.log('Initializing WebRTC connection...');

      // Set options
      this.isHost = options.isHost !== undefined ? options.isHost : false;
      const signalingServer = options.signalingServer || '/';

      // Connect to signaling server
      console.log(`Connecting to signaling server at ${signalingServer}...`);

      // Configure Socket.IO with enhanced connection settings
      const socketOptions = {
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectInterval,
        timeout: this.connectionTimeout,
        transports: ['polling', 'websocket'],
        upgrade: true,
        forceNew: true,
        rejectUnauthorized: false,
        // Additional options for better reliability
        randomizationFactor: 0.5,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: this.maxReconnectAttempts,
        pingTimeout: 60000,
        pingInterval: 25000
      };

      this.signaling = io(signalingServer, socketOptions);

      // Set up signaling event handlers
      this._setupSignalingEvents();

      // Wait for connection to signaling server
      await new Promise((resolve, reject) => {
        this.signaling.on('connect', () => {
          console.log('Connected to signaling server');
          this.connectionState = 'connected_to_signaling';
          resolve();
        });

        this.signaling.on('connect_error', (error) => {
          console.error('Failed to connect to signaling server:', error);
          reject(new Error(`Connection error: ${error.message || 'Unknown error'}`));
        });

        this.signaling.on('connect_timeout', () => {
          console.error('Connection to signaling server timed out');
          reject(new Error('Connection to signaling server timed out'));
        });

        this.signaling.on('error', (error) => {
          console.error('Socket.IO error:', error);
          reject(new Error(`Socket.IO error: ${error.message || 'Unknown error'}`));
        });

        // Set a timeout for connection
        setTimeout(() => {
          if (this.connectionState !== 'connected_to_signaling') {
            reject(new Error('Connection to signaling server timed out'));
          }
        }, 20000);
      });

      // If we're the host, create a new stream
      if (this.isHost) {
        // Generate a random connection ID
        this.connectionId = this._generateConnectionId();

        // Create a new stream on the signaling server
        this.signaling.emit('create-stream', this.connectionId);

        // Wait for confirmation
        await new Promise((resolve, reject) => {
          this.signaling.once('stream-created', (streamId) => {
            if (streamId === this.connectionId) {
              console.log('Stream created with ID:', streamId);
              resolve();
            } else {
              reject(new Error('Stream ID mismatch'));
            }
          });

          // Set a timeout
          setTimeout(() => {
            reject(new Error('Stream creation timed out'));
          }, 5000);
        });
      }
      // If we're a viewer, join an existing stream
      else if (options.existingConnectionId) {
        this.connectionId = options.existingConnectionId;

        // Join the stream
        this.signaling.emit('join-stream', this.connectionId);

        // Wait for confirmation
        await new Promise((resolve, reject) => {
          this.signaling.once('joined-stream', (streamId) => {
            if (streamId === this.connectionId) {
              console.log('Joined stream with ID:', streamId);
              resolve();
            } else {
              reject(new Error('Stream ID mismatch'));
            }
          });

          this.signaling.once('error', (error) => {
            reject(new Error(error.message || 'Failed to join stream'));
          });

          // Set a timeout
          setTimeout(() => {
            reject(new Error('Stream joining timed out'));
          }, 5000);
        });
      } else {
        throw new Error('Either isHost must be true or existingConnectionId must be provided');
      }

      // Start collecting stats periodically
      this._startStatsCollection();

      console.log('WebRTC connection initialized with ID:', this.connectionId);
      return this.connectionId;
    } catch (error) {
      console.error('Failed to initialize WebRTC connection:', error);
      this.connectionState = 'disconnected';

      // Clean up if initialization failed
      if (this.signaling) {
        this.signaling.disconnect();
        this.signaling = null;
      }

      throw error;
    }
  }

  /**
   * Set up event handlers for the signaling connection
   * @private
   */
  _setupSignalingEvents() {
    if (!this.signaling) return;

    // Handle disconnection
    this.signaling.on('disconnect', () => {
      console.log('Disconnected from signaling server');
      this.connectionState = 'signaling_disconnected';

      // Try to reconnect if we were previously connected
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
        this.reconnectAttempts++;

        setTimeout(() => {
          this.signaling.connect();
        }, this.reconnectInterval);
      } else {
        console.error('Max reconnect attempts reached');
        this._emitEvent('error', { message: 'Failed to reconnect to signaling server' });
      }
    });

    // Handle reconnection
    this.signaling.on('reconnect', () => {
      console.log('Reconnected to signaling server');
      this.connectionState = 'connected_to_signaling';
      this.reconnectAttempts = 0;

      // Re-join the stream if we were previously connected
      if (this.connectionId) {
        if (this.isHost) {
          this.signaling.emit('create-stream', this.connectionId);
        } else {
          this.signaling.emit('join-stream', this.connectionId);
        }
      }
    });

    // Handle incoming signals (offers, answers, ICE candidates)
    this.signaling.on('signal', async (data) => {
      try {
        const { from, signal } = data;

        // If we don't have a connection to this peer yet, create one
        if (!this.peerConnections.has(from)) {
          await this._createPeerConnection(from);
        }

        const peerConnection = this.peerConnections.get(from);

        // Handle different signal types
        if (signal.type === 'offer') {
          await this._handleOffer(from, signal);
        } else if (signal.type === 'answer') {
          await this._handleAnswer(from, signal);
        } else if (signal.candidate) {
          await this._handleIceCandidate(from, signal);
        } else if (signal.type === 'viewer-ready') {
          // This is a backup signal from the viewer in case the viewer-joined event was missed
          console.log('Received viewer-ready signal from:', from);
          if (this.isHost) {
            // Initiate connection to the viewer if we haven't already
            if (!this.peerConnections.has(from)) {
              console.log('Initiating connection to viewer from viewer-ready signal');
              this.connectToPeer(from);
            }
          }
        }
      } catch (error) {
        console.error('Error handling signal:', error);
      }
    });

    // Handle viewer joined (for host)
    this.signaling.on('viewer-joined', (data) => {
      if (this.isHost) {
        console.log('Viewer joined:', data.viewerId);
        this._emitEvent('viewer-joined', { viewerId: data.viewerId });

        // Initiate connection to the viewer
        this.connectToPeer(data.viewerId);
      }
    });

    // Handle viewer left (for host)
    this.signaling.on('viewer-left', (data) => {
      if (this.isHost) {
        console.log('Viewer left:', data.viewerId);
        this._emitEvent('viewer-left', { viewerId: data.viewerId });

        // Clean up the connection
        this.disconnectFromPeer(data.viewerId);
      }
    });

    // Handle stream ended (for viewers)
    this.signaling.on('stream-ended', () => {
      if (!this.isHost) {
        console.log('Stream ended by host');
        this._emitEvent('stream-ended');

        // Clean up all connections
        this.shutdown();
      }
    });
  }

  /**
   * Set the local media stream to be shared
   * @param {MediaStream} stream - The local media stream
   */
  setLocalStream(stream) {
    this.localStream = stream;

    // If we already have peer connections, add the stream to them
    for (const [peerId, connection] of this.peerConnections.entries()) {
      this._addStreamToPeer(connection, peerId);
    }
  }

  /**
   * Connect to a peer using their connection ID
   * @param {string} peerId - The peer's connection ID
   * @returns {Promise<RTCPeerConnection>} The peer connection
   */
  async connectToPeer(peerId) {
    if (this.peerConnections.has(peerId)) {
      console.log('Already connected to peer:', peerId);
      return this.peerConnections.get(peerId);
    }

    try {
      console.log('Connecting to peer:', peerId);

      // Create a new peer connection
      const peerConnection = await this._createPeerConnection(peerId);

      // Create a data channel for control messages
      this._createDataChannel(peerConnection, peerId);

      // Create and send an offer
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });

      await peerConnection.setLocalDescription(offer);

      // Send the offer to the peer via the signaling server
      if (this.signaling) {
        this.signaling.emit('signal', {
          to: peerId,
          signal: offer
        });
        console.log('Sent offer to peer:', peerId);
      } else {
        throw new Error('No signaling connection available');
      }

      return peerConnection;
    } catch (error) {
      console.error('Failed to connect to peer:', error);

      // Clean up if connection failed
      if (this.peerConnections.has(peerId)) {
        this.disconnectFromPeer(peerId);
      }

      throw error;
    }
  }

  /**
   * Create a new peer connection
   * @param {string} peerId - The peer's connection ID
   * @returns {Promise<RTCPeerConnection>} The peer connection
   * @private
   */
  async _createPeerConnection(peerId) {
    console.log('Creating new peer connection for:', peerId);

    try {
      // Create a new RTCPeerConnection with enhanced configuration
      const webrtcConfig = configManager.getWebRTCConfig();
      console.log('Using WebRTC config:', JSON.stringify(webrtcConfig, null, 2));

      const peerConnection = new RTCPeerConnection({
        ...webrtcConfig,
        // Enable DTLS for secure connections
        certificates: [await RTCPeerConnection.generateCertificate({
          name: 'ECDSA',
          namedCurve: 'P-256'
        })]
      });

      // Set up event handlers
      this._setupPeerConnectionEvents(peerConnection, peerId);

      // Add the local stream if available
      if (this.localStream) {
        this._addStreamToPeer(peerConnection, peerId);
      }

      // Store the connection
      this.peerConnections.set(peerId, peerConnection);

      // Initialize pending candidates array
      this.pendingCandidates.set(peerId, []);

      // Initialize ICE gathering tracking
      this.iceGatheringComplete.set(peerId, false);
      this.connectionErrors.set(peerId, 0);
      this.lastConnectionAttempt.set(peerId, Date.now());

      // Set up ICE gathering timeout
      const iceTimeout = setTimeout(() => {
        if (!this.iceGatheringComplete.get(peerId)) {
          console.warn(`ICE gathering timeout for peer ${peerId}`);
          this.iceGatheringComplete.set(peerId, true);
        }
      }, webrtcConfig.iceGatheringTimeout || 10000);

      this.iceGatheringTimeouts.set(peerId, iceTimeout);

      return peerConnection;
    } catch (error) {
      console.error('Failed to create peer connection:', error);
      throw error;
    }
  }

  /**
   * Create a data channel for control messages
   * @param {RTCPeerConnection} peerConnection - The peer connection
   * @param {string} peerId - The peer's connection ID
   * @private
   */
  _createDataChannel(peerConnection, peerId) {
    try {
      const dataChannel = peerConnection.createDataChannel('control', {
        ordered: true,
        maxRetransmits: 3
      });

      dataChannel.onopen = () => {
        console.log(`Data channel opened with peer: ${peerId}`);
        this._emitEvent('data-channel-open', { peerId });
      };

      dataChannel.onclose = () => {
        console.log(`Data channel closed with peer: ${peerId}`);
        this._emitEvent('data-channel-close', { peerId });
      };

      dataChannel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log(`Received message from peer ${peerId}:`, message);
          this._handleDataChannelMessage(peerId, message);
        } catch (error) {
          console.error('Error handling data channel message:', error);
        }
      };

      dataChannel.onerror = (error) => {
        console.error(`Data channel error with peer ${peerId}:`, error);
        this._emitEvent('error', {
          message: 'Data channel error',
          peerId,
          error
        });
      };

      this.dataChannels.set(peerId, dataChannel);
    } catch (error) {
      console.error('Failed to create data channel:', error);
    }
  }

  /**
   * Handle a message received through the data channel
   * @param {string} peerId - The peer's connection ID
   * @param {Object} message - The message
   * @private
   */
  _handleDataChannelMessage(peerId, message) {
    switch (message.type) {
      case 'quality-change':
        this._emitEvent('quality-change-request', {
          peerId,
          quality: message.quality
        });
        break;
      case 'stats-request':
        this._sendStats(peerId);
        break;
      case 'ping':
        this._sendPong(peerId, message.timestamp);
        break;
      case 'pong':
        this._calculateRoundTripTime(peerId, message.timestamp);
        break;
      default:
        console.log(`Unknown message type from peer ${peerId}:`, message);
    }
  }

  /**
   * Send a message through the data channel
   * @param {string} peerId - The peer's connection ID
   * @param {Object} message - The message to send
   * @returns {boolean} Whether the message was sent successfully
   */
  sendMessage(peerId, message) {
    if (!this.dataChannels.has(peerId)) {
      console.error(`No data channel for peer: ${peerId}`);
      return false;
    }

    const dataChannel = this.dataChannels.get(peerId);

    if (dataChannel.readyState !== 'open') {
      console.error(`Data channel not open for peer: ${peerId}`);
      return false;
    }

    try {
      dataChannel.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  /**
   * Send connection stats to a peer
   * @param {string} peerId - The peer's connection ID
   * @private
   */
  _sendStats(peerId) {
    this.sendMessage(peerId, {
      type: 'stats',
      stats: this.stats
    });
  }

  /**
   * Register an event listener
   * @param {string} event - The event name
   * @param {Function} callback - The callback function
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }

    this.eventListeners.get(event).push(callback);
  }

  /**
   * Emit an event to all registered listeners
   * @param {string} event - The event name
   * @param {Object} data - The event data
   * @private
   */
  _emitEvent(event, data) {
    if (this.eventListeners.has(event)) {
      for (const callback of this.eventListeners.get(event)) {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      }
    }
  }

  /**
   * Shutdown all connections and clean up resources
   */
  shutdown() {
    try {
      console.log('Shutting down WebRTC connections...');

      // Clean up all peer connections properly
      for (const [peerId] of this.peerConnections.entries()) {
        this._cleanupPeerConnection(peerId);
      }

      // Clear all collections
      this.peerConnections.clear();
      this.dataChannels.clear();
      this.pendingCandidates.clear();
      this.iceGatheringComplete.clear();
      this.iceGatheringTimeouts.clear();
      this.connectionErrors.clear();
      this.lastConnectionAttempt.clear();

      // Stop stats collection
      if (this.statsInterval) {
        clearInterval(this.statsInterval);
        this.statsInterval = null;
      }

      // Stop quality monitoring
      if (this.qualityCheckInterval) {
        clearInterval(this.qualityCheckInterval);
        this.qualityCheckInterval = null;
      }

      // Disconnect from signaling server
      if (this.signaling) {
        // If we're the host, notify viewers that the stream has ended
        if (this.isHost && this.connectionId) {
          this.signaling.emit('end-stream', this.connectionId);
        }

        this.signaling.disconnect();
        this.signaling = null;
      }

      // Reset state
      this.localStream = null;
      this.connectionId = null;
      this.connectionState = 'disconnected';
      this.reconnectAttempts = 0;
      this.connectionQuality = 'unknown';

      console.log('WebRTC connections shut down successfully');
    } catch (error) {
      console.error('Error shutting down WebRTC connections:', error);
      throw error;
    }
  }

  /**
   * Send a ping message to measure round-trip time
   * @param {string} peerId - The peer's connection ID
   * @private
   */
  _sendPing(peerId) {
    this.sendMessage(peerId, {
      type: 'ping',
      timestamp: Date.now()
    });
  }

  /**
   * Start collecting connection statistics periodically
   * @private
   */
  _startStatsCollection() {
    // Clear any existing interval
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    // Collect stats every 2 seconds
    this.statsInterval = setInterval(() => {
      this._collectStats();
    }, 2000);
  }

  /**
   * Collect connection statistics from all peer connections
   * @private
   */
  _collectStats() {
    // Skip if no peer connections
    if (this.peerConnections.size === 0) return;

    // For each peer connection
    for (const [peerId, connection] of this.peerConnections.entries()) {
      // Skip if connection is closed
      if (connection.connectionState === 'closed') continue;

      // Get stats
      connection.getStats().then(stats => {
        // Process stats
        stats.forEach(report => {
          if (report.type === 'inbound-rtp') {
            // Update inbound stats
            this.stats.bytesReceived = report.bytesReceived || 0;
            this.stats.packetsReceived = report.packetsReceived || 0;
            this.stats.packetsLost = report.packetsLost || 0;
            this.stats.jitter = report.jitter || 0;
          } else if (report.type === 'outbound-rtp') {
            // Update outbound stats
            this.stats.bytesSent = report.bytesSent || 0;
            this.stats.packetsSent = report.packetsSent || 0;
          }
        });

        // Send stats to peer if we're the host
        if (this.isHost) {
          this._sendStats(peerId);
        }
      }).catch(error => {
        console.error('Error getting stats:', error);
      });
    }
  }

  /**
   * Send a pong response to a ping
   * @param {string} peerId - The peer's connection ID
   * @param {number} timestamp - The timestamp from the ping message
   * @private
   */
  _sendPong(peerId, timestamp) {
    this.sendMessage(peerId, {
      type: 'pong',
      timestamp
    });
  }

  /**
   * Calculate round-trip time from a pong response
   * @param {string} peerId - The peer's connection ID
   * @param {number} timestamp - The timestamp from the original ping
   * @private
   */
  _calculateRoundTripTime(peerId, timestamp) {
    const rtt = Date.now() - timestamp;
    this.stats.roundTripTime = rtt;
    console.log(`Round-trip time to peer ${peerId}: ${rtt}ms`);
  }

  /**
   * Disconnect from a peer
   * @param {string} peerId - The peer's connection ID
   */
  disconnectFromPeer(peerId) {
    if (!this.peerConnections.has(peerId)) return;

    try {
      console.log('Disconnecting from peer:', peerId);

      const peerConnection = this.peerConnections.get(peerId);
      peerConnection.close();

      this._cleanupPeerConnection(peerId);

      // TODO: Notify the signaling server
    } catch (error) {
      console.error('Failed to disconnect from peer:', error);
      throw error;
    }
  }

  /**
   * Handle connection issues and attempt recovery
   * @param {string} peerId - The peer's connection ID
   * @param {string} issue - The type of issue ('disconnected', 'failed', etc.)
   * @private
   */
  _handleConnectionIssue(peerId, issue) {
    console.log(`Handling connection issue for peer ${peerId}: ${issue}`);

    // Increment error count
    const errorCount = (this.connectionErrors.get(peerId) || 0) + 1;
    this.connectionErrors.set(peerId, errorCount);

    // Check if we should attempt reconnection
    const timeSinceLastAttempt = Date.now() - (this.lastConnectionAttempt.get(peerId) || 0);
    const shouldReconnect = errorCount <= 3 && timeSinceLastAttempt > 5000; // Max 3 attempts, 5s apart

    if (shouldReconnect && this.isHost) {
      console.log(`Attempting to reconnect to peer ${peerId} (attempt ${errorCount})`);
      this.lastConnectionAttempt.set(peerId, Date.now());

      // Clean up the failed connection
      this._cleanupPeerConnection(peerId);

      // Attempt reconnection after a delay
      setTimeout(() => {
        this.connectToPeer(peerId).catch(error => {
          console.error(`Reconnection attempt failed for peer ${peerId}:`, error);
        });
      }, 2000);
    } else {
      console.log(`Not attempting reconnection for peer ${peerId} (errors: ${errorCount}, time: ${timeSinceLastAttempt}ms)`);
      this._emitEvent('connection-failed', { peerId, issue, errorCount });
    }
  }

  /**
   * Clean up resources for a peer connection
   * @param {string} peerId - The peer's connection ID
   * @private
   */
  _cleanupPeerConnection(peerId) {
    console.log('Cleaning up peer connection for:', peerId);

    // Remove from peer connections map
    this.peerConnections.delete(peerId);

    // Clean up data channel
    if (this.dataChannels.has(peerId)) {
      const dataChannel = this.dataChannels.get(peerId);
      if (dataChannel.readyState === 'open') {
        dataChannel.close();
      }
      this.dataChannels.delete(peerId);
    }

    // Clean up pending candidates
    this.pendingCandidates.delete(peerId);

    // Clean up ICE gathering tracking
    this.iceGatheringComplete.delete(peerId);

    // Clear ICE gathering timeout
    const timeout = this.iceGatheringTimeouts.get(peerId);
    if (timeout) {
      clearTimeout(timeout);
      this.iceGatheringTimeouts.delete(peerId);
    }

    // Clean up error tracking
    this.connectionErrors.delete(peerId);
    this.lastConnectionAttempt.delete(peerId);
  }



  /**
   * Set up event handlers for a peer connection
   * @param {RTCPeerConnection} peerConnection - The peer connection
   * @param {string} peerId - The peer's connection ID
   * @private
   */
  _setupPeerConnectionEvents(peerConnection, peerId) {
    // ICE candidate event
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('New ICE candidate for peer:', peerId, 'type:', event.candidate.type);

        // Send the ICE candidate to the peer via the signaling server
        if (this.signaling) {
          this.signaling.emit('signal', {
            to: peerId,
            signal: event.candidate
          });
          console.log('Sent ICE candidate to peer:', peerId);
        } else {
          console.error('No signaling connection available to send ICE candidate');
        }
      } else {
        // ICE gathering complete
        console.log('ICE gathering complete for peer:', peerId);
        this.iceGatheringComplete.set(peerId, true);

        // Clear the timeout
        const timeout = this.iceGatheringTimeouts.get(peerId);
        if (timeout) {
          clearTimeout(timeout);
          this.iceGatheringTimeouts.delete(peerId);
        }
      }
    };

    // ICE connection state change event
    peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state changed for peer:', peerId, peerConnection.iceConnectionState);

      switch (peerConnection.iceConnectionState) {
        case 'connected':
        case 'completed':
          console.log('ICE connection established for peer:', peerId);
          this.connectionErrors.set(peerId, 0); // Reset error count
          break;
        case 'disconnected':
          console.warn('ICE connection disconnected for peer:', peerId);
          this._handleConnectionIssue(peerId, 'disconnected');
          break;
        case 'failed':
          console.error('ICE connection failed for peer:', peerId);
          this._handleConnectionIssue(peerId, 'failed');
          break;
        case 'closed':
          console.log('ICE connection closed for peer:', peerId);
          this._cleanupPeerConnection(peerId);
          break;
      }
    };

    // Connection state change event
    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state changed for peer:', peerId, peerConnection.connectionState);

      switch (peerConnection.connectionState) {
        case 'connected':
          console.log('Peer connection established for:', peerId);
          this._emitEvent('peer-connected', { peerId });
          break;
        case 'disconnected':
          console.warn('Peer connection disconnected for:', peerId);
          this._emitEvent('peer-disconnected', { peerId });
          break;
        case 'failed':
          console.error('Peer connection failed for:', peerId);
          this._emitEvent('peer-failed', { peerId });
          this._handleConnectionIssue(peerId, 'failed');
          break;
        case 'closed':
          console.log('Peer connection closed for:', peerId);
          this._cleanupPeerConnection(peerId);
          break;
      }
    };

    // Track event (when the peer adds a track)
    peerConnection.ontrack = (event) => {
      console.log('Received track from peer:', peerId, 'kind:', event.track.kind);

      // Emit an event with the received track
      this._emitEvent('track', {
        peerId,
        track: event.track,
        streams: event.streams
      });

      // If this is a viewer, set the remote stream
      if (!this.isHost && event.streams && event.streams.length > 0) {
        this._emitEvent('stream', {
          peerId,
          stream: event.streams[0]
        });
      }
    };

    // Data channel event (when the peer creates a data channel)
    peerConnection.ondatachannel = (event) => {
      console.log('Received data channel from peer:', peerId);
      const dataChannel = event.channel;

      dataChannel.onopen = () => {
        console.log('Data channel opened with peer:', peerId);
        this._emitEvent('data-channel-open', { peerId });
      };

      dataChannel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received message from peer:', peerId, message);
          this._handleDataChannelMessage(peerId, message);
        } catch (error) {
          console.error('Error handling data channel message:', error);
        }
      };

      this.dataChannels.set(peerId, dataChannel);
    };
  }

  /**
   * Add the local stream to a peer connection
   * @param {RTCPeerConnection} peerConnection - The peer connection
   * @param {string} peerId - The peer's connection ID
   * @private
   */
  _addStreamToPeer(peerConnection, peerId) {
    if (!this.localStream) {
      console.warn('No local stream available to add to peer:', peerId);
      return;
    }

    console.log('Adding local stream to peer:', peerId);

    // Log stream details
    const videoTracks = this.localStream.getVideoTracks();
    const audioTracks = this.localStream.getAudioTracks();
    console.log(`Stream details - Video tracks: ${videoTracks.length}, Audio tracks: ${audioTracks.length}`);

    if (videoTracks.length > 0) {
      console.log('Video track settings:', videoTracks[0].getSettings());
    }

    // Add each track from the local stream to the peer connection
    let trackCount = 0;
    this.localStream.getTracks().forEach(track => {
      try {
        peerConnection.addTrack(track, this.localStream);
        console.log(`Added ${track.kind} track to peer ${peerId}`);
        trackCount++;
      } catch (error) {
        console.error(`Failed to add ${track.kind} track to peer ${peerId}:`, error);
      }
    });

    console.log(`Added ${trackCount} tracks to peer ${peerId}`);
  }

  /**
   * Generate a random connection ID
   * @returns {string} A random connection ID
   * @private
   */
  _generateConnectionId() {
    return Math.random().toString(36).substring(2, 10);
  }

  /**
   * Handle an incoming offer from a peer
   * @param {string} peerId - The peer's connection ID
   * @param {RTCSessionDescriptionInit} offer - The offer
   * @private
   */
  async _handleOffer(peerId, offer) {
    try {
      console.log('Received offer from peer:', peerId);

      // Create a new RTCPeerConnection if it doesn't exist
      if (!this.peerConnections.has(peerId)) {
        const webrtcConfig = configManager.getWebRTCConfig();
        const peerConnection = new RTCPeerConnection(webrtcConfig);

        // Set up event handlers
        this._setupPeerConnectionEvents(peerConnection, peerId);

        // Add the local stream if available
        if (this.localStream) {
          this._addStreamToPeer(peerConnection, peerId);
        }

        this.peerConnections.set(peerId, peerConnection);
      }

      const peerConnection = this.peerConnections.get(peerId);

      // Set the remote description
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      // Create an answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Send the answer to the peer via the signaling server
      if (this.signaling) {
        this.signaling.emit('signal', {
          to: peerId,
          signal: answer
        });
        console.log('Sent answer to peer:', peerId);
      } else {
        throw new Error('No signaling connection available to send answer');
      }
    } catch (error) {
      console.error('Failed to handle offer from peer:', error);
      throw error;
    }
  }

  /**
   * Handle an incoming answer from a peer
   * @param {string} peerId - The peer's connection ID
   * @param {RTCSessionDescriptionInit} answer - The answer
   * @private
   */
  async _handleAnswer(peerId, answer) {
    try {
      console.log('Received answer from peer:', peerId);

      if (!this.peerConnections.has(peerId)) {
        throw new Error(`No peer connection for peer: ${peerId}`);
      }

      const peerConnection = this.peerConnections.get(peerId);

      // Set the remote description
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('Set remote description for peer:', peerId);

      // Apply any pending ICE candidates
      if (this.pendingCandidates.has(peerId)) {
        const candidates = this.pendingCandidates.get(peerId);
        for (const candidate of candidates) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('Applied pending ICE candidate for peer:', peerId);
        }
        this.pendingCandidates.set(peerId, []);
      }
    } catch (error) {
      console.error('Failed to handle answer from peer:', error);
      throw error;
    }
  }

  /**
   * Handle an incoming ICE candidate from a peer
   * @param {string} peerId - The peer's connection ID
   * @param {RTCIceCandidateInit} candidate - The ICE candidate
   * @private
   */
  async _handleIceCandidate(peerId, candidate) {
    try {
      console.log('Received ICE candidate from peer:', peerId);

      if (!this.peerConnections.has(peerId)) {
        // Store the candidate for later
        if (!this.pendingCandidates.has(peerId)) {
          this.pendingCandidates.set(peerId, []);
        }
        this.pendingCandidates.get(peerId).push(candidate);
        console.log('Stored pending ICE candidate for peer:', peerId);
        return;
      }

      const peerConnection = this.peerConnections.get(peerId);

      // Add the ICE candidate
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('Added ICE candidate for peer:', peerId);
    } catch (error) {
      console.error('Failed to handle ICE candidate from peer:', error);
      throw error;
    }
  }
}

module.exports = WebRTCConnection;
