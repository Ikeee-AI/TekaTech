// Answers the app's API calls inside the browser, so the checks need no backend,
// database, login or OpenAI. POST /query replies come from a queue the test sets,
// using the backend's real 503 sentences (fixtures/query-failures.json).
import { readFileSync } from 'node:fs'

export const FAILURES = JSON.parse(readFileSync(new URL('../fixtures/query-failures.json', import.meta.url), 'utf-8'))

export const IPHONE = { id: '11111111-1111-4111-8111-111111111111', name: 'iPhone 15', brand: 'Apple' }
export const GALAXY = { id: '22222222-2222-4222-8222-222222222222', name: 'Galaxy S24', brand: 'Samsung' }

const GADGETS = [IPHONE, GALAXY].map((g) => ({
  ...g,
  category: 'Smartphone',
  release_date: null,
  price_php: null,
  image_url: null,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
}))

const spec = (g) => ({
  id: `${g.id.slice(0, -4)}5555`,
  gadget_id: g.id,
  content: `${g.name}: A-series chip.`,
  source_url: null,
  chunk_index: 0,
  verified_at: '2026-10-01T00:00:00Z',
  indexing_status: 'indexed',
})

/** The reply POST /query sends when an answer works. */
export function answer(gadget = IPHONE) {
  return {
    status: 200,
    body: {
      answer: `The ${gadget.name} uses an A-series chip [1].`,
      sources: [{ gadget_id: gadget.id, gadget_name: gadget.name, content: spec(gadget).content, source_url: null, similarity: 0.82 }],
      model_used: 'e2e-fake',
      invalid_citations_removed: 0,
    },
  }
}

/** The reply for one failure-drill mode, as the backend sends it. */
export function drillReply(mode) {
  switch (mode) {
    case 'timeout':
      return { status: 503, body: { detail: FAILURES.timeout } }
    case 'quota': // provider error: quota, rate limit, outage
      return { status: 503, body: { detail: FAILURES.unavailable } }
    case 'bad_output':
      return { status: 503, body: { detail: FAILURES.unusable } }
    case 'empty': // retrieval found nothing: a normal answer with no sources
      return { status: 200, body: { answer: 'No specs on file answer this question.', sources: [], model_used: 'e2e-fake', invalid_citations_removed: 0 } }
    default:
      throw new Error(`Unknown drill mode: ${mode}`)
  }
}

// Not a real token: the fake API never checks it and the fake Supabase address is blocked.
const FAKE_SESSION = {
  access_token: 'e2e-not-a-real-token',
  refresh_token: 'e2e-not-a-real-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 4102444800, // 2100-01-01: never refreshed during a run
  user: {
    id: '99999999-9999-4999-8999-999999999999',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'e2e@example.test',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-10-01T00:00:00Z',
  },
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}

/**
 * Installs the fake API on a page. `queryReplies` are used in order for each
 * POST /query; the last one repeats. Returns the list of /query request bodies.
 */
export async function useFakeApi(page, queryReplies) {
  const queue = [...queryReplies]
  const queries = []

  // Auth is only read from local storage here; block anything that tries the network.
  await page.route('http://supabase.e2e.test/**', (route) => route.abort())
  // Phone pages and compare are members-only since 14 Nov 2026, so the journeys start signed
  // in: a fake, never-expiring session where supabase-js keeps it (sb-<host prefix>-auth-token).
  await page.addInitScript((session) => {
    localStorage.setItem('sb-supabase-auth-token', JSON.stringify(session))
  }, FAKE_SESSION)

  await page.route('http://api.e2e.test/**', async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    const json = (status, body) =>
      route.fulfill({ status, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })

    if (request.method() === 'POST' && (pathname === '/query' || pathname === '/query/stream')) {
      queries.push(request.postDataJSON())
      const reply = queue.length > 1 ? queue.shift() : queue[0]
      if (pathname === '/query') return json(reply.status, reply.body)
      // /query/stream, as the backend sends it: a refusal (401/422/429) is plain JSON before
      // streaming; a 5xx happens while answering, so it is an `error` event in a 200 stream.
      if (reply.status < 500 && reply.status !== 200) return json(reply.status, reply.body)
      const ev = (kind, data) => `event: ${kind}
data: ${JSON.stringify(data)}

`
      const body =
        reply.status === 200
          ? ev('sources', reply.body.sources ?? []) + ev('delta', reply.body.answer ?? '') + ev('done', reply.body)
          : ev('error', { status: reply.status, detail: reply.body.detail })
      return route.fulfill({ status: 200, headers: { ...CORS, 'Content-Type': 'text/event-stream' }, body })
    }

    const specsMatch = pathname.match(/^\/gadgets\/([^/]+)\/specs$/)
    if (specsMatch) {
      const g = GADGETS.find((x) => x.id === specsMatch[1])
      return json(200, g ? [spec(g)] : [])
    }
    const gadgetMatch = pathname.match(/^\/gadgets\/([^/]+)$/)
    if (gadgetMatch) {
      const g = GADGETS.find((x) => x.id === gadgetMatch[1])
      return g ? json(200, g) : json(404, { detail: 'Gadget not found' })
    }
    if (pathname === '/gadgets') return json(200, GADGETS)

    // Anything else (stats, popular questions…) is not part of these journeys.
    return json(200, [])
  })

  return queries
}
