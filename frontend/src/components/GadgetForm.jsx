import { useEffect, useRef, useState } from 'react'
import { Save } from 'lucide-react'
import Button from './ui/Button'
import Alert from './ui/Alert'
import { TextField, ErrorSummary } from './ui/FormField'
import { GADGET_FIELD_LABELS, validateGadget, toGadgetPayload } from '../utils/gadgetValidation'

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

  // After a failed submit, move focus to the error summary once it has rendered.
  useEffect(() => {
    if (!focusSummary.current) return
    focusSummary.current = false
    document.getElementById('gadget-form-errors')?.focus()
  })

  const errors = validateGadget(form)
  const visibleErrors = Object.fromEntries(
    Object.entries(errors).filter(([field]) => submitted || touched[field]),
  )

  const update = (field) => (value) => {
    setForm((f) => ({ ...f, [field]: value }))
    setServerError(null)
  }
  const blur = (field) => () => setTouched((t) => ({ ...t, [field]: true }))

  // PATCH ignores blank fields, so clearing an optional value on edit keeps the old one.
  function clearedHint(field, hint) {
    if (isEdit && initialValues[field] !== '' && form[field] === '') {
      return 'Leaving this blank keeps the current value — clearing isn’t supported yet.'
    }
    return hint
  }

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
      await onSubmit(toGadgetPayload(form))
    } catch (err) {
      setServerError(err.message || 'Saving failed. Please try again.')
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
          hint={clearedHint('release_date')}
        />
        <TextField
          {...fieldProps('price_php')}
          optional
          inputMode="decimal"
          placeholder="e.g. 24999"
          hint={clearedHint('price_php', 'Numbers only, no commas.')}
        />
      </div>

      <TextField
        {...fieldProps('image_url')}
        optional
        type="url"
        inputMode="url"
        placeholder="https://…"
        hint={clearedHint('image_url', 'Paste a link to a product photo. File upload comes later.')}
      />

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
