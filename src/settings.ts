import * as electronSettings from 'electron-settings'

export interface DistroSettings {
  proxy: boolean;
  autoMap: boolean;
  ports: number[];
  services: string[];
}

export interface DistroMap {
  [name: string]: DistroSettings;
}

export interface SettingsData {
  hideWSL1: boolean;
  startOnBoot: boolean;
  distros: DistroMap;
}

const settings: any = electronSettings.getAll()

if (settings === null || Object.keys(settings).length === 0) {
  const defaultSettings: SettingsData = {
    hideWSL1: false,
    startOnBoot: false,
    distros: {}
  }

  electronSettings.setAll(defaultSettings as any)
}

type Settings = typeof electronSettings
type AppSettings = {
  getAll(this: AppSettings): SettingsData;
}

export default electronSettings as AppSettings & Settings
