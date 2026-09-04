import React, { ButtonHTMLAttributes } from 'react';
import './Button.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  children,
  className = '',
  ...props
}) => {
  const baseClass = 'deony-button';
  const variantClass = `${baseClass}--${variant}`;
  const sizeClass = `${baseClass}--${size}`;
  const stateClass = disabled || loading ? `${baseClass}--disabled` : '';
  const loadingClass = loading ? `${baseClass}--loading` : '';

  return (
    <button
      className={`${baseClass} ${variantClass} ${sizeClass} ${stateClass} ${loadingClass} text-label-md ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="deony-button__spinner" /> : children}
    </button>
  );
};
