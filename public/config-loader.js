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
   * @returns {Promise<string>} Complete signaling server URL
   */
  async getSignalingServerUrl() {
    const config = await this.loadConfig();
    const { protocol, host, port } = config.signaling;
    return `${protocol}://${host}:${port}`;
  }

  /**
   * Get ICE servers configuration (STUN and TURN)
   * @returns {Promise<Array>} Array of ICE server configurations
   */
  async getIceServers() {
    const config = await this.loadConfig();
    return config.ice.servers.map(server => {
      const iceServer = { urls: server.urls };
      if (server.username) iceServer.username = server.username;
      if (server.credential) iceServer.credential = server.credential;
      return iceServer;
    });
  }

  /**
   * Get STUN servers configuration (backward compatibility)
   * @returns {Promise<Array>} Array of STUN server configurations
   */
  async getStunServers() {
    const iceServers = await this.getIceServers();
    return iceServers.filter(server =>
      Array.isArray(server.urls)
        ? server.urls.some(url => url.startsWith('stun:'))
        : server.urls.startsWith('stun:')
    );
  }

  /**
   * Get WebRTC configuration
   * @returns {Promise<Object>} WebRTC configuration object
   */
  async getWebRTCConfig() {
    const config = await this.loadConfig();
    const iceServers = await this.getIceServers();
    return {
      iceServers: iceServers,
      ...config.webrtc
    };
  }

  /**
   * Get connection configuration
   * @returns {Promise<Object>} Connection configuration object
   */
  async getConnectionConfig() {
    const config = await this.loadConfig();
    return config.connection || this.getDefaultConfig().connection;
  }
}

// Export for browser use
window.BrowserConfigManager = BrowserConfigManager;
