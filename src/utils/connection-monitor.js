/**
 * Connection Monitor Module
 * 
 * This module monitors WebRTC connection quality and provides statistics.
 */

const logger = require('./logger');
const { ConnectionError } = require('./error-handler');

class ConnectionMonitor {
  constructor() {
    this.connections = new Map(); // Map of connection ID to connection stats
    this.monitoringInterval = null;
    this.monitoringFrequency = 2000; // 2 seconds
    this.logger = logger.getComponentLogger('ConnectionMonitor');
    this.eventListeners = new Map();
  }

  /**
   * Start monitoring a WebRTC connection
   * @param {string} connectionId - The connection ID
   * @param {RTCPeerConnection} peerConnection - The peer connection to monitor
   */
  startMonitoring(connectionId, peerConnection) {
    if (!peerConnection) {
      throw new ConnectionError('Cannot monitor null connection', { connectionId });
    }

    this.logger.info(`Starting to monitor connection: ${connectionId}`);
    
    // Initialize connection stats
    this.connections.set(connectionId, {
      id: connectionId,
      state: peerConnection.connectionState || peerConnection.iceConnectionState,
      lastUpdated: Date.now(),
      stats: {
        bytesReceived: 0,
        bytesSent: 0,
        packetsReceived: 0,
        packetsSent: 0,
        packetsLost: 0,
        roundTripTime: 0,
        jitter: 0,
        frameRate: 0,
        resolution: { width: 0, height: 0 },
        bandwidth: { upload: 0, download: 0 }
      },
      history: []
    });

    // Start monitoring if not already started
    if (!this.monitoringInterval) {
      this.monitoringInterval = setInterval(() => {
        this._collectStats();
      }, this.monitoringFrequency);
    }
  }

  /**
   * Stop monitoring a connection
   * @param {string} connectionId - The connection ID
   */
  stopMonitoring(connectionId) {
    if (this.connections.has(connectionId)) {
      this.logger.info(`Stopping monitoring for connection: ${connectionId}`);
      this.connections.delete(connectionId);
    }

    // Stop the monitoring interval if no connections are being monitored
    if (this.connections.size === 0 && this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Update connection state
   * @param {string} connectionId - The connection ID
   * @param {string} state - The new connection state
   */
  updateConnectionState(connectionId, state) {
    if (this.connections.has(connectionId)) {
      const connection = this.connections.get(connectionId);
      const previousState = connection.state;
      
      connection.state = state;
      connection.lastUpdated = Date.now();
      
      this.logger.info(`Connection ${connectionId} state changed: ${previousState} -> ${state}`);
      
      // Emit state change event
      this._emitEvent('connectionStateChange', {
        connectionId,
        previousState,
        currentState: state
      });
      
      // Check for problematic states
      if (['disconnected', 'failed', 'closed'].includes(state)) {
        this._emitEvent('connectionProblem', {
          connectionId,
          state,
          message: `Connection ${connectionId} is in ${state} state`
        });
      }
    }
  }

  /**
   * Get current stats for a connection
   * @param {string} connectionId - The connection ID
   * @returns {Object|null} The connection stats or null if not found
   */
  getConnectionStats(connectionId) {
    return this.connections.has(connectionId) 
      ? { ...this.connections.get(connectionId) }
      : null;
  }

  /**
   * Get all connection stats
   * @returns {Array} Array of connection stats
   */
  getAllConnectionStats() {
    return Array.from(this.connections.values()).map(conn => ({ ...conn }));
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
   * Remove an event listener
   * @param {string} event - The event name
   * @param {Function} callback - The callback function to remove
   */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Collect stats from all monitored connections
   * @private
   */
  async _collectStats() {
    for (const [connectionId, connection] of this.connections.entries()) {
      try {
        const peerConnection = this._getPeerConnection(connectionId);
        
        if (!peerConnection) {
          this.logger.warn(`Cannot collect stats for connection ${connectionId}: Connection not found`);
          continue;
        }
        
        // Get stats from the peer connection
        const stats = await peerConnection.getStats();
        
        // Process the stats
        this._processStats(connectionId, stats);
      } catch (error) {
        this.logger.error(`Error collecting stats for connection ${connectionId}:`, error);
      }
    }
  }

  /**
   * Process WebRTC stats
   * @param {string} connectionId - The connection ID
   * @param {RTCStatsReport} statsReport - The stats report
   * @private
   */
  _processStats(connectionId, statsReport) {
    // This is a placeholder implementation
    // In a real implementation, we would process the stats from the RTCStatsReport
    
    // For now, just update the timestamp
    if (this.connections.has(connectionId)) {
      this.connections.get(connectionId).lastUpdated = Date.now();
    }
  }

  /**
   * Get the peer connection for a connection ID
   * @param {string} connectionId - The connection ID
   * @returns {RTCPeerConnection|null} The peer connection or null if not found
   * @private
   */
  _getPeerConnection(connectionId) {
    // This method would be implemented by the WebRTC connection module
    // For now, return null as a placeholder
    return null;
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
          this.logger.error(`Error in event listener for ${event}:`, error);
        }
      }
    }
  }
}

module.exports = new ConnectionMonitor();
