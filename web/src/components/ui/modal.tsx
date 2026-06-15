'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
} as const;

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Footer node (e.g. action buttons). Rendered in a right-aligned footer. */
  footer?: React.ReactNode;
  size?: keyof typeof SIZES;
  /** Constrain body height and scroll long content with a thin scrollbar. */
  scrollable?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * App-wide modal. Wraps the Dialog primitive with consistent sizing, header,
 * scroll behaviour, and footer — use this for every dialog/form-in-dialog.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  footer,
  size = 'md',
  scrollable = true,
  className,
  children,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('gap-0 overflow-hidden p-0 shadow-pop', SIZES[size], className)}>
        {(title || description) && (
          <DialogHeader className="border-b px-6 py-4 text-left">
            {title && <DialogTitle className="text-base">{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}

        <div className={cn('px-6 py-5', scrollable && 'max-h-[70vh] overflow-y-auto scrollbar-thin')}>
          {children}
        </div>

        {footer && (
          <DialogFooter className="border-t bg-muted/30 px-6 py-4">{footer}</DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
