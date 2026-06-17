'use client';
// components/spotlight/ui/SpotlightButton.tsx
import { type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size    = 'sm' | 'md' | 'lg';

interface SpotlightButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?:    Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-[#D4AF37] text-black hover:bg-[#C9A227] active:bg-[#B8960C]',
  secondary: 'bg-[#1A1A1A] text-white hover:bg-[#333] active:bg-[#111]',
  ghost:     'bg-transparent border border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
};

export default function SpotlightButton({
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  fullWidth = false,
  className,
  disabled,
  children,
  ...props
}: SpotlightButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'font-bold rounded-xl transition-all duration-150 active:scale-[0.98]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        'flex items-center justify-center gap-2',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      )}
      {children}
    </button>
  );
}
