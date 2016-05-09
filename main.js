var app = require('app')
var BrowserWindow = require('browser-window')
var Menu = require('menu')
var ipc = require('electron').ipcMain
var dialog = require('dialog')
var fs = require('fs')
var path = require('path')

var darwinTemplate = require('./menus/darwin-menu.js')
var otherTemplate = require('./menus/other-menu.js')

var emptyData = require('./empty-data.json')

var mainWindow = null
var menu = null

var iconPath = path.join(__dirname, '/assets/git-it.png')

app.on('window-all-closed', function appQuit () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('ready', function appReady () {
  mainWindow = new BrowserWindow({"minWidth": 800, "minHeight": 600, width: 980, height: 760, title: 'Git-it', icon: iconPath })

  var userDataPath = path.join(app.getPath('userData'), 'user-data.json')

  // tools for development to prefill challenge completion
  // usage: electron . --none
  //        electron . --some
  //        electron . --all
  if (process.argv[2] === '--none') { setAllChallengesUncomplete(userDataPath) }
  if (process.argv[2] === '--some') { setSomeChallengesComplete(userDataPath) }
  if (process.argv[2] === '--all')  { setAllChallengesComplete(userDataPath) }

  fs.exists(userDataPath, function (exists) {
    if (!exists) {
      fs.writeFile(userDataPath, JSON.stringify(emptyData, null, ' '), function (err) {
        if (err) return console.log(err)
      })
    }
  })

  mainWindow.loadURL('file://' + __dirname + '/index.html')

  ipc.on('getUserDataPath', function (event) {
    event.returnValue = userDataPath
  })

  ipc.on('open-file-dialog', function (event) {
    var files = dialog.showOpenDialog(mainWindow, { properties: [ 'openFile', 'openDirectory' ]})
    if (files) {
      event.sender.send('selected-directory', files)
    }
  })

  ipc.on('confirm-clear', function (event) {
    var options = {
      type: 'info',
      buttons: ['Yes', 'No'],
      title: 'Confirm Clearing Statuses',
      message: 'Are you sure you want to clear the status for every challenge?'
    }
    dialog.showMessageBox(options, function cb (response) {
      event.sender.send('confirm-clear-response', response)
    })
  })

  if (process.platform === 'darwin') {
    menu = Menu.buildFromTemplate(darwinTemplate(app, mainWindow))
    Menu.setApplicationMenu(menu)
  } else {
    menu = Menu.buildFromTemplate(otherTemplate(mainWindow))
    mainWindow.setMenu(menu)
  }

  mainWindow.on('closed', function winClosed () {
    mainWindow = null
  })
})

function setAllChallengesComplete (path) {
  var challenges = JSON.parse(fs.readFileSync(path))
  for (var key in challenges) {
    challenges[key].completed = true
  }
  fs.writeFileSync(path, JSON.stringify(challenges), '', null)
}

function setAllChallengesUncomplete (path) {
  var challenges = JSON.parse(fs.readFileSync(path))
  for (var key in challenges) {
    challenges[key].completed = false
  }
  fs.writeFileSync(path, JSON.stringify(challenges), '', null)
}

function setSomeChallengesComplete (path) {
  var counter = 0
  var challenges = JSON.parse(fs.readFileSync(path))
  for (var key in challenges) {
    counter++
    if (counter < 6) challenges[key].completed = true
    else challenges[key].completed = false
  }
  fs.writeFileSync(path, JSON.stringify(challenges), '', null)
}
