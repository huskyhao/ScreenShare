/**
 * WebRTC Connection Module
 * 
 * This module handles P2P connections using WebRTC for low-latency streaming.
 */

class WebRTCConnection {
  constructor() {
    this.peerConnections = new Map(); // Map of peer ID to RTCPeerConnection
    this.localStream = null;
    this.signaling = null; // Will hold the signaling server connection
    this.connectionId = null;
  }

  /**
   * Initialize the WebRTC connection
   * @returns {Promise<string>} Connection ID for sharing
   */
  async initialize() {
    try {
      console.log('Initializing WebRTC connection...');
      
      // Generate a random connection ID
      this.connectionId = this._generateConnectionId();
      
      // TODO: Connect to signaling server
      // This would involve setting up a WebSocket connection to a signaling server
      // For now, we'll just simulate it
      
      console.log('WebRTC connection initialized with ID:', this.connectionId);
      return this.connectionId;
    } catch (error) {
      console.error('Failed to initialize WebRTC connection:', error);
      throw error;
    }
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
      
      // Create a new RTCPeerConnection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
      // Set up event handlers
      this._setupPeerConnectionEvents(peerConnection, peerId);
      
      // Add the local stream if available
      if (this.localStream) {
        this._addStreamToPeer(peerConnection, peerId);
      }
      
      // Create and send an offer
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await peerConnection.setLocalDescription(offer);
      
      // TODO: Send the offer to the peer via the signaling server
      console.log('Sending offer to peer:', peerId);
      
      // Store the connection
      this.peerConnections.set(peerId, peerConnection);
      
      return peerConnection;
    } catch (error) {
      console.error('Failed to connect to peer:', error);
      throw error;
    }
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
      
      this.peerConnections.delete(peerId);
      
      // TODO: Notify the signaling server
    } catch (error) {
      console.error('Failed to disconnect from peer:', error);
      throw error;
    }
  }

  /**
   * Disconnect from all peers and clean up resources
   */
  shutdown() {
    try {
      console.log('Shutting down WebRTC connections...');
      
      // Close all peer connections
      for (const [peerId, connection] of this.peerConnections.entries()) {
        connection.close();
      }
      
      this.peerConnections.clear();
      
      // Close the signaling connection
      if (this.signaling) {
        // TODO: Close the signaling connection
      }
      
      this.localStream = null;
      this.connectionId = null;
    } catch (error) {
      console.error('Failed to shut down WebRTC connections:', error);
      throw error;
    }
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
        console.log('New ICE candidate for peer:', peerId);
        // TODO: Send the ICE candidate to the peer via the signaling server
      }
    };
    
    // Connection state change event
    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state changed for peer:', peerId, peerConnection.connectionState);
      
      if (peerConnection.connectionState === 'disconnected' || 
          peerConnection.connectionState === 'failed' ||
          peerConnection.connectionState === 'closed') {
        this.peerConnections.delete(peerId);
      }
    };
    
    // Track event (when the peer adds a track)
    peerConnection.ontrack = (event) => {
      console.log('Received track from peer:', peerId);
      // TODO: Handle the received track (e.g., display the video)
    };
  }

  /**
   * Add the local stream to a peer connection
   * @param {RTCPeerConnection} peerConnection - The peer connection
   * @param {string} peerId - The peer's connection ID
   * @private
   */
  _addStreamToPeer(peerConnection, peerId) {
    if (!this.localStream) return;
    
    console.log('Adding local stream to peer:', peerId);
    
    // Add each track from the local stream to the peer connection
    this.localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, this.localStream);
    });
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
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
        
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
      
      // TODO: Send the answer to the peer via the signaling server
      console.log('Sending answer to peer:', peerId);
    } catch (error) {
      console.error('Failed to handle offer from peer:', error);
      throw error;
    }
  }
}

module.exports = new WebRTCConnection();
