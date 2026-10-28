// Word-level diff for the Review Queue's before/after view. Words are compared
// exactly (case and punctuation count); whitespace is kept for display but never
// counts as a change, so re-wrapping a line does not light up the whole spec.

// Above this many DP cells (about 500 x 500 changed words) the LCS table is skipped
// and the differing middle is marked as one removed and one added block instead.
export const MAX_DIFF_CELLS = 250_000

// "  Battery: 4700 mAh" -> [{ ws: '  ', word: 'Battery:' }, { ws: ' ', word: '4700' }, ...]
// plus the text's trailing whitespace, returned separately.
function tokenize(text) {
  const tokens = []
  const re = /(\s*)(\S+)/g
  let match
  let end = 0
  while ((match = re.exec(text)) !== null) {
    tokens.push({ ws: match[1], word: match[2] })
    end = re.lastIndex
  }
  return { tokens, tail: text.slice(end) }
}

// Marks which tokens of a and b are outside a longest common subsequence of words.
function markChanges(a, b) {
  const changedA = new Array(a.length).fill(true)
  const changedB = new Array(b.length).fill(true)

  // Common prefix and suffix are cheap to find and usually most of the text.
  let start = 0
  while (start < a.length && start < b.length && a[start].word === b[start].word) {
    changedA[start] = false
    changedB[start] = false
    start += 1
  }
  let endA = a.length
  let endB = b.length
  while (endA > start && endB > start && a[endA - 1].word === b[endB - 1].word) {
    endA -= 1
    endB -= 1
    changedA[endA] = false
    changedB[endB] = false
  }

  const n = endA - start
  const m = endB - start
  if (n === 0 || m === 0) return { changedA, changedB, coarse: false }
  if (n * m > MAX_DIFF_CELLS) return { changedA, changedB, coarse: true }

  // lcs[i][j] = LCS length of a[start+i..endA) and b[start+j..endB), flattened.
  const width = m + 1
  const lcs = new Uint32Array((n + 1) * width)
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i * width + j] =
        a[start + i].word === b[start + j].word
          ? lcs[(i + 1) * width + j + 1] + 1
          : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1])
    }
  }
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[start + i].word === b[start + j].word) {
      changedA[start + i] = false
      changedB[start + j] = false
      i += 1
      j += 1
    } else if (lcs[(i + 1) * width + j] >= lcs[i * width + j + 1]) {
      i += 1
    } else {
      j += 1
    }
  }
  return { changedA, changedB, coarse: false }
}

// Joins tokens into display segments. Whitespace before a changed run stays
// unchanged; whitespace between two changed words belongs to the run.
function toSegments(tokens, changed, tail) {
  const segments = []
  const push = (text, isChanged) => {
    if (!text) return
    const last = segments[segments.length - 1]
    if (last && last.changed === isChanged) last.text += text
    else segments.push({ text, changed: isChanged })
  }
  tokens.forEach((token, k) => {
    push(token.ws, changed[k] && k > 0 && changed[k - 1])
    push(token.word, changed[k])
  })
  push(tail, false)
  return segments
}

/**
 * Compares two texts word by word.
 * Returns { before, after, identical, coarse }: before/after are lists of
 * { text, changed } segments that rebuild each original text exactly when joined;
 * changed means removed (before) or added (after). coarse is true when the texts
 * were too different to compare word by word and the whole differing middle is marked.
 */
export function diffWords(beforeText, afterText) {
  const a = tokenize(beforeText ?? '')
  const b = tokenize(afterText ?? '')
  const { changedA, changedB, coarse } = markChanges(a.tokens, b.tokens)
  return {
    before: toSegments(a.tokens, changedA, a.tail),
    after: toSegments(b.tokens, changedB, b.tail),
    identical: !changedA.includes(true) && !changedB.includes(true),
    coarse,
  }
}
