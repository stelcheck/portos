import Vue from 'vue'
import Vuex from 'vuex'

import { ipcRenderer } from 'electron'
import settings from '../settings'

Vue.use(Vuex)

const DEFAULT_DISTRO_SETTINGS = {
  proxy: false,
  autoMap: false,
  ports: [],
  services: []
}

export default new Vuex.Store({
  state: {
    settings: settings.getAll(),
    trayWindow: {
      background: '',
      accent: '',
      isTop: false,
      isLeft: false
    },
    distros: []
  },
  getters: {
    backgroundColor (state) {
      return state.trayWindow.background
    },
    accentColor (state) {
      return state.trayWindow.accent
    },
    settings (state) {
      return state.settings
    },
    distroSettings (state, name) {
      return state.settings.distros[name]
    }
  },
  mutations: {
    setTrayWindow (state, data) {
      state.trayWindow = data
    },
    setDistros (state, distros) {
      state.distros = distros
    },
    setHideWSL1 (state, val) {
      state.settings.hideWSL1 = val
      settings.set('hideWSL1', val)
    },
    setStartOnBoot (state, val) {
      state.settings.startOnBoot = val
      settings.set('startOnBoot', val)
    },
    addDistroSettings (state, name) {
      state.settings.distros[name] = { ...DEFAULT_DISTRO_SETTINGS }
      settings.set(`distros.${name}`, { ...DEFAULT_DISTRO_SETTINGS })
    },
    setDistroProxying (state, { name, proxy }) {
      state.settings.distros[name].proxy = proxy
      settings.set(`distros.${name}.proxy`, proxy)
    },
    setDistroAutoMap (state, { name, autoMap }) {
      state.settings.distros[name].autoMap = autoMap
      settings.set(`distros.${name}.autoMap`, autoMap)
    },
    setDistroPorts (state, { name, ports }) {
      state.settings.distros[name].ports = ports
      settings.set(`distros.${name}.ports`, ports)
    },
    deleteDistroSettings (state, name) {
      delete state.settings.distros[name]
    },
    setDistroServices (state, { name, services }) {
      state.settings.distros[name].services = services
      settings.set(`distros.${name}.services`, services)
    }
  },
  actions: {
    async updateDistros (state) {
      await Promise.all([
        ipcRenderer.invoke('mapPorts', state.getters.settings.distros),
        ipcRenderer.invoke('autoStartServices', state.getters.settings.distros)
      ])
      const list = await ipcRenderer.invoke('listDistros')
      state.commit('setDistros', list)

      const names = list.map(({ name }: { name: string }) => name)
      const { distros } = state.getters.settings

      for (const name of names) {
        if (!distros[name]) {
          state.commit('addDistroSettings', name)
        }
      }

      for (const name of Object.keys(list)) {
        if (!list.includes(name)) {
          state.commit('deleteDistroSettings', name)
        }
      }
    },
    async setServiceState (state, { name, service, start }) {
      if (start) {
        await ipcRenderer.invoke('startService', name, service)
      } else {
        await ipcRenderer.invoke('stopService', name, service)
      }

      return state.dispatch('updateDistros')
    }
  },
  modules: {
  }
})
