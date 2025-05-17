/**
 * Signaling Server for WebRTC connections
 *
 * This server facilitates the exchange of WebRTC signaling information
 * between peers to establish P2P connections.
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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
  console.log('New client connected:', socket.id);

  // Handle stream creation
  socket.on('create-stream', (streamId) => {
    console.log(`Client ${socket.id} creating stream with ID: ${streamId || 'auto-generated'}`);

    // If no streamId is provided, generate one
    if (!streamId) {
      streamId = uuidv4();
      console.log(`Generated new stream ID: ${streamId}`);
    }

    // Check if this stream ID already exists
    if (connections.has(streamId)) {
      const existingConnection = connections.get(streamId);

      // If the same host is reconnecting, allow it
      if (existingConnection.hostSocketId === socket.id) {
        console.log(`Host ${socket.id} is reconnecting to existing stream: ${streamId}`);
      }
      // If a different host is trying to use the same ID, generate a new one
      else {
        const newStreamId = uuidv4();
        console.log(`Stream ID ${streamId} already exists with different host. Generated new ID: ${newStreamId}`);
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

    console.log(`Stream created: ${streamId}. Total active streams: ${connections.size}`);

    // Log all active streams for debugging
    if (connections.size > 0) {
      console.log('Active streams:');
      for (const [id, conn] of connections.entries()) {
        console.log(`- Stream ID: ${id}, Host: ${conn.hostSocketId}, Viewers: ${conn.viewers.size}, Created: ${conn.createdAt}`);
      }
    }
  });

  // Handle stream joining
  socket.on('join-stream', (streamId) => {
    console.log(`Client ${socket.id} attempting to join stream: ${streamId}`);

    // Check if the streamId is valid
    if (!streamId) {
      console.error(`Client ${socket.id} tried to join with invalid streamId`);
      socket.emit('error', { message: 'Invalid stream ID' });
      return;
    }

    const connection = connections.get(streamId);

    if (!connection) {
      console.error(`Stream not found: ${streamId}. Available streams: ${Array.from(connections.keys()).join(', ') || 'none'}`);
      socket.emit('error', { message: 'Stream not found' });
      return;
    }

    // Check if the host is still connected
    if (!io.sockets.sockets.has(connection.hostSocketId)) {
      console.error(`Host ${connection.hostSocketId} for stream ${streamId} is no longer connected`);
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

    console.log(`Viewer ${socket.id} joined stream: ${streamId}. Total viewers: ${connection.viewers.size}`);
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

      console.log('Stream ended:', streamId);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // Check if the client was a host
    for (const [streamId, connection] of connections.entries()) {
      if (connection.hostSocketId === socket.id) {
        // Notify all viewers
        io.to(streamId).emit('stream-ended');

        // Remove the connection
        connections.delete(streamId);

        console.log('Stream ended due to host disconnection:', streamId);
      } else if (connection.viewers.has(socket.id)) {
        // Remove the viewer from the connection
        connection.viewers.delete(socket.id);

        // Notify the host
        io.to(connection.hostSocketId).emit('viewer-left', {
          viewerId: socket.id,
          streamId,
        });

        console.log('Viewer left stream:', streamId);
      }
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
