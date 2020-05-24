<template>
  <transition name="fade" appear>
    <div class="about">
      <h1>About Portos</h1>
      <span class="entry">Version: {{ version }}</span>
      <span class="entry">License: MIT <a href="https://github.com/stelcheck/portos" target="_blank"><i class="fab fa-github"></i></a></span>
      <span class="entry">
        Creator: stelcheck
        <a href="https://github.com/stelcheck" target="_blank"><i class="fab fa-github"></i></a>
        <a href="https://github.com/stelcheck" target="_blank"><i class="fab fa-twitter"></i></a>
      </span>
    </div>
  </transition>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component
export default class SettingsScreen extends Vue {
  private version = require('../../package.json').version
}
</script>
<style scoped>
h1 {
  font-size: 42px;
  font-weight: 700;
  margin-left: -20px;
  padding: 5px 0px 0px 20px;
  background: linear-gradient(to right, rgba(0,0,0,0.65) 0%,rgba(0,0,0,0) 100%);
  backdrop-filter: blur(2px);
}

.about {
  user-select: none;
  z-index: 1;
  background: linear-gradient(58deg, #292c3e, #ef8354, #52ef7f, #4f5d75);
  background-size: 800% 800%;
  animation: about 27s ease infinite;
  color: #fff;
  padding: 20px;
  transition: top cubic-bezier(0.075, 0.382, 0.165, 1) 250ms;
}

.about .entry {
  display: block;
  float: left;
  font-size: 24px;
  margin: 2px 30px 2px 0;
  text-shadow: 1px 1px 4px #000;
}

.about .entry a { color: #BFC0C0; margin-right: 5px; transition: color cubic-bezier(0.215, 0.610, 0.355, 1) 250ms; }
.about .entry a:hover { color: #EF8354; }

.fade-leave, .fade-enter-to {
  top: 0px;
}

.fade-enter, .fade-leave-to {
  top: 100% !important;
}

@-webkit-keyframes about {
    0%{background-position:78% 0%}
    50%{background-position:23% 100%}
    100%{background-position:78% 0%}
}
@-moz-keyframes about {
    0%{background-position:78% 0%}
    50%{background-position:23% 100%}
    100%{background-position:78% 0%}
}
@keyframes about {
    0%{background-position:78% 0%}
    50%{background-position:23% 100%}
    100%{background-position:78% 0%}
}
</style>
