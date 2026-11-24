import { supabase } from '../supabaseClient'
import { trackRequest } from './serverStatus'

// Points at the local backend by default; set VITE_API_BASE_URL to the deployed
// backend's origin when building for anywhere other than local dev. Trailing
// slashes are trimmed so `${API_BASE}${path}` can't produce a double slash.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

// Fired after every AI question (answered or refused), so the "X of 20 left today" badge refreshes.
export const AI_USAGE_EVENT = 'tekatech:ai-usage-changed'

async function authHeaders(options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  // A FormData body (photo upload) must not get the JSON type: the browser sets
  // multipart/form-data with its boundary itself.
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData
  const headers = { ...(isForm ? {} : { "Content-Type": "application/json" }), ...options.headers }
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`
  }
  return headers
}

async function errorFrom(res) {
  const error = await res.json().catch(() => ({ detail: res.statusText }));
  // FastAPI validation errors arrive as a list of { msg } objects.
  const detail = Array.isArray(error.detail)
    ? error.detail.map((d) => d.msg).filter(Boolean).join("; ")
    : error.detail;
  const err = new Error(detail || `Request failed (${res.status})`);
  err.status = res.status;
  return err
}

async function request(path, options = {}) {
  const headers = await authHeaders(options)

  // Lets the UI show "server is waking up" if this takes a cold-start's time.
  const settle = trackRequest(path);
  let res;
  try {
    // Options first, then the merged headers: spreading options last would let
    // a caller's own `headers` object replace these and drop Authorization.
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (err) {
    settle(false);
    throw err;
  }
  settle(true);
  if (!res.ok) throw await errorFrom(res);
  if (res.status === 204) return null;
  return res.json();
}

// True where the browser can read a response body as it arrives (not in jsdom tests).
function canStream() {
  return typeof ReadableStream !== "undefined" && typeof TextDecoder !== "undefined"
}

// POST /query/stream (23 Nov 2026): server-sent events `sources`, `delta`, `done`, `error`, and
// `reset` (24 Nov 2026: a streamed decline is being replaced by a web or general-knowledge answer).
// Resolves with the `done` answer (the same shape as POST /query); an `error` event throws
// like a failed request, so the panels show the same error screens.
async function streamQuery(body, { onSources, onDelta, onReset }) {
  const options = { method: "POST", body: JSON.stringify(body) }
  const headers = await authHeaders(options)
  const settle = trackRequest("/query/stream");
  let res;
  try {
    res = await fetch(`${API_BASE}/query/stream`, { ...options, headers });
  } catch (err) {
    settle(false);
    throw err;
  }
  settle(true);
  if (!res.ok) throw await errorFrom(res);
  if (!res.body) return res.json()
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  for (;;) {
    const { value, done } = await reader.read()
    if (value) buffer += decoder.decode(value, { stream: true })
    let cut
    while ((cut = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, cut)
      buffer = buffer.slice(cut + 2)
      const kind = /^event: (.*)$/m.exec(block)?.[1]
      const raw = /^data: (.*)$/m.exec(block)?.[1]
      if (!kind || raw === undefined) continue
      const data = JSON.parse(raw)
      if (kind === "sources") onSources?.(data)
      else if (kind === "delta") onDelta?.(data)
      else if (kind === "reset") onReset?.()
      else if (kind === "done") return data
      else if (kind === "error") {
        const err = new Error(data.detail || `Request failed (${data.status})`)
        err.status = data.status
        throw err
      }
    }
    if (done) break
  }
  throw new Error("The answer stream ended early. Please try again.")
}

export const api = {
  getGadgets: () => request("/gadgets"),
  getGadget: (id) => request(`/gadgets/${id}`),
  createGadget: (data) => request("/gadgets", { method: "POST", body: JSON.stringify(data) }),
  updateGadget: (id, data) => request(`/gadgets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteGadget: (id) => request(`/gadgets/${id}`, { method: "DELETE" }),
  // Admin-only (#202): stores the photo and sets the gadget's image_url; returns the updated gadget.
  uploadGadgetImage: (id, file) => {
    const body = new FormData()
    body.append("file", file)
    return request(`/gadgets/${id}/image`, { method: "POST", body })
  },
  getSpecs: (gadgetId) => request(`/gadgets/${gadgetId}/specs`),
  ingestSpecs: (gadgetId, data) => request(`/gadgets/${gadgetId}/specs`, { method: "POST", body: JSON.stringify(data) }),
  // Admin-only (#127); used by DeleteSpecButton.
  deleteSpec: (gadgetId, specId) => request(`/gadgets/${gadgetId}/specs/${specId}`, { method: "DELETE" }),
  indexSpec: (gadgetId, specId) => request(`/gadgets/${gadgetId}/specs/${specId}/index`, { method: "POST" }),
  // Published game and chip benchmarks (24 Nov 2026): public read, admin writes.
  getBenchmarks: (gadgetId) => request(`/gadgets/${gadgetId}/benchmarks`),
  addBenchmark: (gadgetId, data) => request(`/gadgets/${gadgetId}/benchmarks`, { method: "POST", body: JSON.stringify(data) }),
  deleteBenchmark: (gadgetId, id) => request(`/gadgets/${gadgetId}/benchmarks/${id}`, { method: "DELETE" }),
  // Admin-only web search drafts (kind "specs" | "benchmarks"); nothing is saved by this call.
  draftFromWeb: (gadgetId, kind) => request(`/gadgets/${gadgetId}/web-drafts`, { method: "POST", body: JSON.stringify({ kind }) }),
  submitCorrection: (specId, data) => request(`/specs/${specId}/corrections`, { method: "POST", body: JSON.stringify(data) }),
  getCorrections: (status = "pending") => request(`/corrections?status=${status}`),
  // The caller's own suggestions; the backend scopes this to the session user.
  getMyCorrections: () => request(`/corrections/mine`),
  getPendingCorrectionCount: () => request(`/corrections/pending-count`),
  resolveCorrection: (id, action) => request(`/corrections/${id}`, { method: "PATCH", body: JSON.stringify({ action }) }),
  // Admin-only, read-only (#206).
  getAdminOverview: () => request(`/admin/overview`),
  createComparisonLink: (gadgetIds) => request(`/comparisons`, { method: "POST", body: JSON.stringify({ gadget_ids: gadgetIds }) }),
  getComparisonBySlug: (slug) => request(`/comparisons/${slug}`),
  // With onDelta/onSources (useAiAnswer's startStream), the answer streams from /query/stream;
  // the handlers are never sent. Without them, or where streaming is unavailable, plain /query.
  askQuestion: async ({ onDelta, onSources, onReset, ...data }) => {
    try {
      if (onDelta && canStream()) return await streamQuery(data, { onDelta, onSources, onReset })
      return await request(`/query`, { method: "POST", body: JSON.stringify(data) })
    } finally {
      if (typeof window !== "undefined") window.dispatchEvent(new Event(AI_USAGE_EVENT))
    }
  },
  // { limit, remaining, resets_at } for the signed-in user; all null for admins (no daily limit).
  getAiUsage: () => request(`/me/ai-usage`),
  getSpecCoverage: () => request(`/stats/spec-coverage`),
  getTrendingQuestions: () => request(`/stats/trending-questions`),
  // My Gadgets: the session user's personal list of catalog gadgets (backend scopes to the caller).
  getMyGadgets: () => request(`/me/gadgets`),
  addMyGadget: (gadgetId) => request(`/me/gadgets/${gadgetId}`, { method: "PUT" }),
  removeMyGadget: (gadgetId) => request(`/me/gadgets/${gadgetId}`, { method: "DELETE" }),
  // The signed-in user's saved questions about one set of phones (compare page; POST /query saves
  // them, user_comparison_questions.sql), oldest first. ids: the gadget ids, any order.
  getComparisonQuestions: (ids) => request(`/me/comparisons/questions?ids=${ids.map(encodeURIComponent).join(",")}`),
  clearComparisonQuestions: (ids) =>
    request(`/me/comparisons/questions?ids=${ids.map(encodeURIComponent).join(",")}`, { method: "DELETE" }),
  // The signed-in user's saved questions about one gadget (POST /query saves them), oldest first.
  getGadgetQuestions: (gadgetId) => request(`/me/gadgets/${gadgetId}/questions`),
  clearGadgetQuestions: (gadgetId) => request(`/me/gadgets/${gadgetId}/questions`, { method: "DELETE" }),
  // Deletes the session user's own account and data (#213): 204 → null; 409 for an admin account.
  deleteMyAccount: () => request(`/me/account`, { method: "DELETE" }),
}