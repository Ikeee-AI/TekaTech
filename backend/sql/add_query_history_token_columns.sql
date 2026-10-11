-- Token usage columns for query_history.
--
-- Every OpenAI response already reports exactly how many tokens a request
-- consumed; without somewhere to put it that data was being discarded, leaving
-- no way to answer "what used up the credit?" after the fact.
--
-- Costs are split because the two calls are billed at different rates:
--   embedding_tokens  - the /query embedding call (text-embedding-3-small)
--   prompt_tokens     - chat completion input  (system prompt + retrieved context)
--   completion_tokens - chat completion output (the generated answer)
--
-- Safe to run more than once. The application tolerates these columns not
-- existing yet, so applying this is what switches the telemetry on.
--
-- Run once in the Supabase SQL editor (Database > SQL Editor).

alter table query_history
  add column if not exists embedding_tokens  integer,
  add column if not exists prompt_tokens     integer,
  add column if not exists completion_tokens integer;

-- Handy afterwards: total spend-shaped usage per day
--
--   select date_trunc('day', created_at) as day,
--          count(*) as queries,
--          sum(embedding_tokens)  as embedding_tokens,
--          sum(prompt_tokens)     as prompt_tokens,
--          sum(completion_tokens) as completion_tokens
--   from query_history
--   group by 1
--   order by 1 desc;
