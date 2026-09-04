import { InputHTMLAttributes, forwardRef } from 'react';
import './Input.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'standard' | 'outlined';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, variant = 'standard', className = '', id, ...props }, ref) => {
    const generatedId = id || Math.random().toString(36).substr(2, 9);
    const inputClass = `deony-input deony-input--${variant} ${error ? 'deony-input--error' : ''} text-body-md`;

    return (
      <div className={`deony-input-wrapper ${className}`}>
        {label && (
          <label htmlFor={generatedId} className="deony-input-label text-label-md">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={generatedId}
          className={inputClass}
          {...props}
        />
        {(error || helperText) && (
          <div className={`deony-input-helper text-caption ${error ? 'deony-input-helper--error' : ''}`}>
            {error || helperText}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
