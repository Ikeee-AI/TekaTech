import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'

vi.mock('../supabaseClient', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } },
}))

// A response body that arrives in the given pieces, as a real stream would.
function sse(pieces, status = 200) {
  const encoder = new TextEncoder()
  const body = new ReadableStream({
    start(controller) {
      for (const p of pieces) controller.enqueue(encoder.encode(p))
      controller.close()
    },
  })
  return new Response(body, { status, headers: { 'Content-Type': 'text/event-stream' } })
}

const ev = (kind, data) => `event: ${kind}\ndata: ${JSON.stringify(data)}\n\n`

afterEach(() => vi.unstubAllGlobals())

describe('api.askQuestion streaming', () => {
  it('posts to /query/stream without the handlers and passes sources and text as they arrive', async () => {
    const done = { answer: 'Fast [1].', sources: [{ gadget_name: 'V50' }] }
    const whole = ev('sources', [{ gadget_name: 'V50' }]) + ev('delta', 'Fa') + ev('delta', 'st [1].') + ev('done', done)
    // Split mid-event, as network chunks are.
    const fetchMock = vi.fn().mockResolvedValue(sse([whole.slice(0, 30), whole.slice(30, 61), whole.slice(61)]))
    vi.stubGlobal('fetch', fetchMock)
    const onSources = vi.fn()
    const deltas = []
    const result = await api.askQuestion({ question: 'Q?', gadget_ids: ['g1'], onSources, onDelta: (d) => deltas.push(d) })
    expect(result).toEqual(done)
    expect(onSources).toHaveBeenCalledWith([{ gadget_name: 'V50' }])
    expect(deltas.join('')).toBe('Fast [1].')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/query\/stream$/)
    expect(JSON.parse(init.body)).toEqual({ question: 'Q?', gadget_ids: ['g1'] })
    expect(init.headers.Authorization).toBe('Bearer tok')
  })

  it('a reset event withdraws the streamed decline before the replacement answer', async () => {
    const done = { answer: 'From the web [1].', answer_basis: 'web', sources: [] }
    const order = []
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sse([
      ev('sources', [{ gadget_name: 'S24' }]), ev('delta', 'The snippets do not state it.'), ev('reset', null), ev('done', done),
    ])))
    const result = await api.askQuestion({
      question: 'Q?', onSources: () => order.push('sources'), onDelta: () => order.push('delta'), onReset: () => order.push('reset'),
    })
    expect(order).toEqual(['sources', 'delta', 'reset'])
    expect(result).toEqual(done)
  })

  it('an error event throws with its status, like a failed request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sse([ev('delta', 'Half'), ev('error', { status: 503, detail: 'Cut off.' })])))
    await expect(api.askQuestion({ question: 'Q?', onDelta: () => {} })).rejects.toMatchObject({ status: 503, message: 'Cut off.' })
  })

  it('a refusal before streaming (429) throws the JSON detail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Daily limit.' }), { status: 429 })))
    await expect(api.askQuestion({ question: 'Q?', onDelta: () => {} })).rejects.toMatchObject({ status: 429, message: 'Daily limit.' })
  })

  it('without handlers it still uses plain /query', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ answer: 'A', sources: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await api.askQuestion({ question: 'Q?' })
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/query$/)
  })
})
