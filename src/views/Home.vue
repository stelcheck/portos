<template>
  <transition name="wait">
    <div class="home">
      <DistroListEntry
        v-for="(distro, index) in distros"
        v-bind:key="distro.name"
        v-bind:index="index"
        v-bind:distro="distro"
      />
    </div>
  </transition>
</template>
<script>
// @ is an alias to /src
import DistroListEntry from '@/components/DistroListEntry.vue'

export default {
  name: 'Home',
  components: {
    DistroListEntry
  },
  computed: {
    distros () {
      return this.$store.state.distros
    }
  }
}
</script>
<style scoped>
.home {
  z-index: 0;
  transition-delay: 500ms;
  transition-duration: 1ms;
  transition-property: all;
}

.wait-enter, .wait-leave-to {
  opacity: 1;
}
</style>
