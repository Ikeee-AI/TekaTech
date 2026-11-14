import { describe, expect, it } from 'vitest'
import {
  MAX_IMAGE_BYTES,
  UPLOAD_EMPTY,
  UPLOAD_SVG,
  UPLOAD_TOO_LARGE,
  UPLOAD_WRONG_TYPE,
  formatFileSize,
  validateImageFile,
} from './imageUpload'

// File-like objects: only name, type and size are read.
const file = (name, type, size = 1000) => ({ name, type, size })

describe('validateImageFile (#202)', () => {
  it.each([
    ['photo.jpg', 'image/jpeg'],
    ['photo.png', 'image/png'],
    ['photo.webp', 'image/webp'],
    ['photo.avif', 'image/avif'],
  ])('accepts %s', (name, type) => {
    expect(validateImageFile(file(name, type))).toBeNull()
  })

  it('accepts exactly 2 MB and refuses one byte more', () => {
    expect(validateImageFile(file('a.png', 'image/png', MAX_IMAGE_BYTES))).toBeNull()
    expect(validateImageFile(file('a.png', 'image/png', MAX_IMAGE_BYTES + 1))).toBe(UPLOAD_TOO_LARGE)
  })

  it('refuses SVG by type or by name', () => {
    expect(validateImageFile(file('logo.svg', 'image/svg+xml'))).toBe(UPLOAD_SVG)
    expect(validateImageFile(file('logo.svg', ''))).toBe(UPLOAD_SVG)
  })

  it.each([
    ['anim.gif', 'image/gif'],
    ['doc.pdf', 'application/pdf'],
    ['noext', ''],
    ['anim.gif', ''],
    ['photo.avif.exe', ''],
  ])('refuses %s', (name, type) => {
    expect(validateImageFile(file(name, type))).toBe(UPLOAD_WRONG_TYPE)
  })

  it.each(['photo.avif', 'PHOTO.JPG', 'photo.jpeg', 'photo.png', 'photo.webp'])(
    'falls back to the extension when the browser reports no type: %s',
    (name) => {
      expect(validateImageFile(file(name, ''))).toBeNull()
    },
  )

  it('still applies the size limit to a file with no reported type', () => {
    expect(validateImageFile(file('photo.avif', '', MAX_IMAGE_BYTES + 1))).toBe(UPLOAD_TOO_LARGE)
  })

  it('trusts a reported type over the extension', () => {
    expect(validateImageFile(file('photo.png', 'image/gif'))).toBe(UPLOAD_WRONG_TYPE)
  })

  it('refuses an empty file and no file', () => {
    expect(validateImageFile(file('a.png', 'image/png', 0))).toBe(UPLOAD_EMPTY)
    expect(validateImageFile(null)).toBe(UPLOAD_WRONG_TYPE)
  })
})

describe('formatFileSize', () => {
  it('shows KB below 1 MB and MB above', () => {
    expect(formatFileSize(320 * 1024)).toBe('320 KB')
    expect(formatFileSize(1.4 * 1024 * 1024)).toBe('1.4 MB')
    expect(formatFileSize(10)).toBe('1 KB')
  })
})
