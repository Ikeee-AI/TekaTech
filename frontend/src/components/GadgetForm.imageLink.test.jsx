// #202: the admin gadget form previews the image link and won't save one that isn't an image.
// jsdom never loads images, so each test fires the <img> load/error event itself.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import GadgetForm from './GadgetForm'
import { EMPTY_GADGET } from '../utils/gadgetValidation'

const FILLED = { ...EMPTY_GADGET, name: 'Poco X7 Pro', brand: 'Xiaomi', category: 'Smartphone' }

function renderForm(initialValues = FILLED, { isEdit = false } = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  render(<GadgetForm initialValues={initialValues} onSubmit={onSubmit} submitLabel="Save Gadget" isEdit={isEdit} />)
  return onSubmit
}

const imageField = () => screen.getByLabelText(/image url/i)
const typeLink = (url) => fireEvent.change(imageField(), { target: { value: url } })
const preview = () => screen.getByAltText('Preview of the image link')
const save = () => fireEvent.click(screen.getByRole('button', { name: /save gadget/i }))

afterEach(cleanup)

describe('GadgetForm image link preview (#202)', () => {
  it('shows no preview while the link is empty or not a full link', () => {
    renderForm()
    expect(screen.queryByAltText('Preview of the image link')).toBeNull()
    typeLink('example.com/poco.png')
    expect(screen.queryByAltText('Preview of the image link')).toBeNull()
  })

  it('saves once the preview has loaded the image, even without an image extension', async () => {
    const onSubmit = renderForm()
    typeLink('https://cdn.example.com/is/image/poco-x7?wid=600')
    fireEvent.load(preview())
    expect(screen.getByText(/image found/i)).toBeTruthy()

    save()
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].image_url).toBe('https://cdn.example.com/is/image/poco-x7?wid=600')
  })

  it("won't save a link that doesn't load as an image (a web page, like Poco's)", () => {
    const onSubmit = renderForm()
    typeLink('https://www.example.com/poco-x7-pro.png')
    fireEvent.error(preview())
    expect(screen.getByText(/couldn't load an image from this link/i)).toBeTruthy()

    save()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(imageField().getAttribute('aria-invalid')).toBe('true')
    expect(screen.getAllByText(/didn't load as an image/i).length).toBeGreaterThan(0)
  })

  it('checks a changed link again instead of trusting the old result', () => {
    const onSubmit = renderForm()
    typeLink('https://example.com/good.png')
    fireEvent.load(preview())
    typeLink('https://www.example.com/product-page')
    expect(screen.getByText(/checking the image link/i)).toBeTruthy()

    save()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getAllByText(/doesn't look like a direct image link/i).length).toBeGreaterThan(0)
  })

  it('lets an admin fix a broken saved link by clearing it (edit sends null)', async () => {
    const onSubmit = renderForm({ ...FILLED, image_url: 'https://www.example.com/poco-x7-pro' }, { isEdit: true })
    fireEvent.error(preview())
    typeLink('')
    save()
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].image_url).toBeNull()
  })
})
