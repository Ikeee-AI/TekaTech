function renderInline(text, onCiteClick) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[\d+\])/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-gray-900">
          {part.slice(2, -2)}
        </strong>
      )
    }
    const citeMatch = part.match(/^\[(\d+)\]$/)
    if (citeMatch) {
      const index = Number(citeMatch[1]) - 1
      return (
        <button
          key={i}
          onClick={() => onCiteClick?.(index)}
          className="inline-flex items-center justify-center min-w-[22px] min-h-[22px] text-xs leading-none font-mono font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded px-1.5 py-1 mx-0.5 align-text-top transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          aria-label={`Jump to source ${citeMatch[1]}`}
        >
          {citeMatch[1]}
        </button>
      )
    }
    return part
  })
}

export default function AnswerText({ text, onCiteClick }) {
  const lines = text.split('\n').filter((l) => l.trim() !== '')
  const bulletLines = lines.filter((l) => /^[-•]\s/.test(l.trim()))
  const isMostlyBullets = bulletLines.length >= 2 && bulletLines.length >= lines.length - 1

  if (isMostlyBullets) {
    return (
      <ul className="space-y-1.5 list-disc list-inside marker:text-teal-500">
        {lines.map((line, i) => (
          <li key={i} className="text-sm text-gray-800 leading-relaxed">
            {renderInline(line.trim().replace(/^[-•]\s*/, ''), onCiteClick)}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-2">
      {lines.map((line, i) => (
        <p key={i} className="text-sm text-gray-800 leading-relaxed">
          {renderInline(line, onCiteClick)}
        </p>
      ))}
    </div>
  )
}