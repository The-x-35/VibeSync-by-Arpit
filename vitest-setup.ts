import { MemStorage, getGlobalLogger, setupEnv } from 'zeed'


getGlobalLogger().setLock(true)

// eslint-disable-next-line no-console
console.info('vitest setup performed!')

setupEnv()

// @ts-expect-error
globalThis.navigator = { language: 'en', userAgent: '' }

// @ts-expect-error
globalThis.location = {
  protocol: 'http:',
  host: 'localhost:8080',
}

// @ts-expect-error
globalThis.window = {}

// @ts-expect-error
globalThis.localStorage = new MemStorage()
