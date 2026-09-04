import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/ui/useToast';
import { normalizeRatingTo5, formatRating5 } from '../utils/rating';
import { shareContent } from '../utils/share';
import { JournalViewer } from '../components/editor/JournalViewer';

interface Experience {
  id: string;
  media_id: string;
  media_title: string;
  status: string;
  rating?: number;
  thoughts?: string;
  started_on?: string;
  ended_on?: string;
  version: number;
}

interface MediaItem {
  id: string;
  cover_image?: string;
  title?: string;
}

export function ExperienceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [experience, setExperience] = useState<Experience | null>(null);
  const [coverImage, setCoverImage] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchExperience(id);
    }
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
            setCoverImage(mediaRes.items[0].cover_image);
          }
        } catch (e) {
          // ignore media fetch error
        }
      }
    } catch (e) {
      showToast('Failed to load experience', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this experience?')) return;
    try {
      await api.delete(`/experiences/${id}`);
      showToast('Experience deleted', 'success');
      navigate('/library');
    } catch (e) {
      showToast('Failed to delete', 'error');
    }
  };

  const handleShare = async () => {
    if (!experience) return;
    const url = window.location.href;
    const res = await shareContent({
      title: `${experience.media_title} — Deony`,
      text: `Reflections on ${experience.media_title} on Deony:`,
      url,
    });

    if (res === 'shared') {
      showToast('Experience shared!', 'success');
    } else if (res === 'copied') {
      showToast('Experience link copied to clipboard!', 'success');
    } else {
      showToast('Failed to copy link', 'error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-[860px] mx-auto px-gutter md:px-8 py-xl">
        <div className="animate-pulse flex flex-col gap-lg">
          <div className="h-10 w-24 bg-surface-variant rounded"></div>
          <div className="h-64 bg-surface-variant rounded-xl"></div>
          <div className="h-12 w-3/4 bg-surface-variant rounded"></div>
          <div className="h-32 bg-surface-variant rounded-xl"></div>
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
            onClick={() => navigate('/library')}
            className="mt-md bg-primary text-on-primary font-label-md text-label-md rounded-lg px-lg py-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[860px] mx-auto px-gutter md:px-8 py-lg md:py-xl">
      <div className="flex justify-between items-center mb-lg">
        <button 
          onClick={() => navigate('/library')}
          className="flex items-center gap-sm text-on-surface-variant hover:text-on-surface font-label-md text-label-md transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Library
        </button>
        <div className="flex gap-sm">
          <button 
            type="button"
            onClick={handleShare}
            className="flex items-center gap-xs border border-tertiary/30 text-on-surface-variant font-label-md text-label-md rounded-lg px-md py-sm hover:bg-surface-variant transition-colors cursor-pointer"
            title="Share this experience"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
            Share
          </button>
          <button 
            type="button"
            onClick={() => navigate(`/experience/${experience.id}/edit`)}
            className="flex items-center gap-xs border border-tertiary/30 text-on-surface-variant font-label-md text-label-md rounded-lg px-lg py-sm hover:bg-surface-variant transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Edit
          </button>
          <button 
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-xs border border-error/40 text-error font-label-md text-label-md rounded-lg px-lg py-sm hover:bg-error hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            Delete
          </button>
        </div>
      </div>
      
      <div className="bg-surface-container-lowest border border-tertiary/25 rounded-xl p-md sm:p-lg overflow-hidden flex flex-col gap-lg shadow-xs">
        {coverImage && (
          <div className="w-[calc(100%+32px)] sm:w-[calc(100%+48px)] h-64 -mt-md -mx-md sm:-mt-lg sm:-mx-lg bg-surface-variant relative overflow-hidden">
            <img src={coverImage} alt={experience.media_title} className="w-full h-full object-cover" />
          </div>
        )}
        
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary mb-md">{experience.media_title}</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md p-md bg-surface-container-low rounded-lg border border-tertiary/25">
            <div className="flex flex-col gap-xs">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">Status</span>
              <span className="font-body-md text-body-md text-on-surface">{experience.status}</span>
            </div>
            
            <div className="flex flex-col gap-xs">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">Rating</span>
              <div className="flex items-center gap-xs">
                {experience.rating !== undefined && experience.rating !== null ? (
                  <>
                    <div className="flex items-center gap-[2px]">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const norm = normalizeRatingTo5(experience.rating);
                        const filled = norm !== null && star <= Math.round(norm);
                        return (
                          <span 
                            key={star} 
                            className={`material-symbols-outlined text-[20px] ${
                              filled ? 'text-primary' : 'text-outline-variant/35'
                            }`}
                            style={{ fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0" }}
                          >
                            star
                          </span>
                        );
                      })}
                    </div>
                    <span className="font-body-md text-body-md text-secondary ml-xs font-medium">
                      {formatRating5(experience.rating)} / 5
                    </span>
                  </>
                ) : (
                  <span className="font-body-md text-body-md text-on-surface">Unrated</span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-xs">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">Started</span>
              <span className="font-body-md text-body-md text-on-surface">{experience.started_on || '-'}</span>
            </div>
            
            <div className="flex flex-col gap-xs">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">Ended</span>
              <span className="font-body-md text-body-md text-on-surface">{experience.ended_on || '-'}</span>
            </div>
          </div>
        </div>
        
        {experience.thoughts && (
          <div>
            <h3 className="font-headline-md text-headline-md text-primary mb-md pb-xs border-b border-tertiary/25 flex items-center gap-sm">
              <span className="material-symbols-outlined">menu_book</span>
              Thoughts
            </h3>
            <JournalViewer content={experience.thoughts} />
          </div>
        )}
      </div>
    </div>
  );
}
