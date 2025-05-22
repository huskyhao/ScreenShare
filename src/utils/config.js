/**
 * Configuration Management Module
 *
 * This module handles loading and managing application configuration
 * from the config/server.json file.
 */

const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor() {
    this.config = null;
    this.configPath = path.join(__dirname, '../../config/server.json');
  }

  /**
   * Load configuration from file
   * @returns {Object} Configuration object
   */
  loadConfig() {
    try {
      if (!this.config) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(configData);
        console.log('Configuration loaded successfully');
      }
      return this.config;
    } catch (error) {
      console.error('Failed to load configuration:', error.message);
      // Return default configuration if file loading fails
      return this.getDefaultConfig();
    }
  }

  /**
   * Get default configuration
   * @returns {Object} Default configuration object
   */
  getDefaultConfig() {
    return {
      signaling: {
        host: "localhost",
        port: 3000,
        protocol: "http"
      },
      ice: {
        servers: [
          { urls: "stun:stun.l.google.com:19302", description: "Google STUN server (primary)" },
          { urls: "stun:stun.cloudflare.com:3478", description: "Cloudflare STUN server (reliable)" }
        ]
      },
      webrtc: {
        iceCandidatePoolSize: 15,
        iceTransportPolicy: "all",
        sdpSemantics: "unified-plan",
        iceGatheringTimeout: 10000,
        iceConnectionTimeout: 30000,
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require"
      },
      connection: {
        maxReconnectAttempts: 10,
        reconnectInterval: 2000,
        connectionTimeout: 15000,
        keepAliveInterval: 30000,
        qualityCheckInterval: 5000
      }
    };
  }

  /**
   * Get signaling server URL
   * @returns {string} Complete signaling server URL
   */
  getSignalingServerUrl() {
    const config = this.loadConfig();
    const { protocol, host, port } = config.signaling;
    return `${protocol}://${host}:${port}`;
  }

  /**
   * Get ICE servers configuration (STUN and TURN)
   * @returns {Array} Array of ICE server configurations
   */
  getIceServers() {
    const config = this.loadConfig();
    return config.ice.servers.map(server => {
      const iceServer = { urls: server.urls };
      if (server.username) iceServer.username = server.username;
      if (server.credential) iceServer.credential = server.credential;
      return iceServer;
    });
  }

  /**
   * Get STUN servers configuration (backward compatibility)
   * @returns {Array} Array of STUN server configurations
   */
  getStunServers() {
    return this.getIceServers().filter(server =>
      Array.isArray(server.urls)
        ? server.urls.some(url => url.startsWith('stun:'))
        : server.urls.startsWith('stun:')
    );
  }

  /**
   * Get WebRTC configuration
   * @returns {Object} WebRTC configuration object
   */
  getWebRTCConfig() {
    const config = this.loadConfig();
    return {
      iceServers: this.getIceServers(),
      ...config.webrtc
    };
  }

  /**
   * Get connection configuration
   * @returns {Object} Connection configuration object
   */
  getConnectionConfig() {
    const config = this.loadConfig();
    return config.connection || this.getDefaultConfig().connection;
  }

  /**
   * Update configuration file
   * @param {Object} newConfig - New configuration object
   */
  updateConfig(newConfig) {
    try {
      const configData = JSON.stringify(newConfig, null, 2);
      fs.writeFileSync(this.configPath, configData, 'utf8');
      this.config = newConfig;
      console.log('Configuration updated successfully');
    } catch (error) {
      console.error('Failed to update configuration:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new ConfigManager();
