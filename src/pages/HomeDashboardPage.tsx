import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { SkeletonCard, SkeletonRow, EmptyState } from '../components/ui';

interface Experience {
  id: string;
  media_id?: string;
  media_title: string;
  media_type: string;
  status: string;
  category_id?: string;
  rating?: number | null;
  sort_date?: string;
  started_on?: string;
  ended_on?: string;
  thoughts?: string;
  created_at?: string;
  updated_at?: string;
}

interface MediaItem {
  id: string;
  title: string;
  media_type?: string;
  cover_image?: string;
  description?: string;
  release_date?: string;
}

export function HomeDashboardPage() {
  const navigate = useNavigate();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [mediaMap, setMediaMap] = useState<Record<string, MediaItem>>({});
  const [loading, setLoading] = useState(true);
  const [quickLogText, setQuickLogText] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ items: Experience[] }>('/experiences');
      const items = res.items || [];
      setExperiences(items);

      const mediaIds = Array.from(new Set(items.map(e => e.media_id).filter(Boolean))) as string[];
      if (mediaIds.length > 0) {
        try {
          const mediaRes = await api.post<{ items: MediaItem[] }>('/media/batch-get', { ids: mediaIds });
          if (mediaRes.items) {
            const map: Record<string, MediaItem> = {};
            mediaRes.items.forEach(m => {
              map[m.id] = m;
            });
            setMediaMap(map);
          }
        } catch (mErr) {
          console.error('Failed to batch fetch media items:', mErr);
        }
      }
    } catch (e) {
      console.error('Failed to fetch experiences:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLog = () => {
    if (quickLogText.trim()) {
      navigate('/log', { state: { initialQuery: quickLogText.trim() } });
    } else {
      navigate('/log');
    }
  };

  const getMediaIcon = (mediaType?: string) => {
    switch (mediaType?.toLowerCase()) {
      case 'book':
      case 'reading':
        return 'menu_book';
      case 'movie':
      case 'tv':
      case 'film':
      case 'watching':
        return 'movie';
      case 'music':
      case 'album':
      case 'listening':
        return 'album';
      case 'game':
      case 'video game':
      case 'playing':
        return 'sports_esports';
      case 'dining':
      case 'food':
        return 'restaurant';
      default:
        return 'perm_media';
    }
  };

  const getStatusBadge = (mediaType?: string, status?: string) => {
    if (status === 'Currently Experiencing') {
      switch (mediaType?.toLowerCase()) {
        case 'book':
          return 'Reading';
        case 'movie':
        case 'tv':
        case 'film':
          return 'Watching';
        case 'music':
        case 'album':
          return 'Listening';
        case 'game':
          return 'Playing';
        default:
          return 'In Progress';
      }
    }
    return status || 'Experiencing';
  };

  const getActionText = (status?: string, mediaType?: string) => {
    if (status === 'Completed') {
      switch (mediaType?.toLowerCase()) {
        case 'book':
          return 'Finished reading';
        case 'movie':
        case 'tv':
        case 'film':
          return 'Watched';
        case 'music':
        case 'album':
          return 'Listened to';
        case 'game':
          return 'Completed';
        case 'dining':
        case 'food':
          return 'Ate at';
        default:
          return 'Completed';
      }
    }
    if (status === 'Currently Experiencing') {
      switch (mediaType?.toLowerCase()) {
        case 'book':
          return 'Reading';
        case 'movie':
        case 'tv':
        case 'film':
          return 'Watching';
        case 'music':
        case 'album':
          return 'Listening to';
        case 'game':
          return 'Playing';
        case 'dining':
        case 'food':
          return 'Dining at';
        default:
          return 'Experiencing';
      }
    }
    if (status === 'Want to Experience') {
      return 'Want to experience';
    }
    if (status === 'Dropped') {
      return 'Dropped';
    }
    return 'Logged';
  };

  const stripHtml = (html?: string) => {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    const normalized = rating > 5 ? rating / 2 : rating;
    const fullStars = Math.floor(normalized);
    const hasHalf = normalized - fullStars >= 0.25 && normalized - fullStars < 0.75;
    const extraFull = normalized - fullStars >= 0.75 ? 1 : 0;
    const totalFull = fullStars + extraFull;

    const stars = [];
    for (let i = 0; i < 5; i++) {
      if (i < totalFull) {
        stars.push(
          <span key={i} className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            star
          </span>
        );
      } else if (i === totalFull && hasHalf) {
        stars.push(
          <span key={i} className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            star_half
          </span>
        );
      } else {
        stars.push(
          <span key={i} className="material-symbols-outlined text-sm text-outline-variant/35" style={{ fontVariationSettings: "'FILL' 0" }}>
            star
          </span>
        );
      }
    }
    return stars;
  };

  const currentlyExperiencing = experiences.filter(e => e.status === 'Currently Experiencing');
  const recentHighlights = [...experiences]
    .sort((a, b) => {
      const da = a.sort_date ? new Date(a.sort_date).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
      const db = b.sort_date ? new Date(b.sort_date).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
      return db - da;
    })
    .slice(0, 5);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const logsThisMonth = experiences.filter(e => {
    const dStr = e.sort_date || e.created_at;
    if (!dStr) return false;
    const d = new Date(dStr);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const logsLastMonth = experiences.filter(e => {
    const dStr = e.sort_date || e.created_at;
    if (!dStr) return false;
    const d = new Date(dStr);
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
  }).length;

  let diffText = '+0% from last month';
  if (logsLastMonth === 0) {
    diffText = logsThisMonth > 0 ? `+${logsThisMonth} from last month` : '0 from last month';
  } else {
    const pct = Math.round(((logsThisMonth - logsLastMonth) / logsLastMonth) * 100);
    diffText = `${pct >= 0 ? '+' : ''}${pct}% from last month`;
  }

  return (
    <div className="max-w-[1100px] mx-auto px-gutter md:px-margin-desktop py-xl lg:py-xxl space-y-xl">
      {/* First-Time Welcome Banner */}
      {!loading && experiences.length === 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-md sm:p-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md">
          <div className="flex items-center gap-md">
            <span className="material-symbols-outlined text-primary text-[28px]">auto_stories</span>
            <div>
              <h3 className="font-headline-md text-[18px] text-primary font-medium">Welcome to your personal archive</h3>
              <p className="font-body-md text-body-md text-secondary mt-0.5">
                New here? Choose your default building blocks or jump straight into recording your thoughts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/onboarding')}
            className="shrink-0 flex items-center gap-xs px-md py-sm bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
          >
            <span>Set up categories</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      )}

      {/* Quick Log Widget */}
      <section className="bg-surface-container-lowest border border-tertiary rounded-xl p-lg md:p-xl transition-all focus-within:ring-1 focus-within:ring-primary">
        <h2 className="font-headline-md text-headline-md text-primary mb-md">Quick Log</h2>
        <div className="flex flex-col md:flex-row gap-md items-start md:items-center">
          <input
            className="flex-1 w-full bg-transparent border-b border-outline-variant focus:border-primary pb-sm text-body-lg font-body-lg text-on-surface placeholder:text-secondary focus:outline-none focus:ring-0 transition-colors"
            placeholder="What are you experiencing right now?"
            type="text"
            value={quickLogText}
            onChange={e => setQuickLogText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleQuickLog();
            }}
          />
          <div className="flex gap-sm w-full md:w-auto">
            <button
              onClick={() => navigate('/log')}
              className="p-sm text-secondary hover:text-primary hover:bg-surface-variant rounded-full transition-colors"
              title="Add Media"
            >
              <span className="material-symbols-outlined">image</span>
            </button>
            <button
              onClick={() => navigate('/log')}
              className="p-sm text-secondary hover:text-primary hover:bg-surface-variant rounded-full transition-colors"
              title="Tag Location"
            >
              <span className="material-symbols-outlined">location_on</span>
            </button>
            <button
              onClick={handleQuickLog}
              className="px-lg py-sm bg-primary text-on-primary font-label-md text-label-md rounded-lg ml-auto md:ml-sm hover:opacity-90 transition-opacity"
            >
              Log
            </button>
          </div>
        </div>
      </section>

      {/* Grid Layout for Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
        {/* Main Column (Left/Center) */}
        <div className="lg:col-span-2 space-y-xl">
          {/* Currently Experiencing (Horizontal Scroll) */}
          <section>
            <div className="flex items-center justify-between mb-lg">
              <h2 className="font-headline-md text-headline-md text-primary">Currently Experiencing</h2>
              <button
                onClick={() => navigate('/library')}
                className="text-secondary hover:text-primary font-label-md text-label-md transition-colors"
              >
                View All
              </button>
            </div>
            {loading ? (
              <div className="flex gap-lg pb-sm overflow-hidden">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="min-w-[160px] md:min-w-[200px]">
                    <SkeletonCard aspectRatio="poster" />
                  </div>
                ))}
              </div>
            ) : currentlyExperiencing.length === 0 ? (
              <EmptyState
                icon="pending_actions"
                title="Nothing in progress"
                description="Keep track of the film you're watching, book you're reading, or game you're playing right now."
                primaryAction={{
                  label: 'Log an experience',
                  onClick: () => navigate('/log'),
                  icon: 'add',
                }}
              />
            ) : (
              <div className="flex overflow-x-auto hide-scrollbar gap-lg pb-sm -mx-gutter px-gutter md:mx-0 md:px-0">
                {currentlyExperiencing.map(exp => {
                  const media = exp.media_id ? mediaMap[exp.media_id] : null;
                  return (
                    <div
                      key={exp.id}
                      onClick={() => navigate(`/experience/${exp.id}`)}
                      className="min-w-[160px] md:min-w-[200px] flex-shrink-0 group cursor-pointer"
                    >
                      <div className="aspect-[2/3] rounded-lg border border-tertiary overflow-hidden mb-sm relative">
                        {media?.cover_image ? (
                          <img
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            src={media.cover_image}
                            alt={exp.media_title}
                          />
                        ) : (
                          <div className="w-full h-full bg-surface-container flex items-center justify-center">
                            <span className="material-symbols-outlined text-display text-secondary/30">
                              {getMediaIcon(exp.media_type)}
                            </span>
                          </div>
                        )}
                      </div>
                      <h3 className="font-label-md text-label-md text-on-surface truncate">{exp.media_title}</h3>
                      <p className="font-caption text-caption text-secondary truncate">
                        {exp.media_type ? exp.media_type.charAt(0).toUpperCase() + exp.media_type.slice(1) : 'Media'}
                      </p>
                      <span className="inline-block mt-xs px-2 py-1 bg-surface-variant text-on-surface-variant font-caption text-[10px] uppercase rounded-full tracking-wide">
                        {getStatusBadge(exp.media_type, exp.status)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Recent Highlights */}
          <section>
            <h2 className="font-headline-md text-headline-md text-primary mb-lg">Recent Highlights</h2>
            {loading ? (
              <div className="space-y-md">
                {[1, 2, 3].map((i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            ) : recentHighlights.length === 0 ? (
              <EmptyState
                icon="history_edu"
                title="No recent highlights"
                description="Completed items, ratings, and thoughts will appear here in your reflection stream."
                primaryAction={{
                  label: 'Add to archive',
                  onClick: () => navigate('/log'),
                  icon: 'edit_note',
                }}
              />
            ) : (
              <div className="space-y-lg relative">
                {/* Timeline line */}
                <div className="absolute left-[11px] top-4 bottom-4 w-px bg-tertiary/30 hidden md:block"></div>

                {recentHighlights.map((exp, idx) => {
                  const cleanedThoughts = stripHtml(exp.thoughts);
                  return (
                    <div key={exp.id} className="pl-0 md:pl-xl relative group">
                      <div
                        className={`absolute left-2 top-4 w-2 h-2 rounded-full ${
                          idx % 2 === 0 ? 'bg-primary' : 'bg-tertiary'
                        } hidden md:block shadow-[0_0_0_4px_theme(colors.background)]`}
                      ></div>
                      <div
                        onClick={() => navigate(`/experience/${exp.id}`)}
                        className="bg-surface-container-lowest border border-tertiary rounded-xl p-md md:p-lg hover:bg-surface-container-low transition-colors cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-md">
                          <div className="flex items-center gap-sm">
                            <span className="material-symbols-outlined text-secondary text-sm">
                              {getMediaIcon(exp.media_type)}
                            </span>
                            <span className="font-label-md text-label-md text-secondary">
                              {getActionText(exp.status, exp.media_type)}
                            </span>
                            <span className="font-label-md text-label-md font-bold text-on-surface truncate max-w-[200px] sm:max-w-[20rem] md:max-w-[28rem]">
                              {exp.media_title}
                            </span>
                          </div>
                          {exp.rating !== undefined && exp.rating !== null && (
                            <div className="flex text-primary">{renderStars(exp.rating)}</div>
                          )}
                        </div>
                        {cleanedThoughts && (
                          <p className="font-body-md text-body-md text-on-surface-variant mb-md leading-relaxed line-clamp-3">
                            {cleanedThoughts}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-caption text-secondary">
                          <span className="font-caption">
                            {formatDisplayDate(exp.sort_date || exp.created_at)}
                          </span>
                          <div className="flex gap-xs">
                            {exp.media_type && (
                              <span className="px-2 py-0.5 bg-surface-variant rounded-full text-[10px] uppercase">
                                {exp.media_type}
                              </span>
                            )}
                            {exp.status && (
                              <span className="px-2 py-0.5 bg-surface-variant rounded-full text-[10px] uppercase">
                                {exp.status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Column (Sidebar Widgets) */}
        <div className="space-y-xl">
          {/* Stat Snack Widget */}
          <div className="bg-surface-container-lowest border border-tertiary rounded-xl p-lg flex flex-col items-center justify-center text-center">
            <h3 className="font-label-md text-label-md text-secondary mb-sm uppercase tracking-widest">
              Logs This Month
            </h3>
            <div className="font-display text-display text-primary mb-md">{logsThisMonth}</div>
            <div className="w-full flex justify-between items-end h-16 border-b border-tertiary/20 pb-sm mb-sm px-md">
              {/* Simple minimal bar chart */}
              <div className="w-2 bg-primary/20 rounded-t h-4"></div>
              <div className="w-2 bg-primary/40 rounded-t h-8"></div>
              <div className="w-2 bg-primary/60 rounded-t h-6"></div>
              <div className="w-2 bg-primary/80 rounded-t h-12"></div>
              <div className="w-2 bg-primary rounded-t h-16"></div>
              <div className="w-2 bg-primary/40 rounded-t h-10"></div>
              <div className="w-2 bg-primary/20 rounded-t h-5"></div>
            </div>
            <p className="font-caption text-caption text-secondary">{diffText}</p>
          </div>

          {/* Ambient Space / Decoration */}
          <div className="hidden lg:block relative h-64 border border-tertiary rounded-xl overflow-hidden bg-surface-variant">
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <span className="material-symbols-outlined text-[120px]">spa</span>
            </div>
            <div className="absolute inset-0 p-lg flex flex-col justify-end bg-gradient-to-t from-surface to-transparent">
              <p className="font-headline-md text-headline-md text-primary font-bold">
                "Introspection through permanence."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
