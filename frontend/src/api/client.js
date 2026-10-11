import { supabase } from '../supabaseClient'

// Points at the local backend by default; set VITE_API_BASE_URL to the deployed
// backend's origin when building for anywhere other than local dev. Trailing
// slashes are trimmed so `${API_BASE}${path}` can't produce a double slash.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

async function request(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = { "Content-Type": "application/json", ...options.headers }
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`
  }

  const res = await fetch(`${API_BASE}${path}`, { headers, ...options });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getGadgets: () => request("/gadgets"),
  getGadget: (id) => request(`/gadgets/${id}`),
  createGadget: (data) => request("/gadgets", { method: "POST", body: JSON.stringify(data) }),
  updateGadget: (id, data) => request(`/gadgets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteGadget: (id) => request(`/gadgets/${id}`, { method: "DELETE" }),
  getSpecs: (gadgetId) => request(`/gadgets/${gadgetId}/specs`),
  ingestSpecs: (gadgetId, data) => request(`/gadgets/${gadgetId}/specs`, { method: "POST", body: JSON.stringify(data) }),
  indexSpec: (gadgetId, specId) => request(`/gadgets/${gadgetId}/specs/${specId}/index`, { method: "POST" }),
  submitCorrection: (specId, data) => request(`/specs/${specId}/corrections`, { method: "POST", body: JSON.stringify(data) }),
  getCorrections: (status = "pending") => request(`/corrections?status=${status}`),
  resolveCorrection: (id, action) => request(`/corrections/${id}`, { method: "PATCH", body: JSON.stringify({ action }) }),
  createComparisonLink: (gadgetIds) => request(`/comparisons`, { method: "POST", body: JSON.stringify({ gadget_ids: gadgetIds }) }),
  getComparisonBySlug: (slug) => request(`/comparisons/${slug}`),
  askQuestion: (data) => request(`/query`, { method: "POST", body: JSON.stringify(data) }),
  getSpecCoverage: () => request(`/stats/spec-coverage`),
  getTrendingQuestions: () => request(`/stats/trending-questions`),
}