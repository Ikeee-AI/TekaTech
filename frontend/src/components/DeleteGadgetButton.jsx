import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { deleteErrorMessage } from '../utils/deleteErrors'
import Button from './ui/Button'
import ConfirmDialog from './ui/ConfirmDialog'

/**
 * Delete control for one gadget, shown to everyone for now. The backend's
 * DELETE /gadgets/{id} still requires an admin account, so for anyone else the
 * request fails and the confirmation dialog stays open explaining why.
 */
export default function DeleteGadgetButton({ gadget, onDeleted, size = 'md', iconOnly = false, className = '' }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

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
        className={iconOnly ? `!px-2.5 ${className}` : className}
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
