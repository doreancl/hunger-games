'use client';

import { Frown, HelpCircle, Meh, Smile, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type FeedbackRating = 'sad' | 'neutral' | 'happy';
type SubmissionStatus = 'idle' | 'sending' | 'sent' | 'error';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type HelpFeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ratingOptions: Array<{
  value: FeedbackRating;
  label: string;
  Icon: typeof Frown;
}> = [
  { value: 'sad', label: 'Malo', Icon: Frown },
  { value: 'neutral', label: 'Normal', Icon: Meh },
  { value: 'happy', label: 'Bueno', Icon: Smile }
];

export function HelpFeedbackDialog({ open, onOpenChange }: HelpFeedbackDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [status, setStatus] = useState<SubmissionStatus>('idle');
  const [error, setError] = useState('');
  const trimmedMessageLength = message.trim().length;
  const hasInvalidEmail = Boolean(email.trim() && !emailPattern.test(email.trim()));

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpenChange, open]);

  function resetLater(): void {
    window.setTimeout(() => {
      setStatus('idle');
      setError('');
      setMessage('');
      setEmail('');
      setRating(null);
    }, 250);
  }

  function close(): void {
    onOpenChange(false);
    resetLater();
  }

  async function submit(): Promise<void> {
    const trimmedMessage = message.trim();
    const trimmedEmail = email.trim();
    if (
      trimmedMessage.length < 10 ||
      (trimmedEmail && !emailPattern.test(trimmedEmail)) ||
      status === 'sending'
    ) {
      return;
    }

    setStatus('sending');
    setError('');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmedMessage, rating, email: trimmedEmail })
      });

      if (!response.ok) {
        setStatus('error');
        setError('No se pudo enviar el feedback.');
        return;
      }

      setStatus('sent');
      setMessage('');
      setEmail('');
      setRating(null);
      window.setTimeout(() => {
        onOpenChange(false);
        setStatus('idle');
      }, 900);
    } catch {
      setStatus('error');
      setError('No se pudo enviar el feedback.');
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-4 py-6 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-[430px] rounded-lg border bg-card p-5 text-card-foreground shadow-lg"
      >
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg border bg-background text-primary">
            <HelpCircle className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold">
              Help
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
              Cuéntanos qué funcionó o qué mejorarías de la experiencia.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="ml-auto"
            onClick={close}
            aria-label="Cerrar help"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-5 grid gap-4">
          <div className="flex items-center justify-center gap-3" aria-label="Evaluacion">
            {ratingOptions.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className={cn(
                  'grid size-12 place-items-center rounded-lg border text-muted-foreground transition-all hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  rating === value && 'border-primary bg-primary/10 text-primary'
                )}
                aria-label={label}
                aria-pressed={rating === value}
              >
                <Icon className="size-6" aria-hidden="true" />
              </button>
            ))}
          </div>

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Escribe tu feedback..."
            className={cn(
              'min-h-32 w-full resize-none rounded-md border bg-background p-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring',
              trimmedMessageLength > 0 &&
                trimmedMessageLength < 10 &&
                'border-red-500/80 bg-red-950/20 focus-visible:border-red-500 focus-visible:ring-red-500/40'
            )}
            maxLength={1000}
            minLength={10}
          />
          <p
            className={cn(
              'text-xs text-muted-foreground',
              trimmedMessageLength > 0 && trimmedMessageLength < 10 && 'font-medium text-red-400'
            )}
          >
            Mínimo 10 caracteres · {trimmedMessageLength}/1000
          </p>

          <label className="grid gap-1.5 text-sm font-medium">
            Correo (opcional)
            <span className="text-xs font-normal text-muted-foreground">
              Por si quieres ser contactado
            </span>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@correo.com"
              maxLength={254}
              aria-invalid={hasInvalidEmail}
              className={cn(
                hasInvalidEmail &&
                  'border-red-500/80 bg-red-950/20 focus-visible:border-red-500 focus-visible:ring-red-500/40'
              )}
            />
          </label>
          {hasInvalidEmail ? (
            <p className="text-xs font-medium text-red-400">Ingresa un correo válido.</p>
          ) : null}

          {status === 'error' ? (
            <p className="text-center text-sm font-medium text-destructive">{error}</p>
          ) : null}
          {status === 'sent' ? (
            <p className="text-center text-sm font-medium text-primary">Feedback enviado.</p>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={
              status === 'sending' ||
              trimmedMessageLength < 10 ||
              hasInvalidEmail
            }
          >
            {status === 'sending' ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </section>
    </div>
  );
}
