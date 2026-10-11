from openai import OpenAI
from config import settings
from tokens import EMBEDDING_ENCODING as ENCODING  # cl100k_base, matches text-embedding-3-small

client = OpenAI(api_key=settings.openai_api_key)

TARGET_TOKENS = 300  # aim for chunks around this size
MAX_TOKENS = 500     # hard-split any single paragraph bigger than this


def _token_count(text: str) -> int:
    return len(ENCODING.encode(text))


def chunk_text(text: str) -> list[str]:
    """Split raw spec text into ~TARGET_TOKENS-sized chunks, preferring to
    break on paragraph boundaries so related facts stay in the same chunk."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if len(paragraphs) <= 1:
        paragraphs = [p.strip() for p in text.split("\n") if p.strip()]

    chunks: list[str] = []
    current = ""

    for para in paragraphs:
        if _token_count(para) > MAX_TOKENS:
            if current:
                chunks.append(current)
                current = ""
            tokens = ENCODING.encode(para)
            for i in range(0, len(tokens), TARGET_TOKENS):
                chunks.append(ENCODING.decode(tokens[i : i + TARGET_TOKENS]))
            continue

        candidate = f"{current}\n\n{para}" if current else para
        if _token_count(candidate) > TARGET_TOKENS and current:
            chunks.append(current)
            current = para
        else:
            current = candidate

    if current:
        chunks.append(current)

    return chunks


def embed_texts(texts: list[str]) -> list[list[float]]:
    """One API call for all chunks — cheaper and faster than one call each."""
    response = client.embeddings.create(model="text-embedding-3-small", input=texts)
    return [item.embedding for item in response.data]