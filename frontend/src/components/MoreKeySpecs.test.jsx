import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import MoreKeySpecs from './MoreKeySpecs'
import { extractMoreSpecs } from '../utils/keySpecs'

afterEach(cleanup)

describe('MoreKeySpecs', () => {
  it('shows each stated value with its source and says when a source is silent', () => {
    const moreSpecs = extractMoreSpecs([
      {
        content: 'Chip: A18 Pro chip\nWeight: 199 grams\nWater resistance: IP68 (maximum depth of 6 meters up to 30 minutes)\nDisplay: 6.3-inch (diagonal) all-screen OLED',
        source_url: 'https://support.apple.com/en-ph/121031',
      },
    ])
    render(<MoreKeySpecs moreSpecs={moreSpecs} />)
    const section = screen.getByRole('region', { name: 'More key specs' })
    expect(within(section).getByText('A18 Pro')).toBeTruthy()
    expect(within(section).getByText('IP68')).toBeTruthy()
    expect(within(section).getAllByText('support.apple.com')).toHaveLength(4)
    // Apple's page states no mAh and no wired charging power.
    expect(within(section).getAllByText('Not stated by source')).toHaveLength(2)
  })

  it('shows placeholders while the specs load', () => {
    render(<MoreKeySpecs moreSpecs={null} loading />)
    expect(screen.getAllByLabelText('Loading')).toHaveLength(6)
  })
})
