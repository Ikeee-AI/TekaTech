import { describe, expect, it } from 'vitest'
import { AUTO_RELOAD_COOLDOWN_MS, AUTO_RELOAD_KEY, claimAutoReload, isChunkLoadError } from './chunkErrors'

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value)
    },
    data,
  }
}

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://tekatech-web.onrender.com/assets/GadgetDetail-abc123.js',
    'error loading dynamically imported module: https://example.test/assets/Login-x.js',
    'Importing a module script failed.',
    'Unable to preload CSS for /assets/index-abc.css',
    'Loading chunk 42 failed.',
    'Loading CSS chunk compare-page failed.',
  ])('recognises %s', (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true)
  })

  it('recognises an error named ChunkLoadError whatever its message', () => {
    const err = new Error('something')
    err.name = 'ChunkLoadError'
    expect(isChunkLoadError(err)).toBe(true)
  })

  it('accepts a bare string message', () => {
    expect(isChunkLoadError('Failed to fetch dynamically imported module: /x.js')).toBe(true)
  })

  it.each([
    [null],
    [undefined],
    [new Error('Cannot read properties of undefined (reading "name")')],
    [new TypeError('Failed to fetch')], // an ordinary API network error, not a chunk
    [{ message: 42 }],
  ])('does not flag %s', (error) => {
    expect(isChunkLoadError(error)).toBe(false)
  })
})

describe('claimAutoReload', () => {
  it('allows the first reload and records when it happened', () => {
    const storage = memoryStorage()
    expect(claimAutoReload(storage, 1_000_000)).toBe(true)
    expect(storage.data[AUTO_RELOAD_KEY]).toBe('1000000')
  })

  it('refuses a second reload inside the cooldown, so it cannot loop', () => {
    const storage = memoryStorage()
    expect(claimAutoReload(storage, 1_000_000)).toBe(true)
    expect(claimAutoReload(storage, 1_000_000 + AUTO_RELOAD_COOLDOWN_MS - 1)).toBe(false)
  })

  it('allows another reload once the cooldown has passed (a later deploy)', () => {
    const storage = memoryStorage({ [AUTO_RELOAD_KEY]: '1000000' })
    expect(claimAutoReload(storage, 1_000_000 + AUTO_RELOAD_COOLDOWN_MS)).toBe(true)
  })

  it('treats a garbage stored value as no previous attempt', () => {
    expect(claimAutoReload(memoryStorage({ [AUTO_RELOAD_KEY]: 'nope' }), 5)).toBe(true)
  })

  it('never auto-reloads when storage throws (private mode, blocked storage)', () => {
    const throwing = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('SecurityError')
      },
    }
    expect(claimAutoReload(throwing, 1)).toBe(false)
  })

  it('never auto-reloads when there is no storage at all', () => {
    expect(claimAutoReload(null, 1)).toBe(false)
  })
})
