<template>
  <div class="distro" v-bind:class="{ showConfigure: configure }" v-if="hideWSL1 === false || distro.wsl !== 1">
    <div class="icon" v-bind:style="{ backgroundImage: `url('${getIcon()}')` }">&nbsp;</div>
    <transition name="fade" v-on:enter="beforeEnter">
      <div v-if="configure === false" key="show">
        <div class="info">
          <span class="name">{{ distro.name }}</span>
          <span v-if="distro.ip" class="ip">{{ distro.ip }}</span>
          <span v-if="distro.wsl === 1" class="warning">Migration required</span>
          <span class="details">WSL {{ distro.wsl }} <span v-if="distro.state === 'Running'">// {{ distro.distribution }} // {{ distro.kernel }}</span></span>
          <span class="ports"  v-if="distro.wsl > 1">
            <span class="port" v-for="(port, index) in getAllPorts()" v-bind:key="port.tcp + '-' + port.port" v-bind:index="index" v-bind:class="{ active: port.active }">
              <span class="tcp" v-if="port.tcp">{{ port.tcp }}</span>
              <span class="listen">
                {{ port.port }}
                <span v-if="port.program">/ {{ port.program }}</span>
              </span>
            </span>
          </span>
        </div>
        <div v-if="distro.wsl > 1 && distro.state === 'Running'" class="proxyToggle" v-bind:class="{ on: distro.proxying }">
          <input ref="proxyToggle" type="checkbox" v-model="settings.proxy" :checked="settings.proxy" data-onstyle="success" data-offstyle="danger">
        </div>
        <div class="btn-group actions">
          <button class="btn btn-sm" v-if="!isStarting && distro.state == 'Stopped'" v-on:click="startDistro()">Start</button>
          <button class="btn btn-sm" v-if="isStarting" disabled>Starting</button>
          <button class="btn btn-sm" v-if="!isTerminating && distro.state == 'Running'" v-on:click="terminateDistro()">Terminate</button>
          <button class="btn btn-sm" v-if="isTerminating" disabled>Terminating</button>
          <button class="btn btn-sm" v-if="distro.wsl > 1" v-on:click="showConfigurePorts()">Ports</button>
          <button class="btn btn-sm" v-if="distro.wsl > 1" v-on:click="showConfigureServices()">Services</button>
        </div>
      </div>

      <!-- SERVICES -->
      <div class="configure" v-else-if="configure === 'services'" key="configureServices">
        <div v-if="distro.state === 'Stopped'" class="services">
          Cannot manage services unless the distribution is running
        </div>
        <div v-else class="services">
          <span class="service" v-for="(service, index) in distro.services" v-bind:key="service.name" v-bind:index="index" v-bind:class="{ active: service.status === 'Running' }">
            <b-form-checkbox
              class="status"
              size="sm"
              :checked="service.status ==='Running'"
              v-on:change="toggleServiceState(service)"
              switch
            >
            {{ service.name }}
            </b-form-checkbox>
            <b-form-checkbox
              class="autostart"
              size="sm"
              :checked="isServiceAutoStart(service)"
              v-on:change="toggleServiceAutoStart(service)"
              button
            >
            auto
            </b-form-checkbox>
          </span>
        </div>

        <div class="btn-group actions">
          <button class="btn btn-sm" v-on:click="save()">Done</button>
        </div>
      </div>

      <!-- PORTS -->
      <div class="configure" v-else-if="configure === 'ports'" key="configurePorts">
        <div class="manageProxyPort" :class="{ disabled: settings.autoMap }">
          <form v-on:submit.prevent="submitNewPort()">
            <b-form-input
              v-model="newPort"
              size="sm"
              type="number"
              min="1"
              max="65535"
              required
              placeholder="Enter port then press enter"
            />
          </form>
          <div class="ports">
            <span title="Click on port to remove" v-for="(port, index) in settings.ports" v-bind:key="port" v-bind:index="index" class="port" v-on:click="removePort(port)">{{ port }}</span>
          </div>
        </div>
        <b-form-checkbox
          class="autodetect"
          size="lg"
          v-model="settings.autoMap"
          v-on:change="toggleAutoMap()"
          switch
        >
          Auto-forward ports
        </b-form-checkbox>
        <div class="btn-group actions">
          <button class="btn btn-sm" v-on:click="save()">Done</button>
        </div>
      </div>
    </transition>
    <div class="separator">&nbsp;</div>
  </div>
</template>

<script lang="ts">
import $ from 'jquery'
import { Component, Prop, Vue } from 'vue-property-decorator'
import { ipcRenderer } from 'electron'

interface Port {
  tcp: number;
  port: number;
  program: string;
  active: boolean;
}

interface Service {
  name: string;
  status: 'Stopped' | 'Running';
}

