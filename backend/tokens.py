"""Token counting for the two OpenAI models this app uses.

They do NOT share an encoding, and counting with the wrong one silently
reports the wrong size:

    text-embedding-3-small -> cl100k_base
    gpt-5-mini             -> o200k_base

Tokens, not characters, are what OpenAI bills and what model context limits
are measured in. Characters are only a rough proxy — measured on realistic
spec text the ratio ranges from ~1.5 chars/token (Japanese) to ~4.3
(Filipino), so a character cap can permit ~3x the intended cost depending on
what language the text happens to be in.
"""

import tiktoken

# Used to size spec chunks before embedding.
EMBEDDING_ENCODING = tiktoken.get_encoding("cl100k_base")

# Used to size anything that goes into a chat completion prompt.
CHAT_ENCODING = tiktoken.get_encoding("o200k_base")


def count_embedding_tokens(text: str) -> int:
    return len(EMBEDDING_ENCODING.encode(text))


def count_chat_tokens(text: str) -> int:
    return len(CHAT_ENCODING.encode(text))
