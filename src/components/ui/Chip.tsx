import React, { HTMLAttributes } from 'react';
import './Chip.css';

export interface ChipProps extends HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

export const Chip: React.FC<ChipProps> = ({
  children,
  active,
  removable,
  onRemove,
  className = '',
  onClick,
  ...props
}) => {
  const isClickable = !!onClick;
  const classes = `deony-chip ${active ? 'deony-chip--active' : ''} ${isClickable ? 'deony-chip--clickable' : ''} text-label-md ${className}`;

  return (
    <div className={classes} onClick={onClick} {...props}>
      <span className="deony-chip__label">{children}</span>
      {removable && (
        <button
          className="deony-chip__remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          aria-label="Remove"
        >
          &times;
        </button>
      )}
    </div>
  );
};