interface Distro {
  name: string;
  state: 'Stopped' | 'Running';
  version: string;
  wsl: number;
  distribution: string;
  kernel: string;
  ip: string;
  ports: Port[];
  services: Service[];
  proxying: boolean;
}

@Component
export default class DistroListEntry extends Vue {
  @Prop()
  private distro!: Distro

  private settings = this.$store.state.settings.distros[this.distro.name]
  private hideWSL1 = this.$store.state.settings.hideWSL1
  private configure: boolean | string = false
  private newPort = ''

  private isStarting = false
  private isTerminating = false

  public mounted () {
    this.setupProxyToggle()
  }

  public beforeEnter (dom: HTMLElement) {
    if (!dom.classList.contains('configure')) {
      this.setupProxyToggle()
    }
  }

  public setupProxyToggle () {
    const el: any = $(this.$refs.proxyToggle)
    el.bootstrapToggle({
      on: 'Proxying',
      off: 'Proxy off'
    })

    el.on('change', () => this.toggleProxying())
  }

  public getIcon () {
    switch (this.distro.distribution) {
      case 'Arch': return require('../assets/icons/distros/arch.png')
      case 'Alpine': return require('../assets/icons/distros/alpine.png')
      case 'CentOS': return require('../assets/icons/distros/centos.png')
      case 'RHEL': return require('../assets/icons/distros/rhel.png')
      case 'Ubuntu': return require('../assets/icons/distros/ubuntu.png')
      case 'Kali': return require('../assets/icons/distros/kali.png')
      case 'Unknown': return require('../assets/icons/distros/unknown.png')
    }
  }

  public async startDistro () {
    this.isStarting = true
    await ipcRenderer.invoke('startDistro', this.distro.name)
    await this.$store.dispatch('updateDistros')
    this.setupProxyToggle()
    this.isStarting = false
  }

  public async terminateDistro () {
    this.isTerminating = true
    await ipcRenderer.invoke('terminateDistro', this.distro.name)
    await this.$store.dispatch('updateDistros')
    this.isTerminating = false
  }

  public async toggleProxying () {
    this.$store.commit('setDistroProxying', { name: this.distro.name, proxy: !this.settings.proxy })
  }

  public async toggleAutoMap () {
    this.$store.commit('setDistroAutoMap', { name: this.distro.name, autoMap: !this.settings.autoMap })
  }

  public getAllPorts () {
    if (this.settings.autoMap) {
      return this.distro.ports
    }

    return this.settings.ports.map((port: number) => {
      return this.distro.ports.find(({ port: distroPort }) => port === distroPort) || { port, program: '', active: false }
    })
  }

  public submitNewPort () {
    this.addPort(parseInt(this.newPort, 10))
    this.newPort = ''
  }

  public async addPort (port: number) {
    if (this.settings.ports.includes(port)) {
      return
    }

    this.settings.ports.push(port)
    this.$store.commit('setDistroPorts', { name: this.distro.name, ports: this.settings.ports })
  }

  public async removePort (port: number) {
    const index = this.settings.ports.indexOf(port)
    this.settings.ports.splice(index, 1)
    this.$store.commit('setDistroPorts', { name: this.distro.name, ports: this.settings.ports })
  }

  public showConfigurePorts () {
    this.configure = 'ports'
  }

  public toggleServiceState ({ name, status }: Service) {
    this.$store.dispatch('setServiceState', { name: this.distro.name, service: name, start: status !== 'Running' })
  }

  public isServiceAutoStart ({ name }: Service) {
    return this.settings.services.includes(name)
  }

  public toggleServiceAutoStart ({ name }: Service) {
    const index = this.settings.services.indexOf(name)

    if (index > -1) {
      this.settings.services.splice(index, 1)
    } else {
      this.settings.services.push(name)
    }

    this.$store.commit('setDistroServices', { name: this.distro.name, services: this.settings.services })
  }

  public showConfigureServices () {
    this.configure = 'services'
  }

  public save () {
    this.configure = false
  }
}
</script>
<style>
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #b0bec8;
  border: 10px solid #b0bec8;
  border-radius: 5px;
}

::-webkit-scrollbar-thumb {
  border: 2px solid #b0bec8;
  background: #7E838E;
  border-radius: 5px;
}

.custom-control-input:checked~.custom-control-label::before{
  background-color:#52EF7F;
  border-color: #39B159;
}

.custom-control-input:focus~.custom-control-label::before {
  box-shadow: 0 0 3px #000;
}

.autostart .btn {
  font-size: 12px;
  padding: 0 10px;
}

.autostart .btn-secondary:not(:disabled):not(.disabled):active,
.show>.btn-secondary.dropdown-toggle {
  background-color: #EF8354;
  text-shadow: 0 0 5px #000;
}

