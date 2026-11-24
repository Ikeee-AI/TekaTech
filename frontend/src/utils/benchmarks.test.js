import { describe, expect, it } from 'vitest'
import { formatBenchmarkValue, sharedBenchmarks } from './benchmarks'

const row = (gid, test, value, extra = {}) => ({ gadget_id: gid, kind: 'game', test, settings: 'High', value, unit: 'fps', checked_at: '2026-11-01', ...extra })

describe('sharedBenchmarks', () => {
  it('keeps only results two or more phones share, games first', () => {
    const rows = {
      a: [row('a', 'Genshin Impact', 52), row('a', 'Geekbench 6', 5000, { kind: 'score', unit: 'points', settings: null }), row('a', 'Only A', 1)],
      b: [row('b', 'genshin impact', 60), row('b', 'Geekbench 6', 6000, { kind: 'score', unit: 'points', settings: null })],
    }
    const out = sharedBenchmarks(rows, ['a', 'b'])
    expect(out.map((g) => g.test)).toEqual(['Genshin Impact', 'Geekbench 6'])
    expect(out[0].values.b.value).toBe(60)
  })

  it('keeps the newer of two rows for the same test on one phone', () => {
    const rows = {
      a: [row('a', 'G', 40, { checked_at: '2026-10-01' }), row('a', 'G', 50, { checked_at: '2026-11-01' })],
      b: [row('b', 'G', 45)],
    }
    expect(sharedBenchmarks(rows, ['a', 'b'])[0].values.a.value).toBe(50)
  })
})

describe('formatBenchmarkValue', () => {
  it('formats numbers and passes other text through', () => {
    expect(formatBenchmarkValue(52)).toBe('52')
    expect(formatBenchmarkValue('n/a')).toBe('n/a')
  })
})
