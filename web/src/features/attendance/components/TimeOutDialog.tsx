'use client';

import { useState } from 'react';
import { Loader2, LogOut, PartyPopper } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/**
 * Two-step time-out flow:
 *  1. "Daily summary" — the employee describes what they worked on today.
 *  2. "Thank you" — a friendly confirmation once the time-out is recorded.
 *
 * `onSubmit` performs the actual time-out (and may throw — the parent shows the
 * error toast); on success we advance to the thank-you step.
 */
export function TimeOutDialog({
  open,
  onOpenChange,
  onSubmit,
  onClosed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (workSummary: string) => Promise<unknown>;
  onClosed?: () => void;
}) {
  const [summary, setSummary] = useState('');
  const [phase, setPhase] = useState<'form' | 'thanks'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outTime, setOutTime] = useState('');

  function reset() {
    setSummary('');
    setPhase('form');
    setError(null);
    setLoading(false);
  }

  function handleOpenChange(o: boolean) {
    onOpenChange(o);
    if (!o) {
      const wasThanks = phase === 'thanks';
      setTimeout(reset, 200);
      if (wasThanks) onClosed?.();
    }
  }

  async function submit() {
    if (summary.trim().length < 3) {
      setError('Please add a short note about what you worked on today.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit(summary.trim());
      setOutTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      setPhase('thanks');
    } catch {
      // parent surfaces the error toast; stay on the form
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      size="md"
      title={phase === 'form' ? 'Time Out — Daily Summary' : undefined}
      description={
        phase === 'form'
          ? 'Before you clock out, tell us what you worked on today.'
          : undefined
      }
      footer={
        phase === 'form' ? (
          <>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Time Out
            </Button>
          </>
        ) : (
          <Button className="w-full sm:w-auto" onClick={() => handleOpenChange(false)}>
            Done
          </Button>
        )
      }
    >
      {phase === 'form' ? (
        <div className="space-y-1.5">
          <Label htmlFor="work-summary">Today&apos;s accomplishments / particulars</Label>
          <Textarea
            id="work-summary"
            rows={6}
            autoFocus
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={'e.g. Finished the Q3 payroll run, replied to 5 client tickets, drafted the onboarding checklist…'}
          />
          {error ? (
            <p className="text-xs font-medium text-destructive">{error}</p>
          ) : (
            <p className="text-xs text-muted-foreground">This is saved to your daily time record.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
            <PartyPopper className="h-8 w-8" />
          </div>
          <h3 className="font-display text-xl font-bold">Thank you for working today!</h3>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            You clocked out at <span className="font-medium text-foreground">{outTime}</span>. Your
            daily summary has been saved. Have a great rest of your day &amp; see you tomorrow.
          </p>
        </div>
      )}
    </Modal>
  );
}
