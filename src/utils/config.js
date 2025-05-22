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
      stun: {
        servers: [
          { urls: "stun:stun.l.google.com:19302", description: "Google STUN server" }
        ]
      },
      webrtc: {
        iceCandidatePoolSize: 10,
        iceTransportPolicy: "all",
        sdpSemantics: "unified-plan"
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
   * Get STUN servers configuration
   * @returns {Array} Array of STUN server configurations
   */
  getStunServers() {
    const config = this.loadConfig();
    return config.stun.servers.map(server => ({ urls: server.urls }));
  }

  /**
   * Get WebRTC configuration
   * @returns {Object} WebRTC configuration object
   */
  getWebRTCConfig() {
    const config = this.loadConfig();
    return {
      iceServers: this.getStunServers(),
      ...config.webrtc
    };
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
