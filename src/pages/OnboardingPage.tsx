import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export function OnboardingPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>(['movie', 'book', 'game']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { id: 'movie', label: 'Films', icon: 'movie' },
    { id: 'tv', label: 'Shows', icon: 'tv' },
    { id: 'book', label: 'Books', icon: 'menu_book' },
    { id: 'game', label: 'Games', icon: 'sports_esports' },
    { id: 'music', label: 'Albums', icon: 'album' },
    { id: 'podcast', label: 'Podcasts', icon: 'podcasts' },
  ];

  const toggleCategory = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleContinue = async () => {
    if (selected.length === 0) {
      navigate('/home');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await Promise.all(selected.map(async (catId, index) => {
        const cat = categories.find(c => c.id === catId);
        if (cat) {
          await api.post('/categories', {
            name: cat.label,
            media_type: cat.id,
            icon: cat.icon,
            is_builtin: true,
            sort_order: index
          });
        }
      }));
      navigate('/home');
    } catch (error) {
      console.error('Failed to create categories', error);
      navigate('/home');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    navigate('/home');
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-gutter py-lg selection:bg-primary-container selection:text-on-primary-container">
      <div className="flex flex-col items-center max-w-[620px] w-full mx-auto">
        {/* Brand & Heading - Tight & Centered */}
        <h1 className="font-display text-[2rem] sm:text-[2.25rem] text-primary mb-xs tracking-tight">
          Deony
        </h1>
        
        <h2 className="font-headline-md text-headline-md text-on-surface mb-xs text-center font-medium">
          Choose your building blocks
        </h2>
        
        <p className="font-body-md text-body-md text-secondary mb-md text-center max-w-[460px]">
          Select the categories you'd like to track in your digital sanctuary. You can customize them anytime.
        </p>

        {/* Categories Grid - Tight, Responsive, Gratifying Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-sm sm:gap-md w-full mb-md">
          {categories.map((cat) => {
            const isSelected = selected.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                aria-pressed={isSelected}
                className={`group relative flex flex-col items-center justify-center p-md rounded-xl border transition-all duration-200 cursor-pointer h-28 sm:h-32 text-center select-none ${
                  isSelected 
                    ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40' 
                    : 'border-tertiary/30 bg-surface-container-lowest hover:border-outline hover:bg-surface-container hover:scale-[1.02]'
                }`}
              >
                {/* Active checkmark indicator */}
                {isSelected && (
                  <span className="absolute top-2 right-2 material-symbols-outlined text-[16px] text-primary">
                    check_circle
                  </span>
                )}
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border flex items-center justify-center mb-xs transition-colors duration-200 ${
                  isSelected
                    ? 'bg-primary text-on-primary border-primary'
                    : 'border-tertiary/30 bg-surface text-secondary group-hover:text-primary group-hover:border-primary/40'
                }`}>
                  <span className="material-symbols-outlined text-[24px]">
                    {cat.icon}
                  </span>
                </div>
                <span className={`font-label-md text-label-md transition-colors ${
                  isSelected ? 'text-primary font-semibold' : 'text-on-surface font-medium'
                }`}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Step indicator dots */}
        <div className="flex items-center gap-xs mb-md">
          <div className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim"></div>
          <div className="w-4 h-1.5 rounded-full bg-primary"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim"></div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col items-center gap-xs w-full max-w-[260px]">
          <button 
            type="button"
            onClick={handleContinue}
            disabled={isSubmitting}
            className="w-full bg-primary text-on-primary font-label-md text-label-md rounded-lg py-sm px-lg flex items-center justify-center gap-xs hover:bg-on-primary-fixed-variant transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                <span>Setting up...</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </>
            )}
          </button>

          <button 
            type="button"
            onClick={handleSkip}
            className="text-secondary font-label-md text-caption hover:text-primary transition-colors py-xs"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
