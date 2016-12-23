const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const path = require('path');
const url = require('url');
const argp = require('argp');
const events = require('events');
// require('rpio');
const Reader = require('./Reader');

let reader = new Reader();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

let argv = argp.createParser({ once: true })
    .description('Custom browser to use with PiUTT.')
    .email('aurelien@labate.me')
    .body()
        .text('Option:')
        .option({ short: 'u', long: 'url', metavar: 'URL', default: 'http://localhost:8080', description: 'Target url of the browser.'})
        .option({ short: 'd', long: 'debug', description: 'Enable the debug mode : disable fullscreen and open Chromium DevTools.'})
        .help()
        .usage()
    .argv();

app.on('ready', function() {
	mainWindow = new BrowserWindow({
        useContentSize: true,
        kiosk: true,
        autoHideMenuBar: true,
        title: 'PiUTT',
        webPreferences: {
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js')
        }
    })

    // Configure the window for debug mode
    if(argv.debug) {
    	mainWindow.webContents.openDevTools({mode: 'detach'});
        mainWindow.setKiosk(false);
        mainWindow.setSize(320, 240);
    }

    // Set nfc reader events
    reader.on('newTag', (studentId) => {
        mainWindow.webContents.send('newTag', studentId);
    });
    reader.on('tagRemoved', () => {
        mainWindow.webContents.send('tagRemoved');
    });

	// Load the target URI
	mainWindow.loadURL(argv.url);
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('ping', 'Hello from browser\'s main.js !');
    })

	mainWindow.on('closed', function () {
		mainWindow = null
	})
});


// Quit when all windows are closed.
app.on('window-all-closed', function () {
		app.quit();
});
