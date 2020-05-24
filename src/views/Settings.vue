<template>
  <transition name="fade" appear>
    <div class="settings">
      <h1>Settings</h1>

    <b-form-checkbox
      class="setting"
      size="lg"
      v-model="settings.hideWSL1"
      v-on:change="toggleHideWSL1()"
      switch
    >
      Hide WSL1 Distributions
    </b-form-checkbox>

    <b-form-checkbox
      class="setting"
      size="lg"
      v-model="settings.startOnBoot"
      v-on:change="toggleStartOnBoot()"
      switch
    >
      Start on boot
    </b-form-checkbox>
    </div>
  </transition>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { SettingsData } from '../settings'

@Component
export default class SettingsScreen extends Vue {
  private settings!: SettingsData

  created () {
    this.settings = this.$store.getters.settings
  }

  toggleHideWSL1 () {
    this.$store.commit('setHideWSL1', !this.settings.hideWSL1)
  }

  toggleStartOnBoot () {
    this.$store.commit('setStartOnBoot', !this.settings.startOnBoot)
  }
}
</script>
<style scoped>
.settings {
  user-select: none;
  z-index: 1;
  background-color: #121428 !important;
  background: linear-gradient(to right, rgba(45,49,56,1) 0%,rgba(113,39,25,1) 100%);
  color: #fff;
  padding: 20px;
  transition: top cubic-bezier(0.075, 0.382, 0.165, 1) 250ms;
}

.fade-leave, .fade-enter-to {
  top: 0px;
}

.fade-enter, .fade-leave-to {
  top: 100% !important;
}

h1 {
  font-size: 42px;
  font-weight: 700;
  margin-left: -20px;
  padding: 5px 0px 0px 20px;
  background: linear-gradient(to right, rgba(0,0,0,0.65) 0%,rgba(0,0,0,0) 100%);
  backdrop-filter: blur(2px);
}

.setting {
  margin: 10px;
  display: inline-block;
  font-size: 24px;
  text-shadow: 2px 2px 2px #000;
}
</style>
