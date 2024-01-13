

import { Logger, useDispose } from 'zeed'
import { ICE_CONFIG } from '../config'
import { cloneObject } from '../lib/base'
import { messages } from '../lib/messages'
import { WebRTC } from './webrtc'

// import { removeBandwidthRestriction, setMediaBitrate } from './sdp-manipulation'

const log = Logger('app:connection')

export async function setupWebRTC(state) {
  if (!WebRTC.isSupported())
    return null

  const dispose = useDispose(log)

  const config = ICE_CONFIG

  const webrtc = new WebRTC({
    room: state.room,
    peerSettings: {
      trickle: true,
      // sdpTransform: (sdp) => {
      //   log('sdpTransform', state.bandwidth) // , sdp)
      //   let newSDP = sdp
      //   if (state.bandwidth) {
      //     //   newSDP = updateBandwidthRestriction(sdp, 10)
      //     // log('Old SDP', newSDP)
      //     newSDP = setMediaBitrate(newSDP, 'video', 233)
      //     newSDP = setMediaBitrate(newSDP, 'audio', 80)
      //     // log('New SDP', newSDP)
      //   }
      //   else {
      //     newSDP = removeBandwidthRestriction(sdp)
      //   }
      //   return newSDP
      // },
      config,
    },
  })

  dispose.add(webrtc)

  webrtc.on('status', (info) => {
    log('status', info.status)
    
    const status = info.status.map((p) => {
      const pp = cloneObject(p)
      pp.peer.stream = p.peer.stream
      return pp
    })
    state.status = status
  })

  webrtc.on('connected', ({ peer }) => {
    log('connected', peer)
    if (state.stream)
      peer.setStream(state.stream)

    messages.emit('requestUserInfo')
  })

  // Getting Client's Info with Local Peer Info
  webrtc.on('userInfoWithPeer', ({ peer, data }) => {
    webrtc.send('userInfoUpdate', { peer, data })
  })

  // Listening to Remote Client's Info with its Local Peer Info and
  // emitting to Local Client
  webrtc.on('userInfoUpdate', ({ peer, data }) => {
    messages.emit('userInfoUpdate', { peer, data })
  })

  // Listening to new messages from Remote Client and emitting to Local client
  webrtc.on('chatMessage', (info) => {
    messages.emit('newMessage', info)
  })

  dispose.add(messages.on('setLocalStream', (stream) => {
    webrtc.forEachPeer((peer) => {
      peer.setStream(stream)
    })
  }))

  dispose.add(messages.on('negotiateBandwidth', (_stream) => {
    webrtc.forEachPeer((peer) => {
      peer.peer.negotiate()
    })
  }))

  // Send a new message to all peers
  dispose.add(messages.on('chatMessage', ({ name, message, time }) => {
    webrtc.send('chatMessage', { name, message, time })
  }))

  // Listen to local userInfo and emit to webrtc for getting peer info
  dispose.add(messages.on('userInfo', (data) => {
    webrtc.emit('userInfo', { data })
  }))

  // dispose.add(messages.on('subscribePush', async (_on) => {
  //   const add = state.subscription
  //   const registration = await navigator.serviceWorker.getRegistration()
  //   let subscription = await registration.pushManager.getSubscription()
  //   const vapidPublicKey = state.vapidPublicKey
  //   if (!subscription && vapidPublicKey) {
  //     const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
  //     // @ts-expect-error todo
  //     subscription = registration.pushManager.subscribe({
  //       userVisibleOnly: true,
  //       applicationServerKey,
  //     })
  //   }

  //   webrtc.io.emit('registerPush', { // ???
  //     add,
  //     room: state.room,
  //     subscription,
  //   })
  // }))

  // async function getStats(peer) {
  //   let bytes = 0
  //   let timestamp = 0
  //   return new Promise((resolve) => {
  //     peer?.peer?.getStats((_, reports) => {
  //       reports.forEach((report) => {
  //         if (report.type === 'outbound-rtp') {
  //           if (report.isRemote)
  //             return
  //           bytes += report.bytesSent
  //           timestamp = report.timestamp
  //           // log('bb', bytes, prevBytes, timestamp, prevTimestamp)
  //           resolve({ bytes, timestamp })
  //         }
  //       })
  //     })
  //   })
  // }

  
  // let prevTimestamp = 0
  // let prevBytes = 0

  // if (!!localStorage?.debug) {
  //   let el = document.createElement("div")
  //   el.className = "bandwidth"
  //   document.body.appendChild(el)

  //   setInterval(async () => {
  //     // const now = performance.now()
  //     let results = await Promise.all(
  //       Object.values(webrtc.peerConnections).map((p) => getStats(p))
  //     )
  //     let bytes = results.reduce((acc, curr) => curr.bytes + acc, 0)
  //     let timestamp = results?.[0]?.timestamp
  //     const bitrate = (8 * (bytes - prevBytes)) / (timestamp - prevTimestamp)
  //     el.textContent = bitrate.toFixed(2) + " Bit/s"
  //     prevBytes = bytes
  //     prevTimestamp = timestamp
  //   }, 1000)
  // }

  return {
    webrtc,
    dispose,
  }
}
