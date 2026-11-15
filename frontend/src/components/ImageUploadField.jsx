import { useRef, useState } from 'react'
import { AlertCircle, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from './ui/Button'
import { friendlyError } from '../utils/requestErrors'
import { IMAGE_ACCEPT, formatFileSize, validateImageFile } from '../utils/imageUpload'

/**
 * Admin photo upload for an existing gadget (#202). Picks one file, checks its type and size
 * the same way the API does, previews it, and uploads it with uploadImage(file), which the
 * edit page binds to api.uploadGadgetImage (POST /gadgets/{id}/image) for its gadget.
 * The upload saves the photo and the gadget's image_url at once (no Save Changes needed);
 * onUploaded(imageUrl) then puts the new link into the form so its field and preview match.
 *
 * The preview is a data: URL (FileReader), not a blob: URL: the site's CSP allows
 * `img-src 'self' https: data:` and no blob:.
 */
export default function ImageUploadField({ uploadImage, onUploaded }) {
  const inputRef = useRef(null)
  const selectedRef = useRef(null)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  function reset() {
    selectedRef.current = null
    setFile(null)
    setPreviewUrl('')
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleChange(e) {
    const picked = e.target.files?.[0] ?? null
    setError('')
    setPreviewUrl('')
    if (!picked) {
      reset()
      return
    }
    const problem = validateImageFile(picked)
    if (problem) {
      reset()
      setError(problem)
      return
    }
    selectedRef.current = picked
    setFile(picked)
    const reader = new FileReader()
    reader.onload = () => {
      // A newer pick (or a reset) wins over a slow read of an older file.
      if (selectedRef.current === picked) setPreviewUrl(String(reader.result))
    }
    reader.readAsDataURL(picked)
  }

  async function handleUpload() {
    if (!file || uploading) return
    setUploading(true)
    setError('')
    try {
      const gadget = await uploadImage(file)
      onUploaded(gadget.image_url)
      toast.success('Photo uploaded and saved')
      reset()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setUploading(false)
    }
  }

  const describedBy = error ? 'image_upload-error' : 'image_upload-hint'

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
      <div>
        <label htmlFor="image_upload" className="flex items-baseline gap-1.5 text-sm font-semibold text-slate-800 mb-1.5">
          Upload Photo
          <span className="text-xs font-medium text-slate-500">(Optional)</span>
        </label>
        <input
          ref={inputRef}
          id="image_upload"
          name="image_upload"
          type="file"
          accept={IMAGE_ACCEPT}
          onChange={handleChange}
          disabled={uploading}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={
            'block w-full text-sm text-slate-700 rounded-lg ' +
            'file:mr-3 file:rounded-full file:border file:border-slate-300 file:bg-white file:px-4 file:py-1.5 ' +
            'file:text-sm file:font-semibold file:text-slate-800 hover:file:bg-slate-100 ' +
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600 disabled:opacity-50'
          }
        />
        {error ? (
          <p id="image_upload-error" role="alert" className="flex items-start gap-1 text-sm font-medium text-red-700 mt-1.5">
            <AlertCircle size={15} className="shrink-0 mt-0.5" aria-hidden="true" />
            {error}
          </p>
        ) : (
          <p id="image_upload-hint" className="text-xs text-slate-600 mt-1.5">
            JPEG, PNG, WebP or AVIF, up to 2 MB. Uploading saves the photo right away and replaces the image link.
          </p>
        )}
      </div>

      {file && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Same box as the catalog card's photo, like ImageLinkPreview. */}
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {previewUrl && <img src={previewUrl} alt="Preview of the selected photo" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-800 truncate" title={file.name}>
              {file.name}
            </p>
            <p className="text-xs text-slate-600">{formatFileSize(file.size)}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button variant="primary" size="sm" icon={Upload} loading={uploading} onClick={handleUpload}>
                {uploading ? 'Uploading…' : 'Upload Photo'}
              </Button>
              <Button variant="ghost" size="sm" icon={X} onClick={reset} disabled={uploading}>
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
