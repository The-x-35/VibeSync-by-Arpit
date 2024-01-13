import { assertModules, on, onInit, register } from '@zerva/core'
import '@zerva/websocket'
import type { Channel } from 'zeed'
import { Logger, size, uname } from 'zeed'

const log = Logger('room')

const moduleName = 'room'
const start = new Date().getTime()

interface RoomPeer {
  id: string
  emit(name: string, data: any): void
  channel: Channel
}

interface Room {
  domain: string
  name: string
  peers: Record<string, RoomPeer>
}

export function useRoom() {
  log('setup')
  register(moduleName)

  const domains: Record<string, Record<string, Room>> = {}

  // const roomsFileName = 'data/rooms.json'
  // if (existsSync(roomsFileName)) {
  //   const content = readFileSync(roomsFileName, 'utf-8')
  //   if (content)
  //     Object.assign(domains, JSON.parse(content))
  // }

  // onStop(async () => {
  //   try {
  //     log(`save rooms to ${roomsFileName}`)
  //     const content = JSON.stringify(domains, null, 2)
  //     writeFileSync(roomsFileName, content, 'utf-8')
  //   }
  //   catch (err) {
  //     log.warn(`writing rooms to ${roomsFileName} failed!`, err)
  //   }
  // })

  onInit(() => {
    assertModules('websocket')
  })

  const useConnection = (channel: Channel) => {
    const peerId = uname('peer') // uuid()

    const log = Logger(`${peerId}::${moduleName}`)
    log.info('useConnection')

    let roomInfo: Room

    function channelEmit(name: string, data: any) {
      channel.postMessage(JSON.stringify({ name, data }))
    }

    const methods = {
      join: (data: any) => {
        const { room, domain = 'default' } = data

        if (!room) {
          log.warn('join without room')
          return
        }

        log(`join domain=${domain}, room=${room}`)

        if (roomInfo) {
          log.warn('Tries to connect more than once.')
          return
        }

        // Get / create domain for rooms
        let rooms = domains[domain]
        if (rooms == null) {
          rooms = {}
          domains[domain] = rooms
        }

        // Get / create room
        roomInfo = rooms[room]
        if (roomInfo == null) {
          roomInfo = {
            domain,
            name: room,
            peers: {},
          }
          rooms[room] = roomInfo
        }

        // Existing peers 
        const peers = [...Object.keys(roomInfo.peers)]

        // Add self
        roomInfo.peers[peerId] = {
          id: peerId,
          channel,
          emit: channelEmit,
        }

        // Let client know
        channelEmit('joined', {
          room,
          peers,
          self: peerId,
        })
      },

      signal: (data: any) => {
        const { from, to } = data
        log('signal', data.length, 'to', to)
        if (from !== peerId) {
          log.warn('Strange message that was not sent by us.')
        }
        else if (to) {
          const peer = roomInfo?.peers[to]
          if (!peer)
            log.warn(`Cannot find peer ${to} for sending signal.`)
          else
            peer.emit('signal', data)
        }
        else {
          log.warn('Missing data for signal.')
        }
        // log('signal')
      },

      status: (info: any) => {
        log('status', info)
        channelEmit('status', {
          api: 1,
          pong: info?.ping || 'pong',
          config: {},
        })
      },
    }

    channel.on('message', (event) => {
      try {
        const { name, data } = JSON.parse(event.data)
        // log(`onMessage "${name}":`, data)
        methods[name]?.(data)
      }
      catch (err) {
        log.error('onMessage error:', err)
      }
    })

    channel.on('close', () => {
      // log('close')
      delete roomInfo.peers[peerId]

      if (size(roomInfo.peers) <= 0) {
        try {
          delete domains[roomInfo.domain][roomInfo.name]
        }
        catch (error) {
          log.warn('Remove room failed', error, roomInfo)
        }
      }
      else {
        for (const peer of Object.values(roomInfo.peers))
          peer.emit('remove', peerId)
      }

      roomInfo = undefined
    })
  }

  on('webSocketConnect', ({ channel }) => {
    // log('webSocketConnect')
    useConnection(channel)
  })

  // DEBUG

  const TOKEN = process.env.ROOMS_STATUS_TOKEN
  if (TOKEN) {
    on('httpInit', ({ get }) => {
      get('_/rooms.json', ({ req }) => {
        const token = req.query.token
        log('token', token, TOKEN, domains)
        if (token !== TOKEN)
          return 404

        const outDomains = {}
        for (const [domain, rooms] of Object.entries(domains)) {
          const outRooms = {}
          for (const [name, room] of Object.entries(rooms)) {
            outRooms[name] = {
              peers: size(room.peers),
            }
          }
          outDomains[domain] = outRooms
        }

        return {
          api: 1,
          start,
          domains: outDomains,
        }
      })
    })
  }
}
