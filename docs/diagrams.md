# TekaTech flow diagrams

Four request-level flows that complement the [system architecture](architecture.md), the [database ERD](database.md) and the [CI/CD pipeline](../PIPELINE.md). Each one is drawn from the code as it stands at the Demo Day freeze (27 Nov 2026).

## 1. Asking the AI a question (`POST /query/stream`)

Interactive version with source links for every participant: [AI answer: RAG, chat, General Knowledge and web search](diagrams/ai-answer.html) (Archify; download and open in a browser, source in [ai-answer.archify.json](diagrams/ai-answer.archify.json)).

One question about a phone, or a comparison of 2–5 phones. Facts come only from the saved snippets; the backend checks the answer before the browser keeps it.

```mermaid
sequenceDiagram
  autonumber
  actor U as Signed-in user
  participant B as Browser (React)
  participant API as FastAPI (Railway)
  participant DB as Supabase Postgres + pgvector
  participant AI as OpenAI

  U->>B: Types a question on a phone or compare page
  B->>API: POST /query/stream (Bearer token, question, gadget ids, last 5 turns)
  API->>API: Check sign-in, 10/min rate limit, 20/day quota, char + token caps
  alt Not signed in, over a limit, or invalid body
    API-->>B: 401 / 429 / 422 as plain JSON
  else Accepted
    API->>AI: Embed question (text-embedding-3-small)
    AI-->>API: Vector
    API->>DB: match_spec_documents (top chunks for the asked phones)
    DB-->>API: Spec snippets
    opt Question is about performance or games
      API->>DB: Benchmark rows (up to 12, each with a source link)
    end
    API-->>B: SSE "sources" (numbered snippets)
    API->>AI: Prompt v4 + numbered snippets (untrusted data) + history
    AI-->>API: Streamed answer
    API-->>B: SSE "delta" chunks while it streams
    API->>API: Remove citations to snippets not sent, fix (n) markers, drop stand-in variant values
    alt Specs hold none of the answer and the user turned on general knowledge or web search
      API-->>B: SSE "reset"
      API->>AI: General-knowledge prompt or Responses web_search (5/user/day)
      AI-->>API: Fallback answer, labelled as not from the saved specs
    end
    API->>DB: Save the turn to the user's thread, token usage to query_history
    API-->>B: SSE "done" (final cleaned answer + Server-Timing)
    B-->>U: Answer with clickable [n] citations
  end
  Note over API,AI: Provider error, timeout or a cut-off answer becomes a readable 503, never a partial answer
```

## 2. Sign-in and authorization

The browser talks to Supabase only to sign in. Every data request goes through the backend, which decides access in route code (the service-role key bypasses RLS).

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant B as Browser
  participant SA as Supabase Auth
  participant API as FastAPI
  participant DB as Supabase Postgres

  U->>B: Email + password
  B->>SA: Sign in (publishable key, PKCE)
  SA-->>B: Session with access token
  B->>API: Request with Authorization: Bearer token
  API->>SA: get_user(token)
  SA-->>API: User + app_metadata
  alt No or invalid token on a protected route
    API-->>B: 401 Login required
  else Admin-only route and app_metadata.is_admin is not true
    API-->>B: 403
  else Allowed
    API->>DB: Query scoped to the session user (service-role key)
    DB-->>API: Rows
    API-->>B: 200 JSON
  end
  Note over B,API: Public without sign-in: catalog reads, spec text, benchmarks, /health, /version
```

## 3. Saving and indexing a phone's specs (admin)

Saving never needs the AI provider, so an OpenAI outage cannot lose spec text.

```mermaid
flowchart TD
  A["Admin pastes spec text"] --> S["POST /gadgets/{id}/specs"]
  S --> C["chunk_text(): split into chunks"]
  C --> P[("spec_documents rows<br/>embedding NULL, status pending")]
  P --> I["POST /gadgets/{id}/specs/{spec_id}/index"]
  I --> E{"OpenAI embedding call"}
  E -->|ok| M{"Chunk text unchanged<br/>since the request?"}
  M -->|yes| V[("Vector saved,<br/>status indexed")]
  M -->|no| X["Skip: stale vector never stored"]
  E -->|provider error or timeout| K["Readable 503;<br/>saved text kept, retry later"]
  V --> R["Available to retrieval<br/>(match_spec_documents)"]
  U["User submits a correction<br/>on a spec chunk"] --> Q["Admin reviews"]
  Q -->|approved| W["Chunk text replaced,<br/>pending until re-indexed"]
  W --> I
  Q -->|rejected| Z["Never reaches the AI context"]
```

## 4. Rollback and incident recovery

Used when a deploy passes CI but production misbehaves. Rehearsed in 1 min 35 s (31 Oct) and 1 min 17 s on Railway (12 Nov); see the [deploy runbook](deploy-runbook.md) and the [incident log](devops/incidents.md).

```mermaid
flowchart TD
  D["Main CI run deploys a merge"] --> S{"Deployed smoke check<br/>(live commit, 23 phones, CORS)"}
  S -->|pass| OK["Production healthy"]
  S -->|fail| N["DevOps Engineer notified<br/>(failed run on main)"]
  OK -.->|"later report of a problem"| N
  N --> T{"Cause in the new code?"}
  T -->|yes| RB["Run 'Rollback production' workflow<br/>with the last good SHA"]
  RB --> V1["Check the SHA is a checked commit on main"]
  V1 --> RD["Render hook + railway up<br/>at that SHA"]
  RD --> SM{"Same smoke check"}
  SM -->|pass| REC["Recovered: log minutes in incidents.md"]
  T -->|"data damaged"| DBR["Restore database from backup<br/>(rehearsed in 14.0 s)"]
  DBR --> REC
  T -->|"no: host or provider"| H["Fix config on Railway / Render,<br/>redeploy, smoke check"]
  H --> REC
  REC --> FIX["Fix PR: review, checks, merge,<br/>normal deploy"]
```
