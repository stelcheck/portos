'use strict'

import { execFile } from 'child_process'
import { promisify, inspect } from 'util'
import { app, ipcMain, nativeImage , protocol, screen, shell, systemPreferences, BrowserWindow, Tray, Event } from 'electron'
import {
  createProtocol
  /* installVueDevtools */
} from 'vue-cli-plugin-electron-builder/lib'
import { set } from 'vue/types/umd'
import { promises } from 'dns'

const isDevelopment = process.env.NODE_ENV !== 'production'

app.allowRendererProcessReuse = true

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { secure: true, standard: true } }])

const exec = promisify(execFile)
const callWSL = async (...args: any) => exec('wsl.exe', args).then(({ stdout }) => stdout.replace(/\u0000/g, ''))
const startDistro = async (name: string) => callWSL('-d', name, '-e', '/bin/true')
const terminateDistro = async (name: string) => callWSL('-t', name)
const listWSLDistros = async () => callWSL('--list', '-v').then((list) => list
  .split('\r\n')
  .slice(1, -1)
  .map((line) => {
    const [ name, state, wsl ] = line.substring(2).replace(/\s{2,} /g, ' ').split(' ')
    return { name, state, wsl: parseInt(wsl, 10) }
  })
  .filter(({ name }) => !name.match(/^docker-desktop/))
)

const knownDistros = {
  Arch: /Arch Linux/,
  Alpine: /Alpine/,
  CentOS: /CentOS/,
  RHEL: /Red Hat/,
  Ubuntu: /Ubuntu/,
  Kali: /Kali/
}

function parseIssueFile(data: string) {
  for (const [distribution, match] of Object.entries(knownDistros)) {
    if (data.match(match)) {
      return { distribution }
    }
  }

  return { distribution: 'Unknown' }
}

function parseIfconfigInfo(data: string) {
  const match = data.match(/inet ([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\//s)
  if (!match) {
    throw Error('failed to find IP address')
  }

  return match[1]
}

/**
 * Filter out local listens, match per TCP version
 * @param data
 */
function parseNetstat(data: string) {
  const lines = data.split('\n')
  const entries = lines.slice(2, lines.length - 1)

  return entries
    .map((entry) => entry.replace(/\s{2,}/g, ' ').split(' '))
    .filter(([_0, _1, _2, ipAndPort]) => !ipAndPort.startsWith('127.0.0.1') && !ipAndPort.startsWith('::1:'))
    .map((info) => {
      const type = info[0]
      let tcp: number
      let port: string
      let program: string

      if (type === 'tcp6') {
        tcp = 6
        port = info[3].split(':')[3]
        program = info[6].split('/')[1]

      } else {
        tcp = 4
        port = info[3].split(':')[1]
        program = info[6].split('/')[1]
      }

      return { tcp, port: parseInt(port, 10), program, active: true }
    })
}

function parseServicesList(data: string) {
  const map: { [key: string]: string } = {
    '?': 'Unknown',
    '+': 'Running',
    '-': 'Stopped'
  }

  const lines = data.split('\n')
  lines.pop()

  return lines
    .map((line) => line.split(' '))
    .map((details) => ({ name: details[5], status: map[details[2]] }))

}

const execOnDistro = async (name: string, ...args: any) => callWSL('-u', 'root', '-d', name, '-e', ...args)
const getDistroOSDetails = async (name: string) => execOnDistro(name, 'cat', '/etc/issue').then(parseIssueFile)
const getDistroKernelVersion = async (name: string) => execOnDistro(name, 'uname', '-r').then((version) => version.substring(0, version.length - 1))
const getDistroIP = async (name: string) => execOnDistro(name, 'ip', 'addr', 'show', 'eth0').then(parseIfconfigInfo)
const getActivePorts = async (name: string) => execOnDistro(name, 'netstat', '-lpnt').then(parseNetstat)
const getServices = async (name: string) => execOnDistro(name, '/usr/sbin/service', '--status-all').then(parseServicesList)
const startService = async (name: string, service: string) => execOnDistro(name, '/usr/sbin/service', service, 'start').then(parseServicesList)
const stopService = async (name: string, service: string) => execOnDistro(name, '/usr/sbin/service', service, 'stop').then(parseServicesList)

async function listDistros() {
  const list = await listWSLDistros()
  const data: any = []

  for (const info of await listWSLDistros()) {
    const { name, state, wsl } = info

    if (state === 'Stopped') {
      data.push({ ...info, distribution: 'Unknown' })
      continue
    }

    const promises: Promise<any>[] = [
      getDistroOSDetails(name),
      getDistroKernelVersion(name),
    ]

    if (wsl > 1) {
      promises.push(getDistroIP(name))
      promises.push(getActivePorts(name))
      promises.push(getServices(name))
    }

    const [ osDetails, kernel, ip, ports, services ] = await Promise.all(promises)

    data.push({ ...info, ...osDetails, kernel, ip, ports, services })
  }

  return data;
}

const callNetSh = async (...args: any) => exec('netsh.exe', ['interface', 'portproxy', ...args]).then(({ stdout }) => stdout)

function parseProxiedPorts(data: string) {
  const lines = data.split('\r\n')
  const entries = lines.slice(5, lines.length - 2).map((line) => {
    const [srcIp, srcPort, destIp, destPort] = line.replace(/\s{2,}/g, ' ').split(' ')
    return { src: { ip: srcIp, port: srcPort }, dest: { ip: destIp, port: destPort }}
  })

  const response: { [ip: string]: { [port: string]: { ip: string, port: string }} } = {}

  for (const entry of entries) {
    const { dest: { ip, port }, src } = entry
    if (!response[ip]) {
      response[ip] = {}
    }
    response[ip][port] = src
  }

  return response
}

const listProxiedPorts = async () => callNetSh('show', 'all').then(parseProxiedPorts)
const addProxyPort = async (target: string, port: number) => callNetSh('add', 'v4tov4', `listenport=${port}`, `listenaddress=0.0.0.0`, `connectport=${port}`, `connectaddress=${target}`)
const removeProxyport = async (port: string) => callNetSh('delete', 'v4tov4', `listenport=${port}`, `listenaddress=0.0.0.0`)

async function mapPorts(settings: any) {
  const promises: Promise<any>[] = []
  const allProxied = await listProxiedPorts()
  const allDistros =  await listDistros()
  const distros = allDistros.map(({ name, ip, ports }: any) => ({
    ip,
    ports: settings[name].autoMap ? ports.map(({ port }: any) => port) : settings[name].ports,
  })).filter(({ ip }: any) => ip)

  for (const { ip, ports } of distros) {
    const proxiedPorts = allProxied[ip] || {}

    for (const port of ports) {
      if (!proxiedPorts[port]) {
        promises.push(addProxyPort(ip, port))
      }
    }

    for (const proxiedPort of Object.keys(proxiedPorts)) {
      if (!ports.includes(parseInt(proxiedPort, 10))) {
        promises.push(removeProxyport(proxiedPort))
      }
    }
  }

  return Promise.all(promises)
}

async function autoStartServices(settings: any) {
  const promises = []

  for (const [name, { services }] of Object.entries<{ services: string[] }>(settings)) {
    if (!services || services.length === 0) {
      continue
    }

    const startedServices = await getServices(name)
      .then((services) => services
        .filter(({ status }) => status === 'Running')
        .map(({ name }) => name)
      )

    for (const service of services) {
      if (!startedServices.includes(service)) {
        promises.push(startService(name, service))
      }
    }
  }

  return Promise.all(promises)
}

ipcMain.handle('startDistro', async (_e, name: string) => startDistro(name))
ipcMain.handle('terminateDistro', async (_e, name: string) => terminateDistro(name))
ipcMain.handle('listDistros', async () => listDistros())

ipcMain.handle('mapPorts', async (_e, settings) => mapPorts(settings))
ipcMain.handle('autoStartServices', async (_e, settings) => autoStartServices(settings))

ipcMain.handle('startService', async (_e, distro: string, service: string) => startService(distro, service))
ipcMain.handle('stopService', async (_e, distro: string, service: string) => stopService(distro, service))

class TrayWindow {
  public tray: Tray;
  public window: BrowserWindow;

  public background: string
  public accent: string

  public isShown: boolean = false
  public isTop: boolean = false
  public isLeft: boolean = false

  private hidingTimer: any;

  constructor() {
    this.background = systemPreferences.getColor('window-frame')
    this.accent = systemPreferences.getAccentColor()

    this.tray = new Tray('./public/favicon.ico')
    this.tray.setTitle('portos')
    this.tray.on('click', () => this.toggle())

    this.window = new BrowserWindow({
      width: 0,
      height: 0,
      show: false,
      frame: false,
      fullscreenable: false,
      type: 'toolbar',
      transparent: true,
      skipTaskbar: true,
      alwaysOnTop: true,
      thickFrame: false,
      webPreferences: {
        nodeIntegration: true
      }
    })

    this.window.on('blur', () => {
      if (!this.window.webContents.isDevToolsOpened()) {
        this.hide()
      }
    })

    const handleRedirect = (e: Event, url: string) => {
      if(url != this.window.webContents.getURL()) {
        e.preventDefault()
        shell.openExternal(url)
      }
    }

    this.window.webContents.on('will-navigate', handleRedirect)
    this.window.webContents.on('new-window', handleRedirect)

    this.window.setIgnoreMouseEvents(true)

    let loading;
    if (process.env.WEBPACK_DEV_SERVER_URL) {
      // Load the url of the dev server if in development mode
      loading = this.window.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
    } else {
      createProtocol('app')
      // Load the index.html when not in development
      loading = this.window.loadURL('app://./index.html')
    }

    loading.then(() => this.window.show())
  }

  getPosition() {
    const screenBounds = screen.getPrimaryDisplay().bounds
    const trayBounds = this.tray.getBounds()
    const windowBounds = this.window.getBounds()

    windowBounds.width -= 10
    windowBounds.height -= 10

    const isTrayOnLeft = trayBounds.x < screenBounds.width / 2
    const isTrayOnTop = trayBounds.y < screenBounds.height / 2

    let x: number, y: number

    if (isTrayOnLeft) {
      x = trayBounds.x + 30
    } else {
      x = Math.min(screenBounds.width - windowBounds.width, Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2)))
    }

    if (isTrayOnTop) {
      y = Math.round(trayBounds.y + trayBounds.height + 4)
    } else {
      y = Math.round(screenBounds.height - windowBounds.height - 5)
    }

    return { top: isTrayOnTop, left: isTrayOnLeft, x, y }
  }

  async show() {
    if (this.isShown || this.hidingTimer) {
      return
    }

    const list = await listWSLDistros()
    this.repositionWindow()

    this.window.webContents.send('trayWindowUpdate', this.getInfo());

    this.window.setIgnoreMouseEvents(false)

    this.window.focus()
    this.window.webContents.send('show', true)
    this.isShown = true
  }

  hide() {
    this.hidingTimer = setTimeout(() => {
      this.window.setIgnoreMouseEvents(true)
      this.isShown = false
      this.hidingTimer = null
    }, 100)

    this.window.webContents.send('show', false)
  }

  toggle() {
    this.isShown ? this.hide() : this.show()
  }

  getInfo() {
    const { background, accent, isTop, isLeft } = this
    return { background, accent, isTop, isLeft }
  }

  repositionWindow() {
    const { top, left, x, y } = this.getPosition()
    this.isTop = top
    this.isLeft = left

    this.window.setPosition(x, y, true)
  }

  setWindowHeight(height: number) {
    this.window.setSize(820, height)
    this.repositionWindow()
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  const tray = new TrayWindow();
  ipcMain.handle('getTrayInfo', () => tray.getInfo())
  ipcMain.handle('setWindowHeight', (_, height: number) => tray.setWindowHeight(height))
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', data => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}
