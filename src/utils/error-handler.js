/**
 * Error Handler Module
 * 
 * This module provides centralized error handling for the application.
 */

const logger = require('./logger');

// Application error class
class AppError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code || 'INTERNAL_ERROR';
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Network error class
class NetworkError extends AppError {
  constructor(message, details = {}) {
    super(message, 'NETWORK_ERROR', details);
  }
}

// Capture error class
class CaptureError extends AppError {
  constructor(message, details = {}) {
    super(message, 'CAPTURE_ERROR', details);
  }
}

// Connection error class
class ConnectionError extends AppError {
  constructor(message, details = {}) {
    super(message, 'CONNECTION_ERROR', details);
  }
}

// Global error handler
const handleError = (error, component = 'general') => {
  const componentLogger = logger.getComponentLogger(component);
  
  if (error instanceof AppError) {
    componentLogger.error(`${error.code}: ${error.message}`, {
      code: error.code,
      details: error.details,
      stack: error.stack
    });
  } else {
    componentLogger.error(`Unhandled error: ${error.message}`, {
      stack: error.stack
    });
  }
  
  // Return a formatted error object that can be used in the UI
  return {
    message: error.message,
    code: error instanceof AppError ? error.code : 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString()
  };
};

// Async error wrapper for cleaner try/catch blocks
const asyncErrorHandler = (fn) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      return handleError(error, fn.name);
    }
  };
};

module.exports = {
  AppError,
  NetworkError,
  CaptureError,
  ConnectionError,
  handleError,
  asyncErrorHandler
};
