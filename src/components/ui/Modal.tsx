import React, { useEffect } from 'react';
import './Modal.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="deony-modal-overlay" onClick={onClose}>
      <div
        className="deony-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
      >
        <div className="deony-modal-header">
          {title && (
            <h2 id="modal-title" className="text-headline-md">
              {title}
            </h2>
          )}
          <button className="deony-modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="deony-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};
