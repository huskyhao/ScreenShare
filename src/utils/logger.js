/**
 * Simple Logger Module
 *
 * This module provides a basic logging system for the application
 * using console.log with timestamps.
 */

const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }
} catch (error) {
  console.error('Failed to create logs directory:', error);
}

// Helper function to get timestamp
const getTimestamp = () => {
  const now = new Date();
  return now.toISOString();
};

// Simple logger implementation
const logger = {
  debug: (message, meta = {}) => {
    console.log(`[${getTimestamp()}] DEBUG: ${message}`, meta);
  },

  info: (message, meta = {}) => {
    console.log(`[${getTimestamp()}] INFO: ${message}`, meta);
  },

  warn: (message, meta = {}) => {
    console.warn(`[${getTimestamp()}] WARN: ${message}`, meta);
  },

  error: (message, meta = {}) => {
    console.error(`[${getTimestamp()}] ERROR: ${message}`, meta);
    if (meta.stack) {
      console.error(meta.stack);
    }
  },

  // Create a stream object for HTTP request logging
  stream: {
    write: (message) => {
      console.log(`[${getTimestamp()}] HTTP: ${message.trim()}`);
    }
  },

  // Add helper methods for component-specific logging
  getComponentLogger: (component) => {
    return {
      debug: (message, meta = {}) => logger.debug(`[${component}] ${message}`, meta),
      info: (message, meta = {}) => logger.info(`[${component}] ${message}`, meta),
      warn: (message, meta = {}) => logger.warn(`[${component}] ${message}`, meta),
      error: (message, meta = {}) => logger.error(`[${component}] ${message}`, meta),
    };
  }
};

// Export the logger
module.exports = logger;
