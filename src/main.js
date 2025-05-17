const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const url = require('url');

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
    },
    title: 'ScreenShare',
    icon: path.join(__dirname, '../public/icon.png'),
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
ipcMain.on('start-capture', (event, options) => {
  // TODO: Implement OBS integration for screen capture
  console.log('Screen capture requested with options:', options);
});

// Handle P2P connection requests
ipcMain.on('start-streaming', (event, peerInfo) => {
  // TODO: Implement WebRTC P2P connection
  console.log('Streaming requested to peer:', peerInfo);
});

// Handle audio capture requests
ipcMain.on('toggle-audio', (event, { systemAudio, microphone }) => {
  // TODO: Implement audio capture
  console.log('Audio capture toggled:', { systemAudio, microphone });
});
