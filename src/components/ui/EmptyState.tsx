import React from 'react';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: string;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: string;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inventory_2',
  title,
  description,
  primaryAction,
  secondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-xl md:p-xxl text-center rounded-xl border border-dashed border-tertiary/40 bg-surface-container-low/30 ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center text-primary/70 mb-md border border-tertiary/20">
        <span className="material-symbols-outlined text-[32px]">{icon}</span>
      </div>

      <h3 className="font-headline-md text-headline-md text-primary mb-xs">{title}</h3>
      <p className="font-body-md text-body-md text-secondary max-w-[28rem] mb-lg leading-relaxed">
        {description}
      </p>

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-md">
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="inline-flex items-center gap-xs font-label-md text-label-md bg-primary text-white hover:bg-primary/90 px-lg py-sm rounded-md transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {primaryAction.icon && (
                <span className="material-symbols-outlined text-[18px]">{primaryAction.icon}</span>
              )}
              {primaryAction.label}
            </button>
          )}

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="inline-flex items-center gap-xs font-label-md text-label-md text-secondary hover:text-primary px-md py-sm rounded-md border border-tertiary/60 hover:bg-surface-variant transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {secondaryAction.icon && (
                <span className="material-symbols-outlined text-[18px]">{secondaryAction.icon}</span>
              )}
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
