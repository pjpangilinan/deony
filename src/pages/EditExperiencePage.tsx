import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/ui/useToast';
import { normalizeRatingTo5 } from '../utils/rating';
import { JournalEditor } from '../components/editor/JournalEditor';
import { compressImage } from '../utils/imageCompressor';

interface Experience {
  id: string;
  media_id: string;
  media_title: string;
  status: string;
  rating?: number | null;
  thoughts?: string;
  started_on?: string;
  ended_on?: string;
  version: number;
}

interface MediaItem {
  id: string;
  title?: string;
  cover_image?: string;
}

export function EditExperiencePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [experience, setExperience] = useState<Experience | null>(null);
  const [mediaItem, setMediaItem] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Picture change state
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUrlInputOpen, setIsUrlInputOpen] = useState(false);
  const [imageUrlValue, setImageUrlValue] = useState('');
  const [coverError, setCoverError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) fetchExperience(id);
  }, [id]);

  const fetchExperience = async (expId: string) => {
    try {
      setLoading(true);
      const res = await api.get<Experience>(`/experiences/${expId}`);
      setExperience(res);

      if (res.media_id) {
        try {
          const mediaRes = await api.post<{ items: MediaItem[] }>('/media/batch-get', { ids: [res.media_id] });
          if (mediaRes.items && mediaRes.items.length > 0) {
            setMediaItem(mediaRes.items[0]);
          }
        } catch (mErr) {
          console.error('Failed to load media item', mErr);
        }
      }
    } catch (e) {
      setErrorMsg('Failed to load experience');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCover = async (coverUrl: string) => {
    if (!experience?.media_id) {
      setCoverError('Media identifier missing. Unable to update cover.');
      return;
    }
    const trimmed = coverUrl.trim();
    if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:image/')) {
      setCoverError('Please enter a valid image web link starting with https:// or http://');
      return;
    }

    try {
      setCoverError(null);
      setIsUploadingCover(true);
      await api.patch(`/media/${encodeURIComponent(experience.media_id)}`, {
        cover_image: trimmed,
      });
      setMediaItem((prev) => (prev ? { ...prev, cover_image: trimmed } : { id: experience.media_id, cover_image: trimmed }));
      setIsUrlInputOpen(false);
      setImageUrlValue('');
    } catch (err: any) {
      console.error('Failed to update cover', err);
      const detail = err?.response?.data?.error || err?.message || 'Server was unable to save the cover image';
      setCoverError(`Failed to update cover picture: ${detail}`);
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setCoverError(`Selected image is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose an image under 10MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setCoverError(null);
      setIsUploadingCover(true);
      // Fast client-side resize and compression to JPEG ~150KB
      const compressedDataUrl = await compressImage(file, 1200, 0.85);
      await handleUpdateCover(compressedDataUrl);
    } catch (err: any) {
      console.error('Failed to process image file', err);
      setCoverError(err?.message || 'Could not process the selected image file.');
    } finally {
      setIsUploadingCover(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      <div className="max-w-[860px] mx-auto px-gutter md:px-8 py-xl">
        <div className="animate-pulse flex flex-col gap-xl">
          <div className="w-24 h-6 bg-surface-variant rounded"></div>
          <div className="bg-surface-container-lowest border border-tertiary/25 rounded-xl p-lg flex flex-col gap-lg">
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
      <div className="max-w-[860px] mx-auto px-gutter md:px-8 py-xl">
        <div className="border border-dashed border-outline-variant rounded-xl p-xl flex flex-col items-center justify-center text-center gap-md">
          <span className="material-symbols-outlined text-4xl text-outline">error</span>
          <h2 className="font-headline-md text-headline-md text-on-surface">Experience not found</h2>
          <button 
            onClick={() => navigate(-1)}
            className="mt-md bg-primary text-on-primary font-label-md text-label-md rounded-lg px-lg py-sm hover:opacity-90 transition-opacity cursor-pointer"
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
    <div className="max-w-[860px] mx-auto px-gutter md:px-8 py-lg md:py-xl">
      <button 
        type="button"
        onClick={() => navigate(-1)} 
        className="flex items-center gap-sm text-on-surface-variant hover:text-on-surface font-label-md text-label-md mb-lg transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Cancel
      </button>
      
      <div className="bg-surface-container-lowest border border-tertiary/25 rounded-xl p-md sm:p-lg shadow-xs">
        <h1 className="font-headline-lg text-headline-lg text-primary border-b border-tertiary/25 pb-md mb-lg">
          Edit {experience.media_title}
        </h1>
        {errorMsg && (
          <div className="bg-error text-on-error px-lg py-sm rounded-md mb-lg flex justify-between items-center">
            <span className="font-body-md text-body-md">{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="opacity-80 hover:opacity-100 p-1 cursor-pointer">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        )}

        {/* Media Cover Preview & Picture Controls */}
        <div className="mb-lg w-full p-md bg-surface-container-low rounded-lg border border-tertiary/25 flex flex-col sm:flex-row items-start gap-md">
          <div className="w-20 h-28 bg-surface-variant rounded border border-tertiary/25 overflow-hidden shrink-0 relative group">
            {mediaItem?.cover_image ? (
              <img src={mediaItem.cover_image} alt={experience.media_title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[28px]">perm_media</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 w-full self-stretch">
            <h3 className="font-headline-md text-sm sm:text-base text-primary font-medium truncate">
              {experience.media_title}
            </h3>
            <p className="font-caption text-xs text-secondary mt-0.5 mb-sm">
              Change the cover picture by uploading an image file or pasting an image link.
            </p>
            <div className="flex flex-wrap items-center gap-xs">
              <button
                type="button"
                disabled={isUploadingCover}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-label-md text-on-surface bg-surface hover:bg-surface-variant rounded border border-tertiary/25 transition-colors cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[15px]">upload</span>
                <span>Upload Photo</span>
              </button>
              <button
                type="button"
                disabled={isUploadingCover}
                onClick={() => setIsUrlInputOpen(!isUrlInputOpen)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-label-md text-on-surface bg-surface hover:bg-surface-variant rounded border border-tertiary/25 transition-colors cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[15px]">link</span>
                <span>URL</span>
              </button>
              {mediaItem?.cover_image && (
                <button
                  type="button"
                  disabled={isUploadingCover}
                  onClick={() => handleUpdateCover('')}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-label-md text-error hover:bg-error/10 rounded transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">delete</span>
                  <span>Remove</span>
                </button>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {isUploadingCover && (
              <div className="flex items-center gap-xs text-xs text-primary font-caption mt-1">
                <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                <span>Updating cover picture...</span>
              </div>
            )}

            {isUrlInputOpen && (
              <div className="flex items-center gap-xs mt-2 w-full max-w-md min-w-[260px] p-1.5 bg-surface rounded border border-tertiary/25 animate-fade-in">
                <input
                  type="url"
                  placeholder="https://.../cover.jpg"
                  value={imageUrlValue}
                  onChange={(e) => {
                    setImageUrlValue(e.target.value);
                    if (coverError) setCoverError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleUpdateCover(imageUrlValue.trim());
                    }
                  }}
                  className="flex-1 min-w-0 text-xs py-1 px-2 border-b border-tertiary/30 focus:border-primary bg-transparent outline-none font-body-md text-on-surface"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateCover(imageUrlValue.trim())}
                  className="px-2.5 py-1 bg-primary text-on-primary text-xs font-label-md rounded hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                >
                  Apply
                </button>
              </div>
            )}

            {coverError && (
              <div className="mt-xs w-full max-w-md min-w-[260px] p-2 bg-error/10 border border-error/25 text-error rounded text-xs flex items-start gap-1.5 animate-fade-in">
                <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">error</span>
                <span className="flex-1 min-w-0 font-body-sm text-[12px] leading-snug whitespace-normal break-words">{coverError}</span>
                <button
                  type="button"
                  onClick={() => setCoverError(null)}
                  className="text-error/70 hover:text-error p-0.5 cursor-pointer shrink-0"
                  aria-label="Dismiss cover error"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            )}
          </div>
        </div>
        
        <form onSubmit={handleSave} className="flex flex-col gap-md">
          
          <div className="flex flex-col gap-xs">
            <label htmlFor="status" className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">
              Status
            </label>
            <div className="relative">
              <select 
                id="status"
                value={experience.status} 
                onChange={e => setExperience({ ...experience, status: e.target.value })}
                className="w-full appearance-none bg-transparent border-b border-tertiary/30 rounded-none py-sm px-xs font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors pr-xl cursor-pointer"
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
            <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">Rating</label>
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
                      className="focus:outline-none hover:scale-110 transition-transform p-0 bg-transparent border-0 cursor-pointer"
                    >
                      <span 
                        className={`material-symbols-outlined text-[28px] ${
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
                  className="font-caption text-caption text-secondary hover:text-error ml-xs transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="flex flex-col gap-xs">
              <label htmlFor="started-on" className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">
                Started On
              </label>
              <input 
                id="started-on"
                type="date" 
                value={experience.started_on || ''} 
                onChange={e => setExperience({ ...experience, started_on: e.target.value })}
                className="w-full bg-transparent border-b border-tertiary/30 rounded-none py-sm px-xs font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors cursor-text"
              />
            </div>
            <div className="flex flex-col gap-xs">
              <label htmlFor="ended-on" className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">
                Ended On
              </label>
              <input 
                id="ended-on"
                type="date" 
                value={experience.ended_on || ''} 
                onChange={e => setExperience({ ...experience, ended_on: e.target.value })}
                className="w-full bg-transparent border-b border-tertiary/30 rounded-none py-sm px-xs font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors cursor-text"
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-xs mt-xs">
            <label className="font-label-md text-label-md text-on-surface-variant flex items-center gap-xs uppercase tracking-wide">
              <span className="material-symbols-outlined text-[18px]">menu_book</span>
              Thoughts
            </label>
            <JournalEditor 
              initialContent={experience.thoughts || ''} 
              onChange={val => setExperience({ ...experience, thoughts: val })}
              minHeightClass="min-h-[130px]"
              maxHeightClass="max-h-[220px]"
              placeholder="Record your personal reflections, quotes, or thoughts on this experience..."
            />
          </div>
          
          <div className="mt-lg flex justify-end gap-md pt-sm border-t border-tertiary/25">
            <button 
              type="button"
              onClick={() => navigate(-1)}
              className="border border-tertiary/30 text-on-surface-variant font-label-md text-label-md rounded-lg px-lg py-sm hover:bg-surface-variant transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving}
              className="bg-primary text-on-primary font-label-md text-label-md rounded-lg px-xl py-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-sm cursor-pointer shadow-xs"
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
