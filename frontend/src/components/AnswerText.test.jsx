// AnswerText renders exactly three things from the model: [n] citations, **bold** and
// "- " bullets. These tests pin that contract, because the prompt in
// backend/prompts.py promises the model nothing more. If one of these fails after a
// change, the prompt and this component have drifted apart.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import AnswerText from './AnswerText'

afterEach(cleanup)

const SOURCES = [
  { gadget_name: 'Pixel 9', content: 'Battery: 4700 mAh' },
  { gadget_name: 'iPhone 16', content: 'Battery: 3561 mAh' },
]

describe('AnswerText paragraphs', () => {
  it('renders one paragraph per non-blank line', () => {
    const { container } = render(<AnswerText text={'First line.\n\n   \nSecond line.'} />)
    const paragraphs = container.querySelectorAll('p')
    expect([...paragraphs].map((p) => p.textContent)).toEqual(['First line.', 'Second line.'])
    expect(container.querySelector('ul')).toBeNull()
  })

  it('renders **bold** as <strong> without the asterisks', () => {
    const { container } = render(<AnswerText text="The **Pixel 9** lasts longer." />)
    const strong = container.querySelector('strong')
    expect(strong?.textContent).toBe('Pixel 9')
    expect(container.textContent).toBe('The Pixel 9 lasts longer.')
  })

  it('leaves an unclosed ** as literal text', () => {
    const { container } = render(<AnswerText text="Battery is **big" />)
    expect(container.querySelector('strong')).toBeNull()
    expect(container.textContent).toBe('Battery is **big')
  })

  it('does not render unsupported markup such as headings', () => {
    const { container } = render(<AnswerText text="## Battery" />)
    expect(container.querySelector('h2')).toBeNull()
    expect(container.textContent).toBe('## Battery')
  })
})

describe('AnswerText citations', () => {
  it('turns [n] into a button named after its source and reports a zero-based index', () => {
    const onCiteClick = vi.fn()
    render(<AnswerText text="Pixel has 4700 mAh [1] and iPhone 3561 mAh [2]." sources={SOURCES} onCiteClick={onCiteClick} />)

    const second = screen.getByRole('button', { name: 'Source 2: iPhone 16. Show this source' })
    expect(second.textContent).toBe('2')
    fireEvent.click(second)
    expect(onCiteClick).toHaveBeenCalledWith(1)
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('keeps a citation with no matching source as plain text', () => {
    const { container } = render(<AnswerText text="Unknown claim [3]." sources={SOURCES} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(container.textContent).toBe('Unknown claim [3].')
  })

  it('still renders a generic citation button when no source list is passed', () => {
    render(<AnswerText text="Claim [1]." />)
    expect(screen.getByRole('button', { name: 'Source 1. Show this source' })).toBeTruthy()
  })

  it('does not throw when clicked without an onCiteClick handler', () => {
    render(<AnswerText text="Claim [1]." sources={SOURCES} />)
    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow()
  })

  it('does not parse grouped [1,2] citations, which the prompt forbids', () => {
    const { container } = render(<AnswerText text="Both [1,2]." sources={SOURCES} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(container.textContent).toBe('Both [1,2].')
  })

  it('renders a citation on the same line as bold text', () => {
    render(<AnswerText text="**Pixel 9** wins [1]." sources={SOURCES} />)
    expect(screen.getByRole('button', { name: /Pixel 9/ })).toBeTruthy()
  })
})

describe('AnswerText bullets', () => {
  it('renders two or more "- " lines as a list with the markers removed', () => {
    const { container } = render(<AnswerText text={'- Battery 4700 mAh [1]\n- Screen 6.3 in'} sources={SOURCES} />)
    const items = [...container.querySelectorAll('ul > li')]
    expect(items.map((li) => li.textContent)).toEqual(['Battery 4700 mAh 1', 'Screen 6.3 in'])
    expect(container.querySelector('p')).toBeNull()
  })

  it('accepts "•" bullets as well as "-"', () => {
    const { container } = render(<AnswerText text={'• One\n• Two'} />)
    expect([...container.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['One', 'Two'])
  })

  it('keeps one lead-in line as a paragraph above the list', () => {
    const { container } = render(<AnswerText text={'Key differences:\n- Battery\n- Screen'} />)
    expect([...container.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['Battery', 'Screen'])
    const paragraphs = [...container.querySelectorAll('p')]
    expect(paragraphs.map((p) => p.textContent)).toEqual(['Key differences:'])
    // The lead-in comes before the list in document order, not inside it.
    expect(paragraphs[0].closest('ul')).toBeNull()
    expect(paragraphs[0].compareDocumentPosition(container.querySelector('ul')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders bold and citations inside the lead-in line', () => {
    const { container } = render(
      <AnswerText text={'The **Pixel 9** wins [1]:\n- Battery [1]\n- Price [2]'} sources={SOURCES} />,
    )
    const intro = container.querySelector('p')
    expect(intro?.querySelector('strong')?.textContent).toBe('Pixel 9')
    expect(intro?.querySelector('button')).toBeTruthy()
    expect(container.querySelectorAll('li button')).toHaveLength(2)
  })

  it('ignores blank lines between the lead-in and the bullets', () => {
    const { container } = render(<AnswerText text={'Intro:\n\n- One\n   \n- Two\n'} />)
    expect(container.querySelector('p')?.textContent).toBe('Intro:')
    expect([...container.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['One', 'Two'])
  })

  it('accepts indented bullets and mixed "-" / "•" markers', () => {
    const { container } = render(<AnswerText text={'  - One\n• Two'} />)
    expect([...container.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['One', 'Two'])
  })

  it('does not treat a hyphen without a following space as a bullet', () => {
    const { container } = render(<AnswerText text={'-5 °C rated\n- One\n- Two'} />)
    // "-5 °C" is the lead-in paragraph, not a third list item.
    expect(container.querySelector('p')?.textContent).toBe('-5 °C rated')
    expect(container.querySelectorAll('li')).toHaveLength(2)
  })

  it('falls back to paragraphs when a non-bullet line follows the bullets', () => {
    const { container } = render(<AnswerText text={'- Battery\n- Screen\nSummary.'} />)
    expect(container.querySelector('ul')).toBeNull()
    expect([...container.querySelectorAll('p')].map((p) => p.textContent)).toEqual(['- Battery', '- Screen', 'Summary.'])
  })

  it('treats a lead-in plus a single bullet as paragraphs', () => {
    const { container } = render(<AnswerText text={'Intro:\n- Only one'} />)
    expect(container.querySelector('ul')).toBeNull()
    expect(container.querySelectorAll('p')).toHaveLength(2)
  })

  it('falls back to paragraphs when two or more lines are not bullets', () => {
    const { container } = render(<AnswerText text={'Intro.\n- Battery\n- Screen\nSummary.'} />)
    expect(container.querySelector('ul')).toBeNull()
    expect(container.querySelectorAll('p')).toHaveLength(4)
    expect(container.textContent).toContain('- Battery')
  })

  it('treats a single bullet line as a paragraph, not a list', () => {
    const { container } = render(<AnswerText text="- Only one point" />)
    expect(container.querySelector('ul')).toBeNull()
    expect(container.querySelector('p')?.textContent).toBe('- Only one point')
  })
})
