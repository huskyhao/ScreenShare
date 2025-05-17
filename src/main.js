const { app, BrowserWindow, ipcMain, Menu, desktopCapturer } = require('electron');
const path = require('path');
const url = require('url');
const logger = require('./utils/logger').getComponentLogger('main');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;
// Keep a reference to the signaling server
let signalingServer;

// Development mode flag
const isDev = process.argv.includes('--dev');

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false, // Required for screen capture
    },
    title: 'ScreenShare',
    icon: path.join(__dirname, '../public/icon.png'),
  });

  // Set permissions for media access
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true); // Allow media access
    } else {
      callback(false);
    }
  });

  // Load the index.html file
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, '../public/index.html'),
      protocol: 'file:',
      slashes: true,
    })
  );

  // Open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close event
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Start the signaling server
async function startSignalingServer() {
  // Create Express app and HTTP server
  const app = express();
  const server = http.createServer(app);
  const io = socketIo(server);

  // Serve static files from the public directory
  app.use(express.static(path.join(__dirname, '../public')));

  // Serve the viewer page
  app.get('/viewer', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/viewer.html'));
  });

  // Store active connections
  const connections = new Map();

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    logger.info('New client connected:', socket.id);

    // Handle stream creation
    socket.on('create-stream', (streamId) => {
      logger.info(`Client ${socket.id} creating stream with ID: ${streamId || 'auto-generated'}`);

      // If no streamId is provided, generate one
      if (!streamId) {
        streamId = uuidv4();
        logger.info(`Generated new stream ID: ${streamId}`);
      }

      // Check if this stream ID already exists
      if (connections.has(streamId)) {
        const existingConnection = connections.get(streamId);

        // If the same host is reconnecting, allow it
        if (existingConnection.hostSocketId === socket.id) {
          logger.info(`Host ${socket.id} is reconnecting to existing stream: ${streamId}`);
        }
        // If a different host is trying to use the same ID, generate a new one
        else {
          const newStreamId = uuidv4();
          logger.info(`Stream ID ${streamId} already exists with different host. Generated new ID: ${newStreamId}`);
          streamId = newStreamId;
        }
      }

      // Store the connection
      connections.set(streamId, {
        hostSocketId: socket.id,
        viewers: new Set(),
        createdAt: new Date().toISOString()
      });

      // Join the stream room
      socket.join(streamId);

      // Send the stream ID to the host
      socket.emit('stream-created', streamId);

      logger.info(`Stream created: ${streamId}. Total active streams: ${connections.size}`);

      // Log all active streams for debugging
      if (connections.size > 0) {
        logger.info('Active streams:');
        for (const [id, conn] of connections.entries()) {
          logger.info(`- Stream ID: ${id}, Host: ${conn.hostSocketId}, Viewers: ${conn.viewers.size}, Created: ${conn.createdAt}`);
        }
      }
    });

    // Handle stream joining
    socket.on('join-stream', (streamId) => {
      logger.info(`Client ${socket.id} attempting to join stream: ${streamId}`);

      // Check if the streamId is valid
      if (!streamId) {
        logger.error(`Client ${socket.id} tried to join with invalid streamId`);
        socket.emit('error', { message: 'Invalid stream ID' });
        return;
      }

      const connection = connections.get(streamId);

      if (!connection) {
        logger.error(`Stream not found: ${streamId}. Available streams: ${Array.from(connections.keys()).join(', ') || 'none'}`);
        socket.emit('error', { message: 'Stream not found' });
        return;
      }

      // Check if the host is still connected
      if (!io.sockets.sockets.has(connection.hostSocketId)) {
        logger.error(`Host ${connection.hostSocketId} for stream ${streamId} is no longer connected`);
        socket.emit('error', { message: 'Stream host is disconnected' });
        // Clean up the orphaned stream
        connections.delete(streamId);
        return;
      }

      // Add the viewer to the connection
      connection.viewers.add(socket.id);

      // Join the stream room
      socket.join(streamId);

      // Notify the viewer that they've joined
      socket.emit('joined-stream', {
        streamId,
        hostSocketId: connection.hostSocketId
      });

      // Notify the host
      io.to(connection.hostSocketId).emit('viewer-joined', {
        viewerId: socket.id,
        streamId,
      });

      logger.info(`Viewer ${socket.id} joined stream: ${streamId}. Total viewers: ${connection.viewers.size}`);
    });

    // Handle WebRTC signaling
    socket.on('signal', ({ to, signal }) => {
      io.to(to).emit('signal', {
        from: socket.id,
        signal,
      });
    });

    // Handle stream ending
    socket.on('end-stream', (streamId) => {
      const connection = connections.get(streamId);

      if (connection && connection.hostSocketId === socket.id) {
        // Notify all viewers
        io.to(streamId).emit('stream-ended');

        // Remove the connection
        connections.delete(streamId);

        logger.info('Stream ended:', streamId);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info('Client disconnected:', socket.id);

      // Check if the client was a host
      for (const [streamId, connection] of connections.entries()) {
        if (connection.hostSocketId === socket.id) {
          // Notify all viewers
          io.to(streamId).emit('stream-ended');

          // Remove the connection
          connections.delete(streamId);

          logger.info('Stream ended due to host disconnection:', streamId);
        } else if (connection.viewers.has(socket.id)) {
          // Remove the viewer from the connection
          connection.viewers.delete(socket.id);

          // Notify the host
          io.to(connection.hostSocketId).emit('viewer-left', {
            viewerId: socket.id,
            streamId,
          });

          logger.info('Viewer left stream:', streamId);
        }
      }
    });
  });

  // Start the server with port finding
  const findAvailablePort = (startPort) => {
    return new Promise((resolve, reject) => {
      const tryPort = (port) => {
        const testServer = http.createServer();
        testServer.once('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            logger.info(`Port ${port} in use, trying ${port + 1}`);
            tryPort(port + 1);
          } else {
            reject(err);
          }
        });
        testServer.once('listening', () => {
          testServer.close(() => {
            resolve(port);
          });
        });
        testServer.listen(port);
      };
      tryPort(startPort);
    });
  };

  // Find an available port starting from 3000
  try {
    const PORT = await findAvailablePort(3000);
    server.listen(PORT, () => {
      logger.info(`Signaling server running on port ${PORT}`);
      // Store the port globally so renderer can access it
      global.signalingServerPort = PORT;
    });
  } catch (error) {
    logger.error('Failed to start signaling server:', error);
    throw error;
  }

  return server;
}

