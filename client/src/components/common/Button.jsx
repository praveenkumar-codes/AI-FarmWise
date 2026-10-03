import React from 'react';

const VARIANTS = {
  primary: 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/40 shadow-lg shadow-emerald-950/50',
  danger: 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500/40 shadow-lg shadow-rose-950/50',
  secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700',
  outline: 'bg-transparent hover:bg-slate-800/60 text-slate-300 border-slate-700',
};

export function Button({
  children,
  variant = 'primary',
  className = '',
  disabled = false,
  onClick,
  type = 'button',
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-150 disabled:opacity-45 disabled:cursor-not-allowed ${
        VARIANTS[variant] || VARIANTS.primary
      } ${className}`}
    >
      {children}
    </button>
  );
}

export default Button;
