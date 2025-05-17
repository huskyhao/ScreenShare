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
    // If no streamId is provided, generate one
    if (!streamId) {
      streamId = uuidv4();
    }

    // Store the connection
    connections.set(streamId, {
      hostSocketId: socket.id,
      viewers: new Set(),
    });

    // Join the stream room
    socket.join(streamId);

    // Send the stream ID to the host
    socket.emit('stream-created', streamId);

    console.log('Stream created:', streamId);
  });

  // Handle stream joining
  socket.on('join-stream', (streamId) => {
    const connection = connections.get(streamId);

    if (!connection) {
      socket.emit('error', { message: 'Stream not found' });
      return;
    }

    // Add the viewer to the connection
    connection.viewers.add(socket.id);

    // Join the stream room
    socket.join(streamId);

    // Notify the viewer that they've joined
    socket.emit('joined-stream', streamId);

    // Notify the host
    io.to(connection.hostSocketId).emit('viewer-joined', {
      viewerId: socket.id,
      streamId,
    });

    console.log('Viewer joined stream:', streamId);
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
