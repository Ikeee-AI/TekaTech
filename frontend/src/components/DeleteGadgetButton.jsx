import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { deleteErrorMessage } from '../utils/deleteErrors'
import Button from './ui/Button'
import ConfirmDialog from './ui/ConfirmDialog'

/**
 * Delete control for one gadget. Only rendered for admins — the backend's
 * DELETE /gadgets/{id} requires app_metadata.is_admin, so showing it to anyone
 * else would only lead to a 401/403. The request runs from the confirmation
 * dialog, which stays open with the error if it fails.
 */
export default function DeleteGadgetButton({ gadget, onDeleted, size = 'md', iconOnly = false, className = '' }) {
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
      await api.deleteGadget(gadget.id)
      toast.success(`${gadget.name} deleted`)
      setOpen(false)
      onDeleted?.(gadget)
    } catch (err) {
      setError(deleteErrorMessage(err, 'gadget'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        variant="danger"
        size={size}
        icon={Trash2}
        onClick={() => setOpen(true)}
        aria-label={iconOnly ? `Delete ${gadget.name}` : undefined}
        title={iconOnly ? `Delete ${gadget.name}` : undefined}
        aria-haspopup="dialog"
        className={iconOnly ? `!px-2.5 min-w-10 ${className}` : className}
      >
        {!iconOnly && 'Delete'}
      </Button>
      <ConfirmDialog
        open={open}
        title={`Delete ${gadget.name}?`}
        description={
          <>
            This permanently removes <strong>{gadget.name}</strong> and all of its saved specs and pending corrections. AI answers will stop
            citing it. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete Gadget"
        busy={busy}
        error={error}
        onConfirm={handleConfirm}
        onCancel={close}
      />
    </>
  )
}
