const { app, BrowserWindow, ipcMain, Menu, desktopCapturer } = require('electron');
const path = require('path');
const url = require('url');
const logger = require('./utils/logger').getComponentLogger('main');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

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

// Create window when Electron has finished initialization
app.on('ready', createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, applications keep running until the user quits explicitly
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create a window when the dock icon is clicked and no other windows are open
  if (mainWindow === null) {
    createWindow();
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
