

import { Emitter, Logger, encodeBase32 } from 'zeed'
import { trackException } from '../bugs'
import { cloneObject } from '../lib/base'
import { getFingerprintString, sha256Messages, splitByNChars } from './fingerprint'
import { Peer } from './simple-peer'

const log = Logger('app:webrtc-peer')

let ctr = 1

export class WebRTCPeer extends Emitter {
  remote: any
  local: any
  initiator: any
  room: any
  id: string
  fingerprint: string
  name: string
  error: any
  active: boolean
  stream: any
  peer: Peer

  static isSupported() {
    return Peer.WEBRTC_SUPPORT
  }

  constructor({ remote, local, ...opt }: any = {}) {
    super()

    this.remote = remote
    this.local = local
    this.initiator = opt.initiator
    this.room = opt.room || ''
    this.id = `webrtc-peer${ctr++}`
    this.fingerprint = ''
    this.name = ''

    log('peer', this.id)
    this.setupPeer(opt)
  }

  setupPeer(opt) {
    this.error = null
    this.active = false
    this.stream = null

    const opts = cloneObject({
      ...opt,
      
      offerConstraints: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      },
    })

    log('Peer opts:', opts)

    
    this.peer = new Peer(opts)

    this.peer.on('close', this.close.bind(this))

    //connection error
    this.peer.on('error', (err) => {
      log(`${this.id} | error`, err)
      this.error = err
      this.emit('error', err)
      this.close()
      setTimeout(() => {
        this.setupPeer(opt) // ???
      }, 1000)
    })

    
    this.peer.on('signal', (data) => {
      // log(`${this.id} | signal`, this.initiator)
      this.emit('signal', data)
    })

    this.peer.on('signalingStateChange', async (_) => {
      const fpl
        = getFingerprintString(this.peer?._pc?.currentLocalDescription?.sdp) || ''
      const fpr
        = getFingerprintString(this.peer?._pc?.currentRemoteDescription?.sdp)
        || ''
      if (fpl && fpr) {
        const digest = await sha256Messages(this.room, fpl, fpr)
        this.fingerprint = splitByNChars(encodeBase32(digest), 4)
      }
      else {
        this.fingerprint = ''
      }
    })

    //received data from the peer
    this.peer.on('data', (data) => {
      log(`${this.id} | data`)
      this.emit('data', data)
      this.emit('message', { data }) // Channel compat
    })

    // Connection succeeded
    this.peer.on('connect', () => {
      log(`${this.id} | connect`)
      this.active = true
      // p.send('whatever' + Math.random())
      this.emit('connect')
    })

    this.peer.on('stream', (stream) => {
      log('new stream', stream)
      this.stream = stream
      this.emit('stream', stream)
    })
  }

  setStream(stream) {
    try {
      this.peer.setStream(stream)
    }
    catch (err) {
      trackException(err)
    }
  }

  //got a signal from the remote peer and will use it now to establish the connection
  signal(data) {
    if (this.peer && !this.peer.destroyed) {
      //manipulated fingerprints will result in refusing connection
      // if (data?.sdp) {
      //   data.sdp = data.sdp.replace(/(fingerprint:.*?):(\w\w):/, '$1:00:')
      // }
      this.peer.signal(data)
    }
    else {
      log('Tried to set signal on destroyed peer', this.peer, data)
    }
  }

  postMessage(data) {
    // Channel compat
    this.peer.send(data)
  }

  close() {
    this.emit('close')
    this.active = false
    this.peer?.destroy()
  }
}
