// Modules to control application life and create native browser window
const {app, BrowserWindow, BrowserView, Menu, screen} = require('electron')
const path = require('path')
const StreamlitServer = require('./python_environment').StreamlitServer
const portfinder = require('portfinder');
const { DEFAULT_APP_CONTENTS, SERVER_FILE_PATH } = require('./consts');
const fs = require('fs');

const isMac = process.platform === 'darwin'

const menuClick = (menuItem, browserWindow, event) => {
  browserWindow.getBrowserViews()[0].webContents.send("menuItemClick", menuItem.label)
}
const template = [
  // { role: 'appMenu' }
  ...(isMac ? [{
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  }] : []),
  // { role: 'fileMenu' }
  {
    label: 'File',
    submenu: [
      isMac ? { role: 'close' } : { role: 'quit' }
    ]
  },
  {
    label: 'Load example',
    submenu: [
      {
        label: 'Basic',
        click: menuClick,
      },
      {
        label: 'Plot',
        click: menuClick,
      },
      {
        label: "Complex",
        click: menuClick,
      },
      {
        label: "Snowpark",
        click: menuClick
      }
    ]
  },
  // { role: 'editMenu' }
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...(isMac ? [
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Speech',
          submenu: [
            { role: 'startSpeaking' },
            { role: 'stopSpeaking' }
          ]
        }
      ] : [
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ])
    ]
  },
  // { role: 'viewMenu' }
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  // { role: 'windowMenu' }
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      ...(isMac ? [
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ] : [
        { role: 'close' }
      ])
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click: async () => {
          const { shell } = require('electron')
          await shell.openExternal('https://electronjs.org')
        }
      }
    ]
  }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)

const TOP = 30;
const TOTAL_WIDTH = 1500;
const TOTAL_HEIGHT = 1000;
const LEFT_WIDTH = TOTAL_WIDTH / 2;
const RIGHT_WIDTH = TOTAL_WIDTH - LEFT_WIDTH;
const LEFT_DEBUGGER = false
const RIGHT_DEBUGGER = false

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: TOTAL_WIDTH,
    height: TOTAL_HEIGHT,
    title: "Streamlit Desktop",
    icon: 'icon.png'
  });




  const leftView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration:  true, // SHOULD FIGURE OUT HOW TO REMOVE THESE SECURITY HOLES EVENTUALLY
      contextIsolation: false
    }
  })

  mainWindow.addBrowserView(leftView)

  leftView.setBounds({ x: 0, y: TOP, width: LEFT_WIDTH, height: TOTAL_HEIGHT - TOP })

  leftView.webContents.loadFile('index.html')

  const rightView = new BrowserView({
    webPreferences: {}
  })

  mainWindow.addBrowserView(rightView)

  rightView.setBounds({ x: LEFT_WIDTH, y: TOP, width: RIGHT_WIDTH, height: TOTAL_HEIGHT - TOP })
  rightView.webContents.loadFile('loading.html')

  if (LEFT_DEBUGGER) leftView.webContents.openDevTools();
  if (RIGHT_DEBUGGER) rightView.webContents.openDevTools();

  return [leftView, rightView, mainWindow];
}

let streamlit_server = null;

const setWindowSizes = (leftView, rightView, mainWindow) => {
  var mainScreen = screen.getPrimaryDisplay();
  var dimensions = mainScreen.size;

  let MONITOR_WIDTH = dimensions.width;
  let MONITOR_HEIGHT = dimensions.height;

  let WINDOW_HEIGHT = parseInt(MONITOR_HEIGHT * 0.9);
  let WINDOW_WIDTH = parseInt(MONITOR_WIDTH * 0.9);
  let WINDOW_START = parseInt((MONITOR_WIDTH - WINDOW_WIDTH) / 2);

  let HALF_WIDTH = parseInt(WINDOW_WIDTH / 2);

  mainWindow.setBounds({ x: WINDOW_START, y: 0, width: WINDOW_WIDTH, height: WINDOW_HEIGHT })

  leftView.setBounds({ x: 0, y: TOP, width: WINDOW_WIDTH/2, height: WINDOW_HEIGHT - TOP})
  rightView.setBounds({ x: HALF_WIDTH, y: TOP, width: HALF_WIDTH, height: WINDOW_HEIGHT - TOP})
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  let [leftView, rightView, mainWindow] = createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      [leftView, rightView, mainWindow] = createWindow()
      rightView.webContents.loadURL(streamlit_server.getUrl())
      setWindowSizes(leftView, rightView, mainWindow)
    }
  })

  setWindowSizes(leftView, rightView, mainWindow)


  if (!fs.existsSync(SERVER_FILE_PATH)) {
    let = contents = DEFAULT_APP_CONTENTS
    fs.mkdirSync(path.dirname(SERVER_FILE_PATH), { recursive: true })
    fs.writeFileSync(SERVER_FILE_PATH, contents)
  }

  if (!streamlit_server) {
      portfinder.getPortPromise({port: 8599}).then(async (port) => {
        streamlit_server = new StreamlitServer(app, SERVER_FILE_PATH, port);
        let url = await streamlit_server.startOrRestart();
        rightView.webContents.loadURL(url);
    })
    .catch((err) => {
      console.log(err);
    })
  }

  app.on("will-quit", () => {
    app.quit();
  });
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
  //win.removeBrowserView(secondView)
  //win.removeBrowserView(view)
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
