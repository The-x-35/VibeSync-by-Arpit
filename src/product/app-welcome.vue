<script lang="ts">
import { trackSilentException } from '../bugs'
import { DEFAULT_ROOM, ROOM_PATH } from '../config'
import { historyAllRooms } from '../lib/history'
import { openExternalLink } from '../lib/link-external'
import { generateName } from '../lib/names'
import { state } from '../state'
import AppHelp from './app-help.vue'
import { gotoUrl } from './external-links'

import './app-welcome.scss'

export default {
  name: 'AppWelcome',
  components: {
    AppHelp,
  },
  data() {
    const defaultName = DEFAULT_ROOM ?? generateName()
    return {
      defaultName,
      room: defaultName,
      url: '',
      initialWidth: -1,
      currentChar: 0,
      observer: null,
      history: historyAllRooms().slice(0, 5),
      roomPath: ROOM_PATH,
      openExternalLink,
    }
  },
  watch: {
    room() {
      this.updateInput()
    },
  },
  async mounted() {
    await this.$nextTick()

    const input = this.$refs.input
    if (input) {
      input.style.width = `${input.scrollWidth}px`
      this.updateInput()

      this.observer = new ResizeObserver(this.updateInput)
      this.observer.observe(document.body)

      this.charAnimation()

      if (
        !/Android|webOS|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent)
      )
        input.focus()
    }
  },

  beforeUnmount() {
    this.observer?.disconnect()
  },
  methods: {
    gotoUrl,
    doEnterRoom(room) {
      if (room) {
        state.room = room
        try {
          window.history.pushState(
            null, // { room },
            null, // room,
            ROOM_PATH + room,
          )
        }
        catch (err) {
          trackSilentException(err)
        }
      }
    },
    doEnterInputRoom() {
      this.doEnterRoom(this.room || this.defaultName || '')
    },
    updateInput() {
      const input = this.$refs.input
      if (input) {
        if (this.initialWidth < 0)
          this.initialWidth = input.scrollWidth
        const value = input.value.trim()
        input.style.width = '1px'
        input.style.width = `${value ? input.scrollWidth : this.initialWidth}px`
        this.url = ROOM_PATH + (value || this.defaultName)
      }
    },
    charAnimation() {
      setTimeout(() => {
        const input = this.$refs.input
        if (input) {
          this.currentChar++
          this.$refs.input.value = this.defaultName.substr(0, this.currentChar)
          this.updateInput()
          if (this.currentChar < this.defaultName.length)
            this.charAnimation()
        }
      }, 100)
    },
  },
}
</script>

<template>
  <div class="-scroll">
    <div class="page1">
      <div class="main">
        <div class="main-body">
          <div class="logo">
            <form id="form" @submit.prevent="doEnterInputRoom">
              <a id="link" :href="url" class="link" @click.prevent="doEnterInputRoom">Brie<span class="dot">.</span>fi<span class="slash">/</span>ng<span class="slash">/</span></a>
              <wbr>
              <input
                id="room"
                ref="input"
                v-model="room"
                type="text"
                name="room"
                enterkeyhint="go"
                spellcheck="false"
                :placeholder="defaultName"
              >
            </form>
            <div class="button-container">
              <a
                id="button"
                :href="url"
                class="button start-button"
                @click.prevent="doEnterInputRoom"
              >{{ $t("welcome.start") }}</a>
            </div>
          </div>
          <div v-if="history.length > 0" class="history">
            <div class="history-intro">
              {{ $t('welcome.history') }}
            </div>
            <div class="history-list">
              <a v-for="name in history" :key="name" :href="roomPath + name" @click.prevent="doEnterRoom(name)">{{ name }}</a>
            </div>
          </div>
        </div>
      </div>
      <div class="footer links">
       
        
       
        <p>
          <a href="#help" onclick="document.getElementById('help').scrollIntoView({behavior: 'smooth'}); return false;">↓ {{ $t('welcome.help') }} ↓</a>
        </p>
      </div>
    </div>
    <AppHelp />
  </div>
</template>
