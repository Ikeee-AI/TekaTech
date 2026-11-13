// Renders exactly three things from the model's answer: [n] citations, **bold** and
// "- " bullets. The prompt in backend/prompts.py promises only these, so change
// both together or neither.

function Citation({ number, source, onCiteClick }) {
  const label = source ? `Source ${number}: ${source.gadget_name}` : `Source ${number}`
  return (
    <button
      type="button"
      onClick={() => onCiteClick?.(number - 1)}
      aria-label={`${label}. Show this source`}
      title={label}
      className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 mx-0.5 align-baseline text-xs font-bold leading-none text-rail-900 bg-rail-100 border border-rail-300 rounded-md hover:bg-rail-200 hover:border-rail-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-600 focus-visible:ring-offset-1"
    >
      {number}
    </button>
  )
}

function renderInline(text, sources, onCiteClick) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[\d+\])/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      )
    }
    const citeMatch = part.match(/^\[(\d+)\]$/)
    if (citeMatch) {
      const number = Number(citeMatch[1])
      const source = sources?.[number - 1]
      // A citation with no matching source can't be followed, so it stays plain text
      // instead of becoming a button that does nothing.
      if (sources && !source) return part
      return <Citation key={i} number={number} source={source} onCiteClick={onCiteClick} />
    }
    return part
  })
}

const BULLET = /^[-•]\s/

// Splits the answer into an optional lead-in line plus bullet items, or returns null
// when it should render as plain paragraphs. The rule the prompt promises: two or more
// bullets become a list only when at most one non-bullet line precedes them and no
// non-bullet line follows. Anything else stays paragraphs, so a stray "- " is shown
// as written rather than guessed at.
function splitBulletList(lines) {
  const intro = lines.length > 0 && !BULLET.test(lines[0].trim()) ? lines[0] : null
  const items = intro === null ? lines : lines.slice(1)
  if (items.length < 2 || !items.every((l) => BULLET.test(l.trim()))) return null
  return { intro, items: items.map((l) => l.trim().replace(/^[-•]\s*/, '')) }
}

export default function AnswerText({ text, sources, onCiteClick }) {
  const lines = text.split('\n').filter((l) => l.trim() !== '')
  const list = splitBulletList(lines)

  if (list) {
    return (
      <div className="space-y-2.5">
        {list.intro !== null && (
          <p className="text-[15px] text-slate-800 leading-7">{renderInline(list.intro, sources, onCiteClick)}</p>
        )}
        <ul className="space-y-2 list-disc pl-5 marker:text-rail-600">
          {list.items.map((item, i) => (
            <li key={i} className="text-[15px] text-slate-800 leading-7">
              {renderInline(item, sources, onCiteClick)}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {lines.map((line, i) => (
        <p key={i} className="text-[15px] text-slate-800 leading-7">
          {renderInline(line, sources, onCiteClick)}
        </p>
      ))}
    </div>
  )
}
