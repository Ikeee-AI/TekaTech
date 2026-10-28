import { describe, expect, it } from 'vitest'
import { CATEGORY_TOPICS, MAX_FOLLOW_UPS, categoryKey, suggestFollowUps, topicsInQuestion } from './followUps'
import { MAX_QUESTION_CHARS } from './questionLimits'

describe('categoryKey', () => {
  it.each([
    ['Smartphone', 'phone'],
    ['Mobile Phone', 'phone'],
    ['Laptop', 'laptop'],
    ['Gaming Laptop', 'laptop'],
    ['Ultrabook', 'laptop'],
    ['Headphones', 'headphones'],
    ['Wireless Earbuds', 'headphones'],
    ['Gaming Headset', 'headphones'],
    ['Handheld', 'handheld'],
    ['Game Console', 'handheld'],
    ['Smartwatch', 'generic'],
    ['', 'generic'],
    [undefined, 'generic'],
    [null, 'generic'],
  ])('maps %j to %s', (category, key) => {
    expect(categoryKey(category)).toBe(key)
  })
})

describe('topicsInQuestion', () => {
  it('finds the topics a question asks about', () => {
    expect(topicsInQuestion('How long does the battery last?')).toEqual(['battery'])
    expect(topicsInQuestion('Compare the CAMERA and screen')).toEqual(['camera', 'display'])
    expect(topicsInQuestion('Is it IP68 rated?')).toEqual(['water'])
  })

  it('does not treat a Lightning port as a weight question', () => {
    expect(topicsInQuestion('Does it have a Lightning port?')).toEqual(['ports'])
  })

  it('returns nothing for empty or non-text input', () => {
    expect(topicsInQuestion('')).toEqual([])
    expect(topicsInQuestion(undefined)).toEqual([])
  })
})

describe('suggestFollowUps', () => {
  it('uses the phone topics, in order, with the gadget name', () => {
    expect(suggestFollowUps({ mode: 'single', gadgetNames: ['Pixel 9'], category: 'Smartphone' })).toEqual([
      'How long does the battery last on the Pixel 9?',
      'What cameras does the Pixel 9 have?',
      'What display does the Pixel 9 have?',
      'What processor does the Pixel 9 use?',
    ])
  })

  it('uses laptop, headphone and handheld topics', () => {
    const laptop = suggestFollowUps({ mode: 'single', gadgetNames: ['Zenbook 14'], category: 'Laptop' })
    expect(laptop[1]).toBe('How much does the Zenbook 14 weigh?')
    const headphones = suggestFollowUps({ mode: 'single', gadgetNames: ['WH-1000XM5'], category: 'Headphones' })
    expect(headphones).toEqual([
      'How long does the battery last on the WH-1000XM5?',
      'Does the WH-1000XM5 have active noise cancellation?',
      'Which Bluetooth codecs does the WH-1000XM5 support?',
      'How much does the WH-1000XM5 weigh?',
    ])
    const handheld = suggestFollowUps({ mode: 'single', gadgetNames: ['Steam Deck OLED'], category: 'Handheld' })
    expect(handheld[0]).toBe('What display does the Steam Deck OLED have?')
    expect(handheld[3]).toBe('How well does the Steam Deck OLED perform in games?')
  })

  it('falls back to the generic topics when the category is unknown or missing', () => {
    const qs = suggestFollowUps({ mode: 'single', gadgetNames: ['Thing'] })
    expect(qs).toHaveLength(CATEGORY_TOPICS.generic.length)
    expect(qs[0]).toBe('How long does the battery last on the Thing?')
  })

  it('skips the topic that was just asked', () => {
    const qs = suggestFollowUps({
      mode: 'single',
      gadgetNames: ['Pixel 9'],
      category: 'Smartphone',
      lastQuestion: 'How big is the battery?',
    })
    expect(qs.some((q) => /battery/i.test(q))).toBe(false)
    expect(qs[0]).toBe('What cameras does the Pixel 9 have?')
    expect(qs).toHaveLength(MAX_FOLLOW_UPS)
  })

  it('skips every topic named in the last question', () => {
    const qs = suggestFollowUps({ mode: 'comparison', gadgetNames: ['A', 'B'], category: 'Smartphone', lastQuestion: 'Compare battery and camera' })
    expect(qs).toEqual([
      'Which has the better display?',
      'Which has the faster processor?',
      'Which charges faster?',
      'Which has more storage?',
    ])
  })

  it('phrases comparison questions as "which has the better…", and "best" for three or more', () => {
    expect(suggestFollowUps({ mode: 'comparison', gadgetNames: ['A', 'B'], category: ['Smartphone', 'Smartphone'] })[0]).toBe(
      'Which has the better battery life?',
    )
    expect(suggestFollowUps({ mode: 'comparison', gadgetNames: ['A', 'B', 'C'], category: 'Smartphone' })[0]).toBe(
      'Which has the best battery life?',
    )
  })

  it('uses generic topics when compared gadgets are from different categories', () => {
    const qs = suggestFollowUps({ mode: 'comparison', gadgetNames: ['A', 'B'], category: ['Smartphone', 'Laptop'] })
    expect(qs).toEqual([
      'Which has the better battery life?',
      'Which has the better display?',
      'Which has the faster processor?',
      'Which has more storage?',
    ])
  })

  it('treats a one-gadget comparison as a single-gadget question', () => {
    expect(suggestFollowUps({ mode: 'comparison', gadgetNames: ['Pixel 9'] })[0]).toBe(
      'How long does the battery last on the Pixel 9?',
    )
  })

  it('uses unscoped questions in general mode', () => {
    expect(suggestFollowUps({ mode: 'general', lastQuestion: 'Which phone has the best camera?' })).toEqual([
      'Which gadgets have the longest battery life?',
      'Which gadgets have the best displays?',
      'Which gadgets have the fastest processors?',
      'Which gadgets offer the most storage?',
    ])
  })

  it('keeps every question within the 150-character limit, dropping a name that is too long', () => {
    const longName = 'X'.repeat(140)
    const qs = suggestFollowUps({ mode: 'single', gadgetNames: [longName], category: 'Smartphone' })
    expect(qs).toHaveLength(MAX_FOLLOW_UPS)
    for (const q of qs) expect([...q].length).toBeLessThanOrEqual(MAX_QUESTION_CHARS)
    expect(qs[0]).toBe('How long does the battery last?')
  })

  it('never returns more than four suggestions, and the same input gives the same output', () => {
    for (const category of ['Smartphone', 'Laptop', 'Headphones', 'Handheld', 'Other']) {
      for (const mode of ['single', 'comparison', 'general']) {
        const input = { mode, gadgetNames: ['Alpha', 'Beta'], category, lastQuestion: 'display?' }
        const first = suggestFollowUps(input)
        expect(first.length).toBeLessThanOrEqual(MAX_FOLLOW_UPS)
        expect(new Set(first).size).toBe(first.length)
        expect(suggestFollowUps(input)).toEqual(first)
      }
    }
  })

  it('works with no arguments', () => {
    expect(suggestFollowUps()).toHaveLength(MAX_FOLLOW_UPS)
  })
})
