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
      className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 mx-0.5 align-baseline text-xs font-bold leading-none text-sage-900 bg-sage-100 border border-sage-300 rounded-md hover:bg-sage-200 hover:border-sage-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600 focus-visible:ring-offset-1"
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

// Splits the answer into an optional lead-in line, bullet items and an optional closing
// line, or returns null when it should render as plain paragraphs. Two or more bullets
// become a list when at most one non-bullet line precedes them and at most one follows
// (the prompt asks for no closing line, but comparison answers often end with a one-line
// verdict; 24 Nov 2026 prod test). Anything else stays paragraphs, so a stray "- " is
// shown as written rather than guessed at.
function splitBulletList(lines) {
  const isBullet = (l) => BULLET.test(l.trim())
  const intro = lines.length > 0 && !isBullet(lines[0]) ? lines[0] : null
  let items = intro === null ? lines : lines.slice(1)
  const last = items[items.length - 1]
  const outro = items.length > 0 && !isBullet(last) ? last : null
  if (outro !== null) items = items.slice(0, -1)
  if (items.length < 2 || !items.every(isBullet)) return null
  return { intro, items: items.map((l) => l.trim().replace(/^[-•]\s*/, '')), outro }
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
        <ul className="space-y-2 list-disc pl-5 marker:text-sage-600">
          {list.items.map((item, i) => (
            <li key={i} className="text-[15px] text-slate-800 leading-7">
              {renderInline(item, sources, onCiteClick)}
            </li>
          ))}
        </ul>
        {list.outro !== null && (
          <p className="text-[15px] text-slate-800 leading-7">{renderInline(list.outro, sources, onCiteClick)}</p>
        )}
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
