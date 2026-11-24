// How AiAnswerResult tells a grounded answer apart from an opt-in general-knowledge
// answer (#172). A grounded answer keeps its cited-count badge and sources; a
// general-knowledge answer gets the amber label instead, with no badge and no sources,
// and Copy / Regenerate keep working.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/authContextValue'
import AiAnswerResult from './AiAnswerResult'

afterEach(cleanup)

const GK_LABEL = 'General knowledge: not from saved specs, unverified'

const GROUNDED = {
  answer: 'The Pixel 9 has a 4700 mAh battery [1].',
  sources: [{ gadget_name: 'Pixel 9', content: 'Battery: 4700 mAh', similarity: 0.82 }],
  answer_basis: 'specs',
  retrieval: 'vector',
}

const GENERAL = {
  answer: 'General knowledge, not from TekaTech saved specs: phones like this usually have about 4500 mAh.',
  sources: [],
  answer_basis: 'general_knowledge',
  retrieval: 'none',
}

const NO_MATCH = {
  answer: 'No relevant specs found.',
  sources: [],
  answer_basis: 'none',
  retrieval: 'none',
}

function renderResult(result, props = {}) {
  const handlers = {
    onRetry: vi.fn(),
    handleCopy: vi.fn(),
    togglePlainLanguage: vi.fn(),
    setAllowGeneralKnowledge: vi.fn(),
  }
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user: null }}>
        <AiAnswerResult
          loading={false}
          error={null}
          result={result}
          sourcesOpen={false}
          setSourcesOpen={vi.fn()}
          highlightedIndex={null}
          sourceRefs={{ current: [] }}
          handleCiteClick={vi.fn()}
          plainLanguage={false}
          allowGeneralKnowledge={false}
          copied={false}
          followUps={['Which has the bigger screen?']}
          onFollowUp={vi.fn()}
          {...handlers}
          {...props}
        />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  return handlers
}

describe('AiAnswerResult with a grounded answer', () => {
  it('shows the cited-count badge and the sources toggle, and no general-knowledge label', () => {
    renderResult(GROUNDED)
    expect(screen.getByText('Answer based on 1 cited spec')).toBeTruthy()
    expect(screen.getByRole('button', { name: /1 Source Retrieved/ })).toBeTruthy()
    expect(screen.queryByText(GK_LABEL)).toBeNull()
  })

  it('treats an answer without answer_basis (older or cached reply) the same way', () => {
    const withoutBasis = { ...GROUNDED }
    delete withoutBasis.answer_basis
    renderResult(withoutBasis)
    expect(screen.getByText('Answer based on 1 cited spec')).toBeTruthy()
    expect(screen.queryByText(GK_LABEL)).toBeNull()
  })

  it('links only http(s) source URLs, so a stored javascript: URL is never clickable', () => {
    const sources = [
      { gadget_name: 'Pixel 9', content: 'Battery: 4700 mAh', similarity: 0.8, source_url: 'https://store.google.com/pixel' },
      { gadget_name: 'Pixel 9', content: 'Screen: 6.3 in', similarity: 0.7, source_url: 'javascript:alert(1)' },
    ]
    renderResult({ ...GROUNDED, sources }, { sourcesOpen: true })
    const links = screen.getAllByRole('link', { name: /source:/i })
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe('https://store.google.com/pixel')
    expect(links[0].getAttribute('rel')).toBe('noreferrer')
  })
})

describe('AiAnswerResult with a general-knowledge answer', () => {
  it('shows the amber label and the answer, with no badge, sources or evidence notices', () => {
    renderResult(GENERAL)
    expect(screen.getByText(GK_LABEL)).toBeTruthy()
    expect(screen.getByText(/phones like this usually have/)).toBeTruthy()
    expect(screen.queryByText(/cited spec/)).toBeNull()
    expect(screen.queryByRole('button', { name: /Retrieved/ })).toBeNull()
    expect(screen.queryByText('No Evidence Found')).toBeNull()
    expect(screen.queryByText('No supporting source cited')).toBeNull()
  })

  it('keeps Copy, Regenerate and the follow-up suggestions working', () => {
    const handlers = renderResult(GENERAL)
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(handlers.handleCopy).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }))
    expect(handlers.onRetry).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Which has the bigger screen?' })).toBeTruthy()
  })
})

describe('AiAnswerResult with no match and the option off', () => {
  it('still shows the No Evidence notice and no general-knowledge label', () => {
    renderResult(NO_MATCH)
    expect(screen.getByText('No Evidence Found')).toBeTruthy()
    expect(screen.queryByText(GK_LABEL)).toBeNull()
  })
})

describe('Allow General Knowledge checkbox', () => {
  it('is a labelled checkbox next to Plain-Language Answer, off by default, with a description', () => {
    renderResult(GROUNDED)
    const box = screen.getByRole('checkbox', { name: 'Allow General Knowledge' })
    expect(box.checked).toBe(false)
    expect(screen.getByRole('checkbox', { name: 'Plain-Language Answer' })).toBeTruthy()
    const hint = document.getElementById(box.getAttribute('aria-describedby'))
    expect(hint?.textContent).toMatch(/labelled as unverified/)
  })

  it('reports the change to the shared hook', () => {
    const handlers = renderResult(GROUNDED)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow General Knowledge' }))
    expect(handlers.setAllowGeneralKnowledge).toHaveBeenCalledWith(true)
  })
})

describe('AiAnswerResult with a web-search answer', () => {
  const WEB = {
    answer: "From the web, not from TekaTech's saved specs. It uses the **Exynos 2400** [1].",
    sources: [{ gadget_id: null, gadget_name: 'samsung.com', content: 'Galaxy S24 specs', source_url: 'https://www.samsung.com/ph/s24', similarity: 0, kind: 'web' }],
    answer_basis: 'web',
    retrieval: 'none',
  }

  it('shows the web label and the cited pages, not the saved-spec badge', () => {
    renderResult(WEB)
    expect(screen.getByText(/From the web: not from saved specs, unverified/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /1 Web Page Cited/ })).toBeTruthy()
    expect(screen.queryByText(/cited spec/)).toBeNull()
  })

  it('offers the Search the Web option where answer options show', () => {
    const setAllowWebSearch = vi.fn()
    renderResult(GROUNDED, { setAllowWebSearch })
    fireEvent.click(screen.getByLabelText('Search the Web'))
    expect(setAllowWebSearch).toHaveBeenCalledWith(true)
  })
})
