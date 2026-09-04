import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/ui/useToast';
import { normalizeRatingTo5 } from '../utils/rating';
import { JournalEditor } from '../components/editor/JournalEditor';

interface Experience {
  id: string;
  media_title: string;
  status: string;
  rating?: number | null;
  thoughts?: string;
  started_on?: string;
  ended_on?: string;
  version: number;
}

export function EditExperiencePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [experience, setExperience] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchExperience(id);
  }, [id]);

  const fetchExperience = async (expId: string) => {
    try {
      setLoading(true);
      const res = await api.get<Experience>(`/experiences/${expId}`);
      setExperience(res);
    } catch (e) {
      setErrorMsg('Failed to load experience');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!experience || !id) return;

    try {
      setSaving(true);
      await api.patch(`/experiences/${id}`, {
        status: experience.status,
        rating: experience.rating,
        started_on: experience.started_on,
        ended_on: experience.ended_on,
        thoughts: experience.thoughts,
        version: experience.version
      });
      showToast('Experience updated', 'success');
      navigate(`/experience/${id}`);
    } catch (e: unknown) {
      if (typeof e === 'object' && e !== null && 'status' in e && (e as any).status === 409) {
        setErrorMsg('Update conflict: experience was modified by another source');
      } else {
        setErrorMsg('Failed to update');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStarClick = (starIndex: number) => {
    const current = experience?.rating !== undefined && experience?.rating !== null
      ? Math.round(normalizeRatingTo5(experience.rating) || 0)
      : 0;
    const newRating = current === starIndex ? null : starIndex * 2;
    setExperience(prev => prev ? { ...prev, rating: newRating } : prev);
  };

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto px-gutter md:px-margin-desktop py-xl">
        <div className="animate-pulse flex flex-col gap-xl">
          <div className="w-24 h-6 bg-surface-variant rounded"></div>
          <div className="bg-surface-container-lowest border border-tertiary rounded-xl p-lg flex flex-col gap-lg">
            <div className="h-8 w-1/2 bg-surface-variant rounded mb-md"></div>
            <div className="h-14 bg-surface-variant rounded"></div>
            <div className="h-14 bg-surface-variant rounded"></div>
            <div className="grid grid-cols-2 gap-md">
              <div className="h-14 bg-surface-variant rounded"></div>
              <div className="h-14 bg-surface-variant rounded"></div>
            </div>
            <div className="h-64 bg-surface-variant rounded mt-md"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="max-w-[800px] mx-auto px-gutter md:px-margin-desktop py-xl">
        <div className="border border-dashed border-outline-variant rounded-xl p-xl flex flex-col items-center justify-center text-center gap-md">
          <span className="material-symbols-outlined text-4xl text-outline">error</span>
          <h2 className="font-headline-md text-headline-md text-on-surface">Experience not found</h2>
          <button 
            onClick={() => navigate(-1)}
            className="mt-md bg-primary text-on-primary font-label-md text-label-md rounded-lg px-lg py-sm hover:opacity-90 transition-opacity"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentStar = experience?.rating !== undefined && experience?.rating !== null
    ? Math.round(normalizeRatingTo5(experience.rating) || 0)
    : 0;

  return (
    <div className="max-w-[800px] mx-auto px-gutter md:px-margin-desktop py-xl">
      <button 
        type="button"
        onClick={() => navigate(-1)} 
        className="flex items-center gap-sm text-on-surface-variant hover:text-on-surface font-label-md text-label-md mb-xl transition-colors"
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Cancel
      </button>
      
      <div className="bg-surface-container-lowest border border-tertiary rounded-xl p-lg">
        <h1 className="font-headline-lg text-headline-lg text-primary mb-xl">
          Edit {experience.media_title}
        </h1>
        {errorMsg && (
          <div className="bg-error text-on-error px-lg py-sm rounded-md mb-lg flex justify-between items-center">
            <span className="font-body-md text-body-md">{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="opacity-80 hover:opacity-100 p-1">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        )}
        
        <form onSubmit={handleSave} className="flex flex-col gap-lg">
          
          <div className="flex flex-col gap-xs">
            <label htmlFor="status" className="font-label-md text-label-md text-on-surface-variant">Status</label>
            <div className="relative">
              <select 
                id="status"
                value={experience.status} 
                onChange={e => setExperience({ ...experience, status: e.target.value })}
                className="w-full appearance-none bg-transparent border-b border-tertiary rounded-none py-sm px-xs font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors pr-xl"
              >
                <option value="Want to Experience">Want to Experience</option>
                <option value="Currently Experiencing">Currently Experiencing</option>
                <option value="Completed">Completed</option>
                <option value="Dropped">Dropped</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                expand_more
              </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface-variant">Rating</label>
            <div className="flex items-center gap-sm">
              <div className="flex items-center gap-xs">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= currentStar;
                  return (
                    <button
                      key={star}
                      type="button"
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                      onClick={() => handleStarClick(star)}
                      className="focus:outline-none hover:scale-110 transition-transform p-0 bg-transparent border-0"
                    >
                      <span 
                        className={`material-symbols-outlined text-[32px] ${
                          isFilled ? 'text-primary' : 'text-outline-variant/35'
                        }`}
                        style={{ fontVariationSettings: isFilled ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        star
                      </span>
                    </button>
                  );
                })}
              </div>
              <span className="font-body-md text-body-md text-secondary ml-xs">
                {currentStar > 0 ? `${currentStar} / 5 Stars` : 'Unrated'}
              </span>
              {currentStar > 0 && (
                <button
                  type="button"
                  onClick={() => setExperience(prev => prev ? { ...prev, rating: null } : prev)}
                  className="font-caption text-caption text-secondary hover:text-error ml-xs transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            <div className="flex flex-col gap-xs">
              <label htmlFor="started-on" className="font-label-md text-label-md text-on-surface-variant">Started On</label>
              <input 
                id="started-on"
                type="date" 
                value={experience.started_on || ''} 
                onChange={e => setExperience({ ...experience, started_on: e.target.value })}
                className="w-full bg-transparent border-b border-tertiary rounded-none py-sm px-xs font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="flex flex-col gap-xs">
              <label htmlFor="ended-on" className="font-label-md text-label-md text-on-surface-variant">Ended On</label>
              <input 
                id="ended-on"
                type="date" 
                value={experience.ended_on || ''} 
                onChange={e => setExperience({ ...experience, ended_on: e.target.value })}
                className="w-full bg-transparent border-b border-tertiary rounded-none py-sm px-xs font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-xs mt-md">
            <label className="font-label-md text-label-md text-on-surface-variant flex items-center gap-xs">
              <span className="material-symbols-outlined text-[18px]">menu_book</span>
              Thoughts
            </label>
            <div className="border border-tertiary rounded-lg overflow-hidden focus-within:border-primary transition-colors">
              <JournalEditor 
                initialContent={experience.thoughts || ''} 
                onChange={val => setExperience({ ...experience, thoughts: val })}
              />
            </div>
          </div>
          
          <div className="mt-xl flex justify-end gap-md">
            <button 
              type="button"
              onClick={() => navigate(-1)}
              className="border border-tertiary text-on-surface-variant font-label-md text-label-md rounded-lg px-lg py-sm hover:bg-surface-variant transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving}
              className="bg-primary text-on-primary font-label-md text-label-md rounded-lg px-lg py-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-sm"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
