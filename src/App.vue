<template>
  <div id="app" v-bind:class="{ show: show }" v-bind:style="{
    backgroundColor: backgroundColor
  }">
    <div class="banner">
      <strong>Portos</strong> <em>//</em> WSL2 manager
      <router-link v-if="isMainScreen" to="/about">About</router-link>
      <router-link v-if="isMainScreen" to="/settings">Settings</router-link>
      <router-link v-if="!isMainScreen" to="/">Back</router-link>
    </div>
    <div class="main">
      <router-view/>
    </div>
  </div>
</template>
<script lang="ts">
import 'jquery'

import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

import 'bootstrap4-toggle'
import 'bootstrap4-toggle/css/bootstrap4-toggle.min.css'

import '@fortawesome/fontawesome-free/css/all.min.css'

import Vue from 'vue'
import { ipcRenderer } from 'electron'

export default Vue.extend({
  data () {
    return {
      show: false
    }
  },
  async mounted () {
    this.updateDistros()
    setInterval(() => this.updateDistros(), 5000)
    ipcRenderer.on('trayWindowUpdate', (_, info) => this.$store.commit('setTrayWindow', info))
    ipcRenderer.on('show', async (_, show) => {
      this.updateWindowHeight()
      this.$data.show = show
    })
  },
  watch: {
    $route () {
      this.updateWindowHeight()
    }
  },
  methods: {
    updateDistros () {
      this.$store.dispatch('updateDistros')
    },
    updateWindowHeight () {
      const { distros, settings } = this.$store.state
      let shownDistroCount = distros.length

      if (settings.hideWSL1) {
        shownDistroCount = distros.filter(({ wsl }: any) => wsl !== 1).length
      }

      const height = shownDistroCount * 145 + 69 + 10
      ipcRenderer.invoke('setWindowHeight', height)
    }
  },
  computed: {
    backgroundColor () {
      return this.$store.getters.backgroundColor
    },
    isMainScreen () {
      return this.$route.path === '/'
    }
  }
})
</script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Titillium+Web:ital,wght@0,200;0,300;0,400;0,600;0,700;0,900;1,200;1,300;1,400;1,600;1,700&display=swap');

.toggle-on { background-color: #52EF7F;}
.toggle-off { background-color: #ED4054;}

html, body {
  background-color: transparent !important;
}
#app {
  position: absolute;
  display: block;
  top: 100%;
  left: 10px;
  bottom: 10px;
  right: 10px;
  overflow: hidden;
  font-family: 'Titillium Web', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  opacity: 0;
  transition:
    all cubic-bezier(0.075, 0.82, 0.165, 1) 500ms;

    box-shadow: 0 0 10px #000;

}

#app.show {
  opacity: 1;
  top: 0;
  transition: all cubic-bezier(0.075, 0.82, 0.165, 1) 250ms;
}

#app > .banner {
  position: relative;
  display: block;
  padding: 6px 16px;
  background-color: #121212;
  font-size: 28px;
  text-align: left;
  color: #bfc0c0;
  border-bottom: 3px solid #e5e6e6;
}

#app > .banner strong {
  font-size: 36px;
  color: #ffffff;
}

#app > .banner em {
  font-size: 24px;
  font-style: normal;
  color: #ef8354;
}
#app > .banner a {
  position: relative;
  display: block;
  float: right;
  padding: 16px 10px;

  font-size: 18px;
  color: #ffffff;
}

#app .main {
  position: absolute;
  display: block;
  top: 68px;
  bottom: 0;
  left: 0;
  right: 0;
}

#app .main > div {
  position: absolute;
  display: block;
  top: 0px;
  left: 0;
  right: 0;
  bottom: 0;
}
</style>
