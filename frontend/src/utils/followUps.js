// Suggested follow-up questions shown after an AI answer.
// Built entirely on the client from a curated topic list: no endpoint and no AI
// call, so the suggestions cost nothing and are the same every time for the
// same inputs. Clicking one still sends a normal /query request.
import { MAX_QUESTION_CHARS } from './questionLimits'

export const MAX_FOLLOW_UPS = 4

// Each topic has: a pattern that recognises it in a question (to skip a topic the
// user just asked about), a single-gadget question (with and without a name),
// a comparison question for two gadgets and for three or more, and a general
// question for answers that are not scoped to any gadget.
const TOPICS = {
  battery: {
    pattern: /\b(batter(y|ies)|mah|battery life)\b/,
    single: (name) => (name ? `How long does the battery last on the ${name}?` : 'How long does the battery last?'),
    comparison: ['Which has the better battery life?', 'Which has the best battery life?'],
    general: 'Which gadgets have the longest battery life?',
  },
  camera: {
    pattern: /\b(cameras?|photos?|videos?|megapixels?|mp|lens(es)?|zoom)\b/,
    single: (name) => (name ? `What cameras does the ${name} have?` : 'What cameras does it have?'),
    comparison: ['Which has the better camera?', 'Which has the best camera?'],
    general: 'Which gadgets have the best camera specs?',
  },
  display: {
    pattern: /\b(display|screens?|refresh|resolution|oled|lcd|nits|brightness|hz)\b/,
    single: (name) => (name ? `What display does the ${name} have?` : 'What display does it have?'),
    comparison: ['Which has the better display?', 'Which has the best display?'],
    general: 'Which gadgets have the best displays?',
  },
  processor: {
    pattern: /\b(chips?|processors?|cpu|soc|chipset|snapdragon|tensor|bionic|dimensity)\b/,
    single: (name) => (name ? `What processor does the ${name} use?` : 'What processor does it use?'),
    comparison: ['Which has the faster processor?', 'Which has the fastest processor?'],
    general: 'Which gadgets have the fastest processors?',
  },
  charging: {
    pattern: /\b(charg\w*|watts?|wireless)\b/,
    single: (name) => (name ? `How fast does the ${name} charge?` : 'How fast does it charge?'),
    comparison: ['Which charges faster?', 'Which charges the fastest?'],
    general: 'Which gadgets charge the fastest?',
  },
  storage: {
    pattern: /\b(storage|ssd|tb)\b/,
    single: (name) => (name ? `What storage options does the ${name} have?` : 'What storage options does it have?'),
    comparison: ['Which has more storage?', 'Which has the most storage?'],
    general: 'Which gadgets offer the most storage?',
  },
  water: {
    pattern: /\b(water\w*|ip\d\d|ipx\d|dust\w*|splash\w*)\b/,
    single: (name) => (name ? `Is the ${name} water resistant?` : 'Is it water resistant?'),
    comparison: ['Which is more water resistant?', 'Which is the most water resistant?'],
    general: 'Which gadgets are water resistant?',
  },
  weight: {
    // "light(er|est|weight)" rather than "light\w*", so a Lightning port is not a weight question.
    pattern: /\b(weigh\w*|heav(y|ier|iest)|light(er|est|weight)?|grams?|kg|portab\w*)\b/,
    single: (name) => (name ? `How much does the ${name} weigh?` : 'How much does it weigh?'),
    comparison: ['Which is lighter?', 'Which is the lightest?'],
    general: 'Which gadgets are the lightest?',
  },
  ram: {
    pattern: /\b(ram|memory)\b/,
    single: (name) => (name ? `How much RAM does the ${name} have?` : 'How much RAM does it have?'),
    comparison: ['Which has more RAM?', 'Which has the most RAM?'],
    general: 'Which gadgets have the most RAM?',
  },
  ports: {
    pattern: /\b(ports?|usb\w*|thunderbolt|hdmi|connectivity)\b/,
    single: (name) => (name ? `What ports does the ${name} have?` : 'What ports does it have?'),
    comparison: ['Which has more ports?', 'Which has the most ports?'],
    general: 'Which gadgets have the most ports?',
  },
  anc: {
    pattern: /\b(anc|noise[- ]cancel\w*|noise)\b/,
    single: (name) => (name ? `Does the ${name} have active noise cancellation?` : 'Does it have active noise cancellation?'),
    comparison: ['Which has better noise cancellation?', 'Which has the best noise cancellation?'],
    general: 'Which gadgets have active noise cancellation?',
  },
  codecs: {
    pattern: /\b(codecs?|ldac|aac|aptx|bluetooth)\b/,
    single: (name) => (name ? `Which Bluetooth codecs does the ${name} support?` : 'Which Bluetooth codecs does it support?'),
    comparison: ['Which supports more Bluetooth codecs?', 'Which supports the most Bluetooth codecs?'],
    general: 'Which gadgets support the most Bluetooth codecs?',
  },
  performance: {
    pattern: /\b(perform\w*|fps|gpu|gaming|games?|speed)\b/,
    single: (name) => (name ? `How well does the ${name} perform in games?` : 'How well does it perform in games?'),
    comparison: ['Which performs better in games?', 'Which performs best in games?'],
    general: 'Which gadgets perform best in games?',
  },
}

