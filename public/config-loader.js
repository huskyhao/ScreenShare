/**
 * Configuration Loader for Browser Environment
 * 
 * This module loads configuration for browser-based components
 * since they cannot directly access Node.js modules.
 */

class BrowserConfigManager {
  constructor() {
    this.config = null;
  }

  /**
   * Load configuration from server
   * @returns {Promise<Object>} Configuration object
   */
  async loadConfig() {
    try {
      if (!this.config) {
        const response = await fetch('/config');
        if (!response.ok) {
          throw new Error(`Failed to load config: ${response.status}`);
        }
        this.config = await response.json();
        console.log('Configuration loaded successfully');
      }
      return this.config;
    } catch (error) {
      console.error('Failed to load configuration:', error.message);
      // Return default configuration if loading fails
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
   * @returns {Promise<string>} Complete signaling server URL
   */
  async getSignalingServerUrl() {
    const config = await this.loadConfig();
    const { protocol, host, port } = config.signaling;
    return `${protocol}://${host}:${port}`;
  }

  /**
   * Get STUN servers configuration
   * @returns {Promise<Array>} Array of STUN server configurations
   */
  async getStunServers() {
    const config = await this.loadConfig();
    return config.stun.servers.map(server => ({ urls: server.urls }));
  }

  /**
   * Get WebRTC configuration
   * @returns {Promise<Object>} WebRTC configuration object
   */
  async getWebRTCConfig() {
    const config = await this.loadConfig();
    const stunServers = await this.getStunServers();
    return {
      iceServers: stunServers,
      ...config.webrtc
    };
  }
}

// Export for browser use
window.BrowserConfigManager = BrowserConfigManager;
