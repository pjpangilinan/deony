import React from 'react';

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const baseClasses = "flex items-center justify-between min-w-[250px] max-w-[400px] px-md py-sm rounded-lg shadow-md animate-[slide-in_0.3s_ease-out]";
  
  const typeClasses = {
    info: "bg-inverse-surface text-inverse-on-surface",
    error: "bg-error text-on-error",
    success: "bg-primary-container text-on-primary-container",
    warning: "bg-tertiary-container text-on-tertiary-container"
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`} role="alert">
      <span className="flex-1 mr-md font-body-md text-body-md">{message}</span>
      <button 
        className="bg-transparent border-none text-inherit text-[20px] leading-none cursor-pointer p-0 opacity-80 hover:opacity-100 transition-opacity" 
        onClick={onClose} 
        aria-label="Close"
      >
        &times;
      </button>
    </div>
  );
};
