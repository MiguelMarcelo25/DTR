'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/**
 * Generic confirm-with-optional-note dialog used for cancel / approve / reject /
 * complete actions. The note is passed to `onConfirm`.
 *
 * Controlled via `open`/`onOpenChange` so it can be driven from a dropdown menu.
 */
export function NoteActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  noteLabel = 'Note (optional)',
  notePlaceholder,
  noteRequired = false,
  destructive = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  noteLabel?: string;
  notePlaceholder?: string;
  noteRequired?: boolean;
  destructive?: boolean;
  onConfirm: (note: string | undefined) => Promise<unknown> | unknown;
}) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    const trimmed = note.trim();
    if (noteRequired && !trimmed) {
      setError('A reason is required');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onConfirm(trimmed ? trimmed : undefined);
      onOpenChange(false);
      setNote('');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(o: boolean) {
    onOpenChange(o);
    if (!o) {
      setNote('');
      setError(null);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={handle}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-1.5">
        <Label htmlFor="note-action" className="text-foreground">
          {noteLabel}
        </Label>
        <Textarea
          id="note-action"
          placeholder={notePlaceholder}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      </div>
    </Modal>
  );
}
