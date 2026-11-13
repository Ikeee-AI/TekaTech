import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import VariantsList from './VariantsList'

afterEach(cleanup)

describe('VariantsList', () => {
  it('lists paired variants with the standard one first', () => {
    render(
      <VariantsList
        variants={{ pairs: [{ ram: 8, storage: 256 }, { ram: 12, storage: 512 }], ram: [8, 12], storage: [256, 512], source: 'oppo.com' }}
      />,
    )
    const items = screen.getAllByRole('listitem')
    expect(items[0].textContent).toContain('8 GB + 256 GB')
    expect(items[0].textContent).toContain('Standard')
    expect(items[1].textContent).toContain('12 GB + 512 GB')
    expect(screen.getByText('from oppo.com')).toBeTruthy()
  })

  it('renders nothing for a single variant', () => {
    const { container } = render(<VariantsList variants={null} />)
    expect(container.textContent).toBe('')
  })
})
