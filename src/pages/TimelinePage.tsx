import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ui/useToast';
import { normalizeRatingTo5 } from '../utils/rating';

interface Experience {
  id: string;
  media_id: string;
  media_title: string;
  media_type: string;
  status: string;
  rating: number;
  thoughts: string;
  sort_date: string;
  created_at: string;
  started_on: string;
  ended_on: string;
}

interface MediaItem {
  id: string;
  cover_image: string;
}

export function TimelinePage() {
  const { showToast } = useToast();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [mediaMap, setMediaMap] = useState<Record<string, MediaItem>>({});
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('all');

  useEffect(() => {
    fetchTimeline();
  }, []);

  const fetchTimeline = async () => {
    try {
      const res = await api.get<{items: Experience[]}>('/experiences');
      const filtered = res.items.filter(e => e.status !== 'Want to Experience');
      filtered.sort((a, b) => {
        const da = a.sort_date ? new Date(a.sort_date).getTime() : new Date(a.created_at).getTime();
        const db = b.sort_date ? new Date(b.sort_date).getTime() : new Date(b.created_at).getTime();
        return db - da;
      });
      setExperiences(filtered);

      const mediaIds = Array.from(new Set(filtered.map(e => e.media_id).filter(Boolean)));
      if (mediaIds.length > 0) {
        const mediaRes = await api.post<{items: MediaItem[]}>('/media/batch-get', { ids: mediaIds });
        const map: Record<string, MediaItem> = {};
        mediaRes.items.forEach(m => {
          map[m.id] = m;
        });
        setMediaMap(map);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load timeline', 'error');
    } finally {
      setLoading(false);
    }
  };

  const grouped: Record<string, Record<string, Experience[]>> = {};
  experiences.forEach(e => {
    const d = e.sort_date ? new Date(e.sort_date) : new Date(e.created_at);
    const year = d.getFullYear().toString();
    const month = d.toLocaleString('default', { month: 'long' });
    if (!grouped[year]) grouped[year] = {};
    if (!grouped[year][month]) grouped[year][month] = [];
    grouped[year][month].push(e);
  });

  const years = Object.keys(grouped).sort((a,b) => Number(b)-Number(a));
  const displayYears = selectedYear === 'all' ? years : [selectedYear].filter(y => grouped[y]);

  return (
    <div className="max-w-[800px] mx-auto px-gutter py-xl">
      <div className="flex justify-between items-center mb-xl">
        <h1 className="font-headline-lg text-headline-lg text-primary m-0">Timeline</h1>
        {years.length > 0 && (
          <select 
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            aria-label="Jump to Year"
            className="p-sm rounded-lg border border-outline bg-transparent text-on-surface font-label-md text-label-md focus:border-primary focus:outline-none"
          >
            <option value="all">Jump to Year</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="space-y-xl border-l border-tertiary/30 pl-lg ml-md">
          {[1, 2].map(i => (
            <div key={i} className="space-y-md">
              <div className="w-24 h-8 bg-surface-variant animate-pulse rounded"></div>
              <div className="w-32 h-6 bg-surface-variant animate-pulse rounded"></div>
              <div className="bg-surface-container-lowest border border-tertiary rounded-xl p-lg flex gap-lg">
                <div className="w-[100px] h-[150px] bg-surface-variant animate-pulse shrink-0 rounded-md"></div>
                <div className="flex-1 space-y-md">
                  <div className="w-1/2 h-6 bg-surface-variant animate-pulse rounded"></div>
                  <div className="w-full h-16 bg-surface-variant animate-pulse rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : experiences.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-xl border-2 border-dashed border-outline-variant rounded-xl text-center">
          <span className="material-symbols-outlined text-4xl text-outline mb-md">schedule</span>
          <p className="font-body-lg text-body-lg text-on-surface-variant m-0">
            A quiet time... log an experience to see it here.
          </p>
        </div>
      ) : (
        <div className="relative pl-lg ml-md border-l border-tertiary/30">
          {displayYears.map(year => (
            <div key={year} className="mb-xxl">
              <div className="absolute -left-[5px] w-2 h-2 bg-primary rounded-full mt-lg"></div>
              <h2 className="font-headline-lg text-headline-lg text-primary m-0 mb-xl">{year}</h2>
              
              {Object.keys(grouped[year]).map(month => (
                <div key={month} className="mb-xl relative">
                  <div className="absolute -left-[23px] w-1.5 h-1.5 bg-outline rounded-full mt-3"></div>
                  <h3 className="font-headline-md text-headline-md text-on-surface m-0 mb-lg">{month}</h3>
                  
                  <div className="flex flex-col gap-lg">
                    {grouped[year][month].map(exp => {
                      const media = mediaMap[exp.media_id];
                      return (
                        <div key={exp.id} className="bg-surface-container-lowest border border-tertiary rounded-xl p-lg flex gap-lg">
                          {media?.cover_image ? (
                            <img src={media.cover_image} alt="" className="w-[100px] h-[150px] object-cover rounded-md shrink-0 bg-surface-variant" />
                          ) : exp.media_id ? (
                            <div className="w-[100px] h-[150px] bg-surface-variant rounded-md shrink-0 flex items-center justify-center">
                              <span className="material-symbols-outlined text-outline">image</span>
                            </div>
                          ) : null}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-sm">
                              <span className="text-on-surface-variant font-label-md text-label-md uppercase">
                                {new Date(exp.sort_date || exp.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                              </span>
                              {exp.rating !== undefined && exp.rating !== null && (
                                <div className="flex items-center gap-0.5 text-primary">
                                  {[1, 2, 3, 4, 5].map(star => {
                                    const norm = normalizeRatingTo5(exp.rating) || 0;
                                    const isFilled = star <= Math.round(norm);
                                    return (
                                      <span
                                        key={star}
                                        className={`material-symbols-outlined text-sm ${
                                          isFilled ? 'text-primary' : 'text-outline-variant/35'
                                        }`}
                                        style={{ fontVariationSettings: isFilled ? "'FILL' 1" : "'FILL' 0" }}
                                      >
                                        star
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <h4 className="font-headline-md text-headline-md text-on-surface m-0 mb-sm truncate">{exp.media_title}</h4>
                            <p className="font-body-md text-body-md text-on-surface m-0 mb-md line-clamp-3">
                              {exp.thoughts || 'No thoughts recorded.'}
                            </p>
                            <div className="flex gap-sm">
                              <span className="font-caption text-caption bg-surface-variant text-on-surface-variant px-sm py-xs rounded-full uppercase">
                                {exp.media_type}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
