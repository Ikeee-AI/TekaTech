// #202: on edit, an admin can upload a photo; the API saves it and its link goes into the form.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import toast from 'react-hot-toast'
import GadgetForm from './GadgetForm'
import { EMPTY_GADGET } from '../utils/gadgetValidation'

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const FILLED = { ...EMPTY_GADGET, name: 'Poco X7 Pro', brand: 'Xiaomi', category: 'Smartphone' }
const GADGET_ID = '11111111-2222-3333-4444-555555555555'
const UPLOADED_URL = `https://example.supabase.co/storage/v1/object/public/gadget-images/gadgets/${GADGET_ID}/abc.png`

const uploadImage = vi.fn()

function renderForm({ isEdit = true, withUpload = true, initialValues = FILLED } = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  render(
    <GadgetForm initialValues={initialValues} onSubmit={onSubmit} submitLabel="Save Changes" isEdit={isEdit} uploadImage={withUpload ? uploadImage : null} />,
  )
  return onSubmit
}

const pngFile = (size = 2048, name = 'poco.png', type = 'image/png') => {
  const f = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}
const fileInput = () => screen.getByLabelText(/upload photo/i, { selector: 'input' })
const pick = (file) => fireEvent.change(fileInput(), { target: { files: [file] } })
const uploadButton = () => screen.getByRole('button', { name: /upload photo/i })

beforeEach(() => {
  uploadImage.mockReset()
  toast.success.mockReset()
})
afterEach(cleanup)

describe('GadgetForm photo upload (#202)', () => {
  it('is shown only when editing an existing gadget', () => {
    renderForm({ isEdit: false })
    expect(screen.queryByLabelText(/upload photo/i, { selector: 'input' })).toBeNull()
    cleanup()
    renderForm({ isEdit: true, withUpload: false })
    expect(screen.queryByLabelText(/upload photo/i, { selector: 'input' })).toBeNull()
    cleanup()
    renderForm()
    expect(fileInput().getAttribute('accept')).toBe('image/jpeg,image/png,image/webp,image/avif')
  })

  it('previews a picked photo, uploads it and puts the returned link into the form', async () => {
    uploadImage.mockResolvedValue({ id: GADGET_ID, image_url: UPLOADED_URL })
    const onSubmit = renderForm()
    const file = pngFile()
    pick(file)

    expect(screen.getByText('poco.png')).toBeTruthy()
    expect(screen.getByText('2 KB')).toBeTruthy()
    await waitFor(() => expect(screen.getByAltText('Preview of the selected photo').getAttribute('src')).toMatch(/^data:image\/png/))

    fireEvent.click(uploadButton())
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Photo uploaded and saved'))
    expect(uploadImage).toHaveBeenCalledWith(file)
    expect(screen.getByLabelText(/image url/i).value).toBe(UPLOADED_URL)
    // The selection is cleared after a successful upload.
    expect(screen.queryByText('poco.png')).toBeNull()

    // Clearing the link afterwards removes the uploaded photo (null), since the server now holds it.
    fireEvent.change(screen.getByLabelText(/image url/i), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].image_url).toBeNull()
  })

  it('refuses a file over 2 MB before uploading', () => {
    renderForm()
    pick(pngFile(2 * 1024 * 1024 + 1))
    expect(screen.getByRole('alert').textContent).toMatch(/larger than 2 MB/)
    expect(fileInput().getAttribute('aria-invalid')).toBe('true')
    expect(screen.queryByRole('button', { name: /upload photo/i })).toBeNull()
    expect(uploadImage).not.toHaveBeenCalled()
  })

  it('refuses SVG and other types before uploading', () => {
    renderForm()
    pick(pngFile(500, 'logo.svg', 'image/svg+xml'))
    expect(screen.getByRole('alert').textContent).toMatch(/SVG images aren't accepted/)
    pick(pngFile(500, 'anim.gif', 'image/gif'))
    expect(screen.getByRole('alert').textContent).toMatch(/JPEG, PNG, WebP or AVIF/)
    expect(uploadImage).not.toHaveBeenCalled()
  })

  it("shows the server's reason when the upload fails and keeps the old link", async () => {
    const err = Object.assign(new Error("Couldn't store the photo right now. The gadget was not changed."), { status: 503 })
    uploadImage.mockRejectedValue(err)
    renderForm({ initialValues: { ...FILLED, image_url: 'https://example.com/old.png' } })
    pick(pngFile())
    fireEvent.click(uploadButton())

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/couldn't store the photo/i))
    expect(screen.getByLabelText(/image url/i).value).toBe('https://example.com/old.png')
    expect(toast.success).not.toHaveBeenCalled()
  })
})
