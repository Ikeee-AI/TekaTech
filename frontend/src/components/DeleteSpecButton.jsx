import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { deleteErrorMessage } from '../utils/deleteErrors'
import Button from './ui/Button'
import ConfirmDialog from './ui/ConfirmDialog'

function preview(text, max = 140) {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max)}…` : flat
}

/**
 * Delete control for one spec chunk (#125). Only rendered for admins: the backend's
 * DELETE /gadgets/{gadget_id}/specs/{spec_id} (#127) requires app_metadata.is_admin,
 * like gadget delete. The request runs from the confirmation dialog, which stays
 * open with the reason if it fails.
 */
export default function DeleteSpecButton({ gadgetId, spec, onDeleted }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  if (!user?.app_metadata?.is_admin) return null

  function close() {
    setOpen(false)
    setError(null)
  }

  async function handleConfirm() {
    setBusy(true)
    setError(null)
    try {
      await api.deleteSpec(gadgetId, spec.id)
      toast.success('Spec deleted')
      setOpen(false)
      onDeleted?.(spec)
    } catch (err) {
      setError(deleteErrorMessage(err, 'spec'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        variant="danger"
        size="sm"
        icon={Trash2}
        onClick={() => setOpen(true)}
        aria-label={`Delete spec #${spec.chunk_index}`}
        title="Delete this spec"
        aria-haspopup="dialog"
        className="!px-2.5"
      />
      <ConfirmDialog
        open={open}
        title={`Delete Spec #${spec.chunk_index}?`}
        description={
          <>
            <span className="block bg-slate-50 border border-slate-200 rounded-md px-3 py-2 my-2 text-slate-800 break-words">
              {preview(spec.content)}
            </span>
            The AI will stop using this text in answers, and any pending corrections to it are removed. This can&apos;t be
            undone.
          </>
        }
        confirmLabel="Delete Spec"
        busy={busy}
        error={error}
        onConfirm={handleConfirm}
        onCancel={close}
      />
    </>
  )
}