// Create window when Electron has finished initialization
app.on('ready', async () => {
  try {
    // Start the signaling server
    signalingServer = await startSignalingServer();
    logger.info('Signaling server started successfully');

    // Create the main window
    createWindow();
  } catch (error) {
    logger.error('Failed to start application:', error);
    app.quit();
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, applications keep running until the user quits explicitly
  if (process.platform !== 'darwin') {
    // Close the signaling server if it exists
    if (signalingServer) {
      signalingServer.close(() => {
        logger.info('Signaling server closed');
      });
    }
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create a window when the dock icon is clicked and no other windows are open
  if (mainWindow === null) {
    createWindow();
  }
});

// Clean up before quitting
app.on('before-quit', () => {
  // Close the signaling server if it exists
  if (signalingServer) {
    signalingServer.close(() => {
      logger.info('Signaling server closed');
    });
  }
});

// IPC handlers for communication between main and renderer processes
// These will be implemented as we develop the application features

// Handle screen capture requests
ipcMain.on('start-capture', async (event, options) => {
  logger.info('Screen capture requested with options:', options);

  try {
    // Get available sources
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 0, height: 0 }
    });

    // Send the sources back to the renderer process
    event.reply('capture-sources', sources);
    logger.info(`Found ${sources.length} capture sources`);
  } catch (error) {
    logger.error('Error getting capture sources:', error);
    event.reply('capture-error', { message: error.message });
  }
});

// Handle source selection
ipcMain.on('select-source', (event, sourceId) => {
  logger.info('Source selected:', sourceId);
  event.reply('source-selected', sourceId);
});

// Handle P2P connection requests
ipcMain.on('start-streaming', (event, peerInfo) => {
  // TODO: Implement WebRTC P2P connection
  console.log('Streaming requested to peer:', peerInfo);
});

// Handle audio capture requests
ipcMain.on('toggle-audio', (event, { systemAudio, microphone }) => {
  logger.info('Audio capture toggled:', { systemAudio, microphone });
  event.reply('audio-toggle-result', { success: true, systemAudio, microphone });
});

// Handle audio device enumeration
ipcMain.on('get-audio-devices', async (event) => {
  logger.info('Audio devices requested');

  try {
    // This will be handled in the renderer process using navigator.mediaDevices.enumerateDevices()
    // We just acknowledge the request here
    event.reply('audio-devices-result', { success: true });
  } catch (error) {
    logger.error('Error getting audio devices:', error);
    event.reply('audio-devices-result', { success: false, error: error.message });
  }
});

// Handle audio volume change
ipcMain.on('set-audio-volume', (event, { source, volume }) => {
  logger.info(`Setting ${source} volume to ${volume}`);
  event.reply('audio-volume-result', { success: true, source, volume });
});

// Handle audio mute toggle
ipcMain.on('toggle-audio-mute', (event, { source, mute }) => {
  logger.info(`${mute ? 'Muting' : 'Unmuting'} ${source} audio`);
  event.reply('audio-mute-result', { success: true, source, mute });
});

// Handle request for signaling server port
ipcMain.on('get-signaling-server-port', (event) => {
  logger.info('Renderer requested signaling server port');
  event.reply('signaling-server-port', global.signalingServerPort);
});