// Topic order per category is the order the suggestions appear in.
export const CATEGORY_TOPICS = {
  phone: ['battery', 'camera', 'display', 'processor', 'charging', 'storage', 'water'],
  laptop: ['battery', 'weight', 'display', 'processor', 'ram', 'ports'],
  headphones: ['battery', 'anc', 'codecs', 'weight'],
  handheld: ['display', 'battery', 'storage', 'performance'],
  generic: ['battery', 'display', 'processor', 'storage'],
}

// Category is free text on the gadget ("Smartphone", "Laptop", "Handheld"…), so
// match on words rather than exact values.
const CATEGORY_PATTERNS = [
  ['headphones', /head(phone|set)|ear(bud|phone)|\bbuds\b|\biem\b/],
  ['phone', /phone|mobile|\bcell/],
  ['laptop', /laptop|notebook|ultrabook|macbook|chromebook/],
  ['handheld', /handheld|console|gaming|game/],
]

/** Maps a free-text category to a key of CATEGORY_TOPICS ("generic" if unknown). */
export function categoryKey(category) {
  if (typeof category !== 'string') return 'generic'
  const text = category.toLowerCase()
  const match = CATEGORY_PATTERNS.find(([, pattern]) => pattern.test(text))
  return match ? match[0] : 'generic'
}

/** One category, or a list (comparison): a list only gets specific topics when every gadget shares them. */
function resolveCategory(category) {
  if (!Array.isArray(category)) return categoryKey(category)
  const keys = [...new Set(category.map(categoryKey))]
  return keys.length === 1 ? keys[0] : 'generic'
}

/** Topic keys the question already covers. */
export function topicsInQuestion(question) {
  if (typeof question !== 'string') return []
  const text = question.toLowerCase()
  return Object.keys(TOPICS).filter((key) => TOPICS[key].pattern.test(text))
}

const fits = (q) => [...q].length <= MAX_QUESTION_CHARS

function phrase(topic, mode, names) {
  if (mode === 'comparison') return topic.comparison[names.length > 2 ? 1 : 0]
  if (mode === 'single') {
    const named = topic.single(names[0])
    return fits(named) ? named : topic.single(null)
  }
  return topic.general
}

/**
 * Suggested follow-up questions after an answer.
 *
 * mode: 'single' (one gadget), 'comparison' (two or more) or 'general' (not scoped).
 * gadgetNames: names in scope; the single-gadget questions include the name.
 * category: the gadget's category text, or a list of them for a comparison.
 * lastQuestion: the question just asked; its topics are not suggested again.
 *
 * Returns at most MAX_FOLLOW_UPS questions, each within MAX_QUESTION_CHARS,
 * in the fixed topic order for the category.
 */
export function suggestFollowUps({ mode = 'general', gadgetNames = [], category, lastQuestion = '' } = {}) {
  const names = (gadgetNames || []).filter((n) => typeof n === 'string' && n.trim()).map((n) => n.trim())
  const effectiveMode = mode === 'comparison' && names.length < 2 ? (names.length === 1 ? 'single' : 'general') : mode
  const asked = new Set(topicsInQuestion(lastQuestion))
  const last = typeof lastQuestion === 'string' ? lastQuestion.trim().toLowerCase() : ''

  const questions = []
  for (const key of CATEGORY_TOPICS[resolveCategory(category)]) {
    if (asked.has(key)) continue
    const q = phrase(TOPICS[key], effectiveMode, names)
    if (!fits(q) || q.toLowerCase() === last || questions.includes(q)) continue
    questions.push(q)
    if (questions.length === MAX_FOLLOW_UPS) break
  }
  return questions
}
