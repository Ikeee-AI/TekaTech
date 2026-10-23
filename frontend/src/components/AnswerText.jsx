// Renders exactly three things from the model's answer: [n] citations, **bold** and
// "- " bullets. The prompt in backend/routers/query.py promises only these, so change
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

export default function AnswerText({ text, sources, onCiteClick }) {
  const lines = text.split('\n').filter((l) => l.trim() !== '')
  const bulletLines = lines.filter((l) => /^[-•]\s/.test(l.trim()))
  const isMostlyBullets = bulletLines.length >= 2 && bulletLines.length >= lines.length - 1

  if (isMostlyBullets) {
    return (
      <ul className="space-y-2 list-disc pl-5 marker:text-sage-600">
        {lines.map((line, i) => (
          <li key={i} className="text-[15px] text-slate-800 leading-7">
            {renderInline(line.trim().replace(/^[-•]\s*/, ''), sources, onCiteClick)}
          </li>
        ))}
      </ul>
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