.btn-secondary.focus, .btn-secondary:focus {
  box-shadow: 0 0 0 #000;
}
</style>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.distro { user-select: none; position: relative; display:block; width: 100%; height: 145px; padding: 24px 20px; background: linear-gradient(to right, rgba(191,192,192,0.65) 0%,rgba(0,0,0,0) 100%); background-color: rgba(0, 0, 0, 0); transition: background-color cubic-bezier(0.075, 0.82, 0.165, 1) 250ms; }
.distro:hover { background-color: rgba(0, 0, 0, 0.2); }
.distro.showConfigure { background-color: rgba(0, 0, 0, 0.8); }

.icon { display: block; float: left; height: 96px; width: 96px; background-repeat: no-repeat; border-radius: 48px; box-shadow: 0px 1px 3px #333; transition: all cubic-bezier(0.075, 0.82, 0.165, 1) 250ms, background-image 250ms ease-in-out; }
.distro.showConfigure .icon { margin-left: -50px; box-shadow: 0 0 0 #333; }

.info { display: block; float: left; width: 440px; margin: 0 16px; }
.info .name { display: inline-block; font-weight: 700; font-size: 32px; line-height: 42px; color: #fff; padding-top: 8px; text-shadow: -1px 1px 0px #000; }

.info .ip { display: inline-block; line-height: 1; vertical-align: super; font-size: 16px; background-color: #2d3142; border-radius: 2px; padding: 3px 8px; margin: 0 10px; color: #fff; }
.info .warning { display: inline-block; line-height: 1; vertical-align: super; font-size: 16px; background-color: #EF8354; border-radius: 2px; padding: 3px 8px; margin: 0 10px; color: #fff; }

.info .details { display: block; color: #bfc0c0; font-size: 16px; line-height: 14px; }

.info .ports { display : block; height: 40px; margin-top: 10px; font-size: 12px; line-height: 1; text-shadow: 0px 1px 3px #000; }
.info .port { display: inline-block; line-height: 1; font-size: 12px; font-weight: 700; color: #fff; border-radius: 3px; background: #2D3142; margin: 2px; margin-right: 5px; }
.info .port.active { background: #52EF7F; }
.info .port .tcp { float: left; padding: 2px 5px; line-height: 1; background: #4F5D75; border-radius: 3px; border-top-right-radius: 0; border-bottom-right-radius: 0;}
.info .port .listen { float: right; padding: 2px 5px; line-height: 1; }

.proxyToggle { position: absolute; display: block; top: 24px; right: 12px; border: 1px solid #acadad; border-radius: 0.25rem; }
.proxyToggle.on { box-shadow: 0 0 20px #ccc; }

.actions { position: absolute; display: block; bottom: 13px; right: 12px; height: 30px; background: #262626; border-radius: 5px; box-shadow: 0px 1px 1px #ccc; overflow: hidden;  }
.actions button { position: relative; display: block; float: left; height: 100%; color: #fff; border-right: 1px solid #737373; }
.actions button:hover { background: #4F5D75;  }

.configure { position: absolute; display: block; top: 30px; bottom: 0px; right: 0; left: 75px; color: #fff; }
.configure .manageProxyPort { float: left; width: 480px; transition: all cubic-bezier(0.86, 0, 0.07, 1) 250ms; }
.configure .manageProxyPort.disabled { opacity: 0.2; pointer-events: none; }
.configure .ports { display : block; height: 40px; margin-top: 10px; font-size: 16px; line-height: 1; text-shadow: 0px 1px 3px #000; }
.configure .port { display: inline-block; line-height: 1; font-size: 16px; font-weight: 700; color: #fff; border-radius: 3px; padding: 2px 5px; background: #EF8354; margin: 2px; margin-right: 5px; }
.configure .autodetect { float: left; margin-left: 20px;  }

.configure .services { display: flex; flex-direction: row; flex-wrap: wrap; overflow-y: scroll; margin-top: -20px; height: calc(100% + 10px); width: 650px; background: #333; box-shadow: -1px -1px 0 #111; padding: 10px; border-radius: 5px; }
.configure .services .service { display: block; flex: 1; flex-direction: column; flex-basis: 33%; max-width: 33%; }
.configure .services .service .status { float: left; width: 150px; }
.configure .services .service .autostart { float: left; margin-top: -2px; }

.fade-enter-active {
  transition: opacity 250ms;
}

.fade-leave-active {
  transition: opacity 125ms;
}

.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
  opacity: 0;
}

.separator {
  position: absolute;
  display: block;
  bottom: 0px;
  left: 5px;
  right: 5px;

  height: 2px;
  background:#fff;
  border-top: solid 1px #000;
  opacity: 0.4;
}
</style>
