// #202: the photo upload goes out as multipart with the Bearer token, without the JSON content type.
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../supabaseClient', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok-123' } } }) } },
}))

import { api } from './client'

afterEach(() => vi.unstubAllGlobals())

describe('api.uploadGadgetImage', () => {
  it('posts the file as FormData with the session token and lets the browser set the content type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'g1', image_url: 'https://x.supabase.co/a.png' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const file = new File([new Uint8Array([1, 2, 3])], 'p.png', { type: 'image/png' })

    const gadget = await api.uploadGadgetImage('g1', file)

    expect(gadget.image_url).toBe('https://x.supabase.co/a.png')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/gadgets\/g1\/image$/)
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
    expect(init.body.get('file')).toBeInstanceOf(File)
    expect(init.headers.Authorization).toBe('Bearer tok-123')
    expect(init.headers['Content-Type']).toBeUndefined()
  })

  it('surfaces the API detail and status on a refusal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'The photo is larger than 2 MB.' }), { status: 413 })),
    )
    await expect(api.uploadGadgetImage('g1', new File(['x'], 'p.png'))).rejects.toMatchObject({
      status: 413,
      message: 'The photo is larger than 2 MB.',
    })
  })

  it('still sends JSON bodies with the JSON content type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await api.updateGadget('g1', { name: 'X' })
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBe('application/json')
  })
})
