# Live demo: malformed requests, unauthorized calls and model failure (S4-MA)

For the backend part of the panel session ("malformed request handling, controlled model failure and invalid output, with no secret exposure"). Owner: Manuel Mirasol. AI-assisted (Claude Code); the script and its tests were run and checked by Manuel.

**Time:** about 2 minutes for the malformed requests, 1 minute for the model failure. **Cost:** nothing. **Risk to data:** none; nothing in this page writes, changes or deletes data.

## 1. Malformed and unauthorized requests (one command)

Open `https://tekatech-api.onrender.com/health` a minute earlier to wake the free host (the first request can take 42–55 s), then, from the repository root:

```powershell
python scripts/demo_malformed_requests.py --api-base https://tekatech-api.onrender.com
```

It sends 16 requests and prints the status and the message a user would see. All 16 are refused before they can write data or call OpenAI. Expected output (run on 30 Oct against a local backend on the dev database; **not yet run against production**, so do that once as part of the rehearsal):

| Group | What is sent | Result |
| --- | --- | --- |
| Malformed input | Empty body to `/query` | 422 "Field required" |
| | Empty question | 422 "Question is empty. Type a question first." |
| | Question over 150 characters | 422 "Question is too long: 151 characters; the limit is 150." |
| | Not valid JSON | 422 "JSON decode error" |
| | A bare `NaN` where a true/false is expected | 422 (not a 500) |
| | A gadget id that is not a UUID | 422 "Input should be a valid UUID…" |
| | Six gadgets in one question (limit 5) | 422 "List should have at most 5 items…" |
| | Compare only one gadget | 422 "Pick at least 2 different gadgets to compare." |
| | Path id that is not a UUID | 422 |
| | `limit=999` on trending questions | 422 "Input should be less than or equal to 10" |
| Not allowed | Create a gadget with no login | 401 "Login required" |
| | Create a gadget with a fake token | 401 "Invalid or expired session" |
| | Delete a gadget with no login | 401 "Login required" |
| | Read the admin review queue with no login | 401 "Login required" |
| Not found | A well-formed id that matches no gadget | 404 "Gadget not found" |
| | A share link that does not exist | 404 "Link not found" |

The last line should read: *"Every request was refused safely: expected status, no stack trace, key or file path, and a request id on each."* If anything fails it lists the problem and exits with code 1.

### What to say
- "Bad input is stopped before it reaches our code: the backend validates every field and answers with a plain sentence, never a stack trace."
- "Protected routes refuse anyone without a valid login. The admin routes refuse non-admins as well, and the admin flag can't be set from the browser."
- "Every answer carries a request id, so a problem can be found in the logs without exposing anything to the user."
- "The script also checks every answer for a traceback, a server file path or key-shaped text. None appears."

### If something looks off
| Seen | Meaning |
| --- | --- |
| `Could not reach …` | The free host is asleep. Open `/health`, wait for it, run again. |
| A `FAILED:` list | A real regression: do not demo; tell Manuel. The same cases run in CI (`backend/tests/test_demo_malformed_requests.py`), so this should not reach `main`. |

## 2. Controlled model failure and invalid output

These need an admin, so they are shown from **evidence**, not live (a live run would mean turning the failure flag on in production, which is only allowed in the supervised window, `backend/README.md`, "Supervised production drill").

| Mode | What the app answers | Evidence |
| --- | --- | --- |
| `timeout` | 503 "The AI took too long to answer. Please try again." | Dev drill (PR #151, `failure-drill-dev-2026-10-28.md`) and production drill (PR #153, `failure-drill-prod-2026-10-28.md`) |
| `quota` | 503 "AI answers are temporarily unavailable. Spec browsing still works." | same |
| `bad_output` (invalid output) | 503 "The AI returned an answer we couldn't use. Please rephrase and try again." | same |
| `empty` | 200, "couldn't find any spec information", 0 sources | same |

In the browser, each of these shows a safe message and keeps the typed question; press **Try Again** (`frontend/e2e/`, run in CI on every change).

What to say: "We simulate each failure without calling OpenAI. The simulator only works for an admin, with a header, and only when a flag is on; it is off in production. A normal user or an anonymous caller who sends the same header gets a normal answer, which we showed on both dev and production."

## 3. Backup if the site is down
Show the saved output below, say plainly that it is a recording, and move on.

```
== Malformed input
  Empty body                                     -> 422  Field required
  Question over 150 characters                   -> 422  Question is too long: 151 characters; the limit is 150.
  Compare only one gadget                        -> 422  Pick at least 2 different gadgets to compare.
== Not allowed
  Create a gadget with no login                  -> 401  Login required
  Create a gadget with a fake token              -> 401  Invalid or expired session
== Not found
  A share link that does not exist               -> 404  Link not found
```

## 4. One request by hand (optional)
Windows PowerShell mangles inline JSON, so use `curl.exe` and a file:

```powershell
'{"question": ""}' | Set-Content body.json -Encoding ascii
curl.exe -i -X POST https://tekatech-api.onrender.com/query -H "Content-Type: application/json" -d "@body.json"
```

Point at the status line (`422`), the plain message, and the `X-Request-ID` header.
