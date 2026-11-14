import { useEffect, useRef, useState } from 'react'
import { Save } from 'lucide-react'
import Button from './ui/Button'
import Alert from './ui/Alert'
import { TextField, ErrorSummary } from './ui/FormField'
import ImageLinkPreview from './ImageLinkPreview'
import { GADGET_FIELD_LABELS, isHttpUrl, validateGadget, toGadgetPayload } from '../utils/gadgetValidation'
import { friendlyError } from '../utils/requestErrors'

/**
 * Shared create/edit form for a gadget. Validation runs on submit; after the
 * first failed submit (or once a field has been left) errors update live.
 * A failed submit moves focus to the error summary so keyboard and screen
 * reader users land on the list of problems. Server errors show inline above
 * the buttons and keep everything the user typed.
 */
export default function GadgetForm({ initialValues, onSubmit, submitLabel, onCancel, isEdit = false }) {
  const [form, setForm] = useState(initialValues)
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [, setSubmitCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)
  const focusSummary = useRef(false)
  // Live preview result for one image link (#202). Kept with the link it belongs to, so
  // editing the link makes the status 'pending' again until the new one loads or fails.
  const [imageCheck, setImageCheck] = useState({ url: '', status: 'pending' })

  // After a failed submit, move focus to the error summary once it has rendered.
  useEffect(() => {
    if (!focusSummary.current) return
    focusSummary.current = false
    document.getElementById('gadget-form-errors')?.focus()
  })

  const imageUrl = form.image_url.trim()
  const imageStatus = imageCheck.url === imageUrl ? imageCheck.status : 'pending'
  const errors = validateGadget(form, { imageStatus })
  const visibleErrors = Object.fromEntries(
    Object.entries(errors).filter(([field]) => submitted || touched[field]),
  )

  const update = (field) => (value) => {
    setForm((f) => ({ ...f, [field]: value }))
    setServerError(null)
  }
  const blur = (field) => () => setTouched((t) => ({ ...t, [field]: true }))

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length > 0) {
      focusSummary.current = true
      setSubmitCount((n) => n + 1)
      return
    }
    setSubmitting(true)
    setServerError(null)
    try {
      // On edit, emptied optional fields go out as null so the saved value is cleared.
      await onSubmit(toGadgetPayload(form, isEdit ? initialValues : null))
    } catch (err) {
      setServerError(friendlyError(err))
      setSubmitting(false)
    }
  }

  const fieldProps = (field) => ({
    id: field,
    label: GADGET_FIELD_LABELS[field],
    value: form[field],
    onChange: update(field),
    onBlur: blur(field),
    error: visibleErrors[field],
  })

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {submitted && <ErrorSummary id="gadget-form-errors" errors={errors} labels={GADGET_FIELD_LABELS} />}

      <p className="text-sm text-slate-600">
        Fields marked <span className="text-red-700 font-semibold" aria-hidden="true">*</span>
        <span className="sr-only">with an asterisk</span> are required.
      </p>

      <TextField {...fieldProps('name')} required autoComplete="off" placeholder="e.g. Galaxy S24" />
      <TextField {...fieldProps('brand')} required autoComplete="off" placeholder="e.g. Samsung" />
      <TextField {...fieldProps('category')} required autoComplete="off" placeholder="e.g. Smartphone, Laptop" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <TextField
          {...fieldProps('release_date')}
          optional
          type="date"
        />
        <TextField
          {...fieldProps('price_php')}
          optional
          inputMode="decimal"
          placeholder="e.g. 24999"
          hint="Numbers only, no commas."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <TextField
          {...fieldProps('price_source_url')}
          optional
          type="url"
          inputMode="url"
          placeholder="https://www.samsung.com/ph/…"
          hint="The brand's official PH page you read the price from."
        />
        <TextField
          {...fieldProps('price_checked_at')}
          optional
          type="date"
          hint="The day you read that price."
        />
      </div>

      <TextField
        {...fieldProps('store_url')}
        optional
        type="url"
        inputMode="url"
        placeholder="https://…"
        hint="The brand's official store page. Shown as an “Official store” button on the phone page."
      />

      <TextField
        {...fieldProps('image_url')}
        optional
        type="url"
        inputMode="url"
        placeholder="https://…"
        hint="A direct image link: opening it shows only the picture (usually ending in .jpg, .png or .webp)."
      />
      {isHttpUrl(imageUrl) && (
        <ImageLinkPreview url={imageUrl} status={imageStatus} onResult={(url, status) => setImageCheck({ url, status })} />
      )}

      {serverError && (
        <Alert tone="error" title={isEdit ? 'Changes Not Saved' : 'Gadget Not Saved'}>
          {serverError}
        </Alert>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
        {onCancel && (
          <Button variant="secondary" size="lg" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" size="lg" icon={Save} loading={submitting} className="sm:flex-1">
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
