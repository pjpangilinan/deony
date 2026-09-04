import React, { HTMLAttributes } from 'react';
import './Card.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, ...props }) => {
  const isClickable = !!onClick;
  const classes = `deony-card ${isClickable ? 'deony-card--clickable' : ''} ${className}`;

  return (
    <div className={classes} onClick={onClick} {...props}>
      {children}
    </div>
  );
};
