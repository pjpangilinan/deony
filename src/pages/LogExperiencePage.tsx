import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/ui/useToast';
import { v4 as uuidv4 } from 'uuid';
import { JournalEditor } from '../components/editor/JournalEditor';

interface Category {
  id: string;
  name: string;
  media_type: string;
}

interface MediaSearchResult {
  id?: string;
  external_id?: string;
  providerId?: string;
  provider?: string;
  source?: string;
  title: string;
  type?: string;
  media_type?: string;
  year?: string | number;
  release_date?: string;
  description?: string;
  imageUrl?: string;
  cover_image?: string;
  creator?: string;
}

interface SelectedMediaInfo {
  id: string;
  title: string;
  type?: string;
  media_type?: string;
  year?: string | number;
  release_date?: string;
  imageUrl?: string;
  cover_image?: string;
  description?: string;
  creator?: string;
  provider?: string;
  is_manual?: boolean;
}

export function LogExperiencePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialQuery = (location.state as any)?.initialQuery || '';
  const { showToast } = useToast();

  // Step state
  const [step, setStep] = useState<1 | 2>(1);

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  // Step 1: Search / Select Media state
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<MediaSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<SelectedMediaInfo | null>(null);
  const [selectedMediaId, setSelectedMediaId] = useState('');

  // Step 2: Details & Reflection state
  const today = new Date().toISOString().split('T')[0];
  const [status, setStatus] = useState('Completed');
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [hoverRating, setHoverRating] = useState<number | undefined>(undefined);
  const [endedOn, setEndedOn] = useState(today);
  const [startedOn, setStartedOn] = useState(today);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [thoughts, setThoughts] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch categories on mount
  useEffect(() => {
    api.get<{ items: Category[] }>('/categories')
      .then((res) => {
        const items = res.items || [];
        if (items.length > 0) {
          setCategories(items);
          setSelectedCategory(items[0].id);
        } else {
          // Fallback if empty (user skipped onboarding)
          const fallback = [
            { id: 'cat-film', name: 'Films', media_type: 'movie' },
            { id: 'cat-books', name: 'Books', media_type: 'book' },
            { id: 'cat-games', name: 'Games', media_type: 'game' },
            { id: 'cat-shows', name: 'Shows', media_type: 'tv' },
          ];
          setCategories(fallback);
          setSelectedCategory(fallback[0].id);
          // Optionally, create them in the background
          fallback.forEach(cat => {
            api.post('/categories', { name: cat.name, media_type: cat.media_type }).catch(() => {});
          });
        }
      })
      .catch((err) => {
        console.error('Failed to load categories', err);
        const fallback = [
          { id: 'cat-film', name: 'Film', media_type: 'movie' },
          { id: 'cat-books', name: 'Literature', media_type: 'book' },
          { id: 'cat-games', name: 'Games', media_type: 'game' },
        ];
        setCategories(fallback);
        setSelectedCategory(fallback[0].id);
      });
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setErrorMsg(null);
        return;
      }
      try {
        setIsSearching(true);
        setErrorMsg(null);
        const res = await api.get<MediaSearchResult[]>('/media/search', {
          q: searchQuery.trim(), type: currentCategory?.media_type || 'movie',
        });
        const items = Array.isArray(res) ? res : (res as any).items || [];
        setSearchResults(items);
      } catch (err) {
        setErrorMsg('Search is currently unavailable. Add your media manually.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, categories]);

  const currentCategory = categories.find((c) => c.id === selectedCategory);

  const handleMediaSelect = async (media: MediaSearchResult) => {
    try {
      const source = media.source || media.provider || 'tmdb';
      const external_id = media.external_id || media.providerId || media.id || uuidv4();
      const media_type = media.media_type || media.type || currentCategory?.media_type || 'movie';
      const cover_image = media.cover_image || media.imageUrl;
      const release_date = media.release_date || (media.year ? String(media.year) : undefined);

      const res = await api.post<{ id: string; [key: string]: any }>('/media/resolve', {
        source,
        external_id,
        title: media.title,
        media_type,
        description: media.description,
        cover_image,
        release_date,
      });

      setSelectedMediaId(res.id);
      setSelectedMedia({
        id: res.id,
        title: media.title,
        type: media_type,
        media_type,
        year: release_date ? release_date.slice(0, 4) : media.year,
        release_date,
        imageUrl: cover_image,
        cover_image,
        description: media.description,
        creator: media.creator,
        provider: source,
        is_manual: false,
      });
      setStep(2);
    } catch (e) {
      setErrorMsg('Failed to resolve media. You can add it manually.');
    }
  };

  const handleManualAdd = async () => {
    try {
      const title = searchQuery.trim() || 'Untitled Experience';
      const mediaType = currentCategory?.media_type || 'custom';
      const res = await api.post<{ id: string }>('/media/manual', {
        title,
        media_type: mediaType,
      });

      setSelectedMediaId(res.id);
      setSelectedMedia({
        id: res.id,
        title,
        type: currentCategory?.name || 'Custom',
        media_type: mediaType,
        year: new Date().getFullYear(),
        is_manual: true,
      });
      setStep(2);
    } catch (e) {
      setErrorMsg('Failed to create manual entry');
    }
  };

  const handleTagAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/^,+|,+$/g, '');
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
        setTagInput('');
      }
    }
  };

  const handleTagRemove = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const saveExperience = async (statusOverride?: string) => {
    setErrorMsg(null);
    if (!selectedMediaId || !selectedCategory) {
      setErrorMsg('Please select media and category');
      return;
    }

    const expStatus = statusOverride || status;

    try {
      setIsSubmitting(true);
      const idempotencyKey = uuidv4();

      let finalStartedOn: string | undefined = undefined;
      let finalEndedOn: string | undefined = undefined;

      if (expStatus === 'Currently Experiencing') {
        finalStartedOn = startedOn || today;
      } else if (expStatus === 'Completed') {
        finalEndedOn = endedOn || today;
        finalStartedOn = startedOn || undefined;
      } else if (expStatus === 'Dropped') {
        finalEndedOn = endedOn || today;
      }
      // 'Want to Experience' leaves dates absent

      const res = await api.post<{ id: string }>('/experiences', {
        idempotency_key: idempotencyKey,
        media_id: selectedMediaId,
        category_id: selectedCategory,
        status: expStatus,
        rating: expStatus === 'Want to Experience' ? null : rating !== undefined ? rating : null,
        started_on: finalStartedOn,
        ended_on: finalEndedOn,
        thoughts: thoughts.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });

      showToast('Experience recorded in your archive!', 'success');
      navigate(`/experience/${res.id}`);
    } catch (e) {
      setErrorMsg('Failed to log experience');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveExperience();
  };

  const handleDraft = (e: React.MouseEvent) => {
    e.preventDefault();
    saveExperience('Want to Experience');
  };
  // Effective star rating on a 5-star scale (rating: 1-10 mapped to 0.5-5.0)
  const currentStarCount = hoverRating !== undefined ? hoverRating : rating !== undefined ? rating / 2 : 0;
  const displayRatingText = rating !== undefined ? (rating / 2).toFixed(1) : 'Unrated';

  return (
    <div className="min-h-[calc(100vh-4rem)] md:min-h-screen flex items-center justify-center p-md md:p-gutter">
      {/* Modal Container */}
      <main className="z-10 w-full max-w-[800px] bg-surface rounded-xl border border-tertiary mx-gutter flex flex-col max-h-[90vh] overflow-hidden shadow-sm relative">
        
        {errorMsg && (
          <div className="bg-error text-on-error px-lg py-sm flex justify-between items-center shrink-0">
            <span className="font-body-md text-body-md">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="opacity-80 hover:opacity-100 p-1">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        )}

        {step === 1 && (
          <>
            {/* Header */}
            <header className="flex justify-between items-center px-lg py-md border-b border-tertiary shrink-0 bg-surface">
              <div>
                <h1 className="font-headline-md text-headline-md text-primary tracking-tight">
                  Log an Experience
                </h1>
                <p className="font-caption text-caption text-secondary mt-xs">
                  Step 1: Find &amp; Select Media
                </p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => navigate(-1)}
                className="text-secondary hover:text-primary transition-colors flex items-center justify-center rounded-full p-sm hover:bg-surface-variant focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
                  close
                </span>
              </button>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-lg flex flex-col gap-lg bg-surface-bright">
              {/* Category selector */}
              <div className="flex flex-col gap-sm">
                <label
                  htmlFor="category-select"
                  className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide"
                >
                  Category
                </label>
                <div className="relative">
                  <select
                    id="category-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full appearance-none bg-transparent border-0 border-b border-tertiary rounded-none py-sm px-0 font-body-md text-body-md text-on-surface focus:ring-0 focus:border-primary cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-surface text-on-surface">
                        {c.name} ({c.media_type})
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-secondary">
                    expand_more
                  </span>
                </div>
              </div>

              {/* Search media input */}
              <div className="flex flex-col gap-sm">
                <label
                  htmlFor="search-input"
                  className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide"
                >
                  Search Media Archive
                </label>
                <div className="relative flex items-center">
                  <input
                    id="search-input"
                    type="text"
                    placeholder="Search for a film, book, game, or album..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full bg-transparent border-0 border-b border-tertiary rounded-none py-sm pl-0 pr-8 font-body-md text-body-md text-on-surface focus:ring-0 focus:border-primary placeholder:text-outline-variant transition-colors"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-0 text-secondary hover:text-primary transition-colors p-1"
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  ) : (
                    <span className="material-symbols-outlined absolute right-0 text-secondary pointer-events-none text-[20px]">
                      search
                    </span>
                  )}
                </div>
              </div>

              {/* Provider Fallback & Resilience Banner */}
              {!isSearching && errorMsg && (
                <div className="p-md rounded-lg bg-surface-variant/70 border border-tertiary/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md animate-fade-in">
                  <div className="flex items-center gap-sm text-on-surface">
                    <span className="material-symbols-outlined text-secondary text-[20px]">
                      cloud_off
                    </span>
                    <span className="font-body-sm text-body-sm text-secondary">
                      {errorMsg}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleManualAdd}
                    className="shrink-0 inline-flex items-center gap-xs font-label-md text-label-md bg-primary text-white hover:bg-primary/90 px-md py-xs rounded-md transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Add Manually
                  </button>
                </div>
              )}

              {/* Searching indicator & Skeletons */}
              {isSearching && (
                <div className="flex flex-col gap-sm">
                  <div className="flex items-center gap-xs text-secondary font-caption py-xs">
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    <span>Searching provider archive...</span>
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-md p-md rounded-lg border border-tertiary/20 bg-surface-variant/30 animate-pulse">
                      <div className="w-12 h-16 rounded bg-surface-variant shrink-0" />
                      <div className="flex-1 space-y-xs">
                        <div className="h-3 bg-surface-variant rounded w-1/4" />
                        <div className="h-4 bg-surface-variant rounded w-3/4" />
                        <div className="h-3 bg-surface-variant rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Search results list */}
              {!isSearching && searchResults.length > 0 && (
                <div className="flex flex-col gap-sm">
                  <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">
                    Results ({searchResults.length})
                  </label>
                  <div className="flex flex-col gap-sm max-h-[340px] overflow-y-auto pr-xs">
                    {searchResults.map((item) => (
                      <div
                        key={item.id || item.providerId || `${item.provider}-${item.title}`}
                        onClick={() => handleMediaSelect(item)}
                        className="flex items-center gap-md p-md rounded-lg border border-tertiary bg-white hover:bg-surface-variant transition-colors cursor-pointer group"
                      >
                        {item.imageUrl || item.cover_image ? (
                          <img
                            src={item.imageUrl || item.cover_image}
                            alt={item.title}
                            className="w-12 h-16 object-cover rounded border border-tertiary shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-16 rounded border border-tertiary bg-surface-variant flex items-center justify-center shrink-0 text-secondary">
                            <span className="material-symbols-outlined text-[24px]">perm_media</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-sm">
                            <span className="px-sm py-xs bg-surface-variant text-on-surface-variant font-label-md text-label-md uppercase rounded-full tracking-widest text-[10px]">
                              {item.type || item.media_type || currentCategory?.media_type || 'Media'}
                            </span>
                            {(item.year || item.release_date) && (
                              <span className="font-caption text-caption text-secondary">
                                {item.year || (item.release_date ? item.release_date.slice(0, 4) : '')}
                              </span>
                            )}
                            {(item.provider || item.source) && (
                              <span className="font-caption text-caption text-outline">
                                ({item.provider || item.source})
                              </span>
                            )}
                          </div>
                          <h4 className="font-headline-md text-[18px] text-on-surface leading-snug truncate mt-xs">
                            {item.title}
                          </h4>
                          {item.description && (
                            <p className="font-caption text-caption text-secondary line-clamp-1 mt-xs">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <span className="material-symbols-outlined text-secondary group-hover:text-primary group-hover:translate-x-1 transition-all">
                          chevron_right
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No results fallback */}
              {!isSearching && searchQuery && searchResults.length === 0 && (
                <div className="p-xl text-center flex flex-col items-center gap-md rounded-lg border border-dashed border-tertiary bg-surface-container-low">
                  <span className="material-symbols-outlined text-[36px] text-secondary">search_off</span>
                  <div>
                    <p className="font-headline-md text-headline-md text-on-surface">No media found</p>
                    <p className="font-caption text-caption text-secondary mt-xs">
                      Couldn't find "{searchQuery}". You can log it manually into your archive.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleManualAdd}
                    className="font-label-md text-label-md bg-primary text-white px-lg py-sm rounded-md border border-primary hover:bg-primary-container hover:text-on-primary-container transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    Add "{searchQuery}" Manually
                  </button>
                </div>
              )}

              {/* Default prompt when empty */}
              {!isSearching && !searchQuery && searchResults.length === 0 && (
                <div className="p-xl text-center flex flex-col items-center gap-md rounded-lg border border-dashed border-tertiary bg-surface-container-low">
                  <span className="material-symbols-outlined text-[36px] text-secondary">manage_search</span>
                  <div>
                    <p className="font-headline-md text-headline-md text-on-surface">Search for Media</p>
                    <p className="font-caption text-caption text-secondary mt-xs">
                      Type a title to search TMDB, Open Library, or RAWG. Or enter details manually.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleManualAdd}
                    className="font-label-md text-label-md text-on-surface-variant px-lg py-sm rounded-md border border-tertiary hover:bg-surface-variant transition-colors"
                  >
                    Add Manually
                  </button>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <footer className="flex justify-between items-center px-lg py-md border-t border-tertiary shrink-0 bg-surface">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="font-label-md text-label-md text-secondary hover:text-primary transition-colors px-md py-sm rounded-md hover:bg-surface-variant focus:outline-none focus:ring-1 focus:ring-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualAdd}
                className="font-label-md text-label-md text-on-surface-variant px-lg py-sm rounded-md border border-tertiary hover:bg-surface-variant transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
              >
                Add Manually
              </button>
            </footer>
          </>
        )}

        {step === 2 && (
          <>
            {/* Header */}
            <header className="flex justify-between items-center px-lg py-md border-b border-tertiary shrink-0 bg-surface">
              <div>
                <h1 className="font-headline-md text-headline-md text-primary tracking-tight">
                  Log an Experience
                </h1>
                <p className="font-caption text-caption text-secondary mt-xs">
                  Step 2: Reflect &amp; Record
                </p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => navigate(-1)}
                className="text-secondary hover:text-primary transition-colors flex items-center justify-center rounded-full p-sm hover:bg-surface-variant focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
                  close
                </span>
              </button>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-lg flex flex-col md:flex-row gap-xl bg-surface-bright">
              {/* Left Column: Item Preview */}
              <div className="md:w-1/3 flex flex-col shrink-0">
                <div className="rounded-lg border border-tertiary overflow-hidden bg-white mb-md aspect-[2/3] relative group">
                  {selectedMedia?.imageUrl || selectedMedia?.cover_image ? (
                    <img
                      className="w-full h-full object-cover"
                      src={selectedMedia.imageUrl || selectedMedia.cover_image}
                      alt={selectedMedia.title}
                    />
                  ) : (
                    <div className="w-full h-full bg-surface-variant flex flex-col items-center justify-center text-secondary p-md text-center">
                      <span className="material-symbols-outlined text-[48px] mb-sm">perm_media</span>
                      <span className="font-label-md text-label-md uppercase tracking-wider">
                        {selectedMedia?.type || currentCategory?.name || 'Media'}
                      </span>
                    </div>
                  )}
                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-md">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-white text-caption font-caption hover:underline cursor-pointer"
                    >
                      Change Media
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-sm">
                  <span className="inline-block px-sm py-xs bg-surface-variant text-on-surface-variant font-label-md text-label-md uppercase rounded-full self-start tracking-widest text-[10px]">
                    {selectedMedia?.type || currentCategory?.name || 'Media'}
                  </span>
                  <h2 className="font-headline-md text-headline-md text-on-surface leading-tight">
                    {selectedMedia?.title || 'Solaris'}
                  </h2>
                  <p className="font-body-md text-body-md text-secondary">
                    {[
                      selectedMedia?.creator,
                      selectedMedia?.year || selectedMedia?.release_date,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'Recorded Entry'}
                  </p>
                </div>
              </div>

              {/* Right Column: Form */}
              <form className="md:w-2/3 flex flex-col gap-lg pb-xl" onSubmit={handleSubmit}>
                {/* Rating */}
                <div className="flex flex-col gap-sm">
                  <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">
                    Rating
                  </label>
                  <div className="flex gap-sm items-center">
                    {/* Simulated Star Rating */}
                    <div
                      className="flex gap-xs text-primary cursor-pointer"
                      onMouseLeave={() => setHoverRating(undefined)}
                    >
                      {[1, 2, 3, 4, 5].map((starIndex) => {
                        const isFilled = currentStarCount >= starIndex;
                        return (
                          <button
                            key={starIndex}
                            type="button"
                            onClick={() => {
                              const newScore = starIndex * 2;
                              setRating(rating === newScore ? undefined : newScore);
                            }}
                            onMouseEnter={() => setHoverRating(starIndex)}
                            className="p-0 border-0 bg-transparent focus:outline-none transition-transform hover:scale-110 flex items-center"
                          >
                            <span
                              className={`material-symbols-outlined text-[28px] ${
                                isFilled ? 'text-primary' : 'text-tertiary-fixed-dim'
                              }`}
                              style={{ fontVariationSettings: isFilled ? "'FILL' 1" : "'FILL' 0" }}
                            >
                              star
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <span className="font-body-md text-body-md text-secondary ml-sm">
                      {displayRatingText}
                    </span>
                    {rating !== undefined && (
                      <button
                        type="button"
                        onClick={() => setRating(undefined)}
                        className="font-caption text-caption text-secondary hover:text-error ml-xs transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Status & Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  <div className="flex flex-col gap-sm">
                    <label
                      className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide"
                      htmlFor="status"
                    >
                      Status
                    </label>
                    <div className="relative">
                      <select
                        className="w-full appearance-none bg-transparent border-0 border-b border-tertiary rounded-none py-sm px-0 font-body-md text-body-md text-on-surface focus:ring-0 focus:border-primary cursor-pointer"
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="Completed">Completed</option>
                        <option value="Currently Experiencing">In Progress</option>
                        <option value="Want to Experience">Want to Experience</option>
                        <option value="Dropped">Abandoned</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-secondary">
                        expand_more
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-sm">
                    <label
                      className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide"
                      htmlFor="date-field"
                    >
                      {status === 'Currently Experiencing' ? 'Date Started' : 'Date Completed'}
                    </label>
                    <div className="relative">
                      <input
                        id="date-field"
                        className="w-full bg-transparent border-0 border-b border-tertiary rounded-none py-sm px-0 font-body-md text-body-md text-on-surface focus:ring-0 focus:border-primary cursor-text"
                        type="date"
                        value={status === 'Currently Experiencing' ? startedOn : endedOn}
                        onChange={(e) => {
                          if (status === 'Currently Experiencing') {
                            setStartedOn(e.target.value);
                          } else {
                            setEndedOn(e.target.value);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-col gap-sm">
                  <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">
                    Themes / Tags
                  </label>
                  <div className="flex flex-wrap gap-sm items-center">
                    {tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-md py-sm bg-surface-variant text-on-surface-variant font-label-md text-label-md rounded-full flex items-center gap-xs cursor-pointer hover:bg-surface-dim transition-colors"
                      >
                        {tag}{' '}
                        <button
                          type="button"
                          onClick={() => handleTagRemove(idx)}
                          className="hover:text-primary transition-colors flex items-center focus:outline-none"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </span>
                    ))}
                    <input
                      className="bg-transparent border-0 border-b border-transparent hover:border-tertiary focus:border-primary focus:ring-0 py-sm px-sm font-body-md text-body-md text-on-surface w-32 placeholder:text-outline-variant transition-colors outline-none"
                      placeholder="Add tag..."
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagAdd}
                    />
                  </div>
                </div>

                {/* Thoughts */}
                <div className="flex flex-col gap-sm">
                  <label
                    className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide flex items-center gap-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">menu_book</span>
                    Personal Thoughts
                  </label>
                  <div className="border border-tertiary rounded-lg overflow-hidden focus-within:border-primary transition-colors bg-white">
                    <JournalEditor
                      initialContent={thoughts}
                      onChange={setThoughts}
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Footer Actions */}
            <footer className="flex justify-between items-center px-lg py-md border-t border-tertiary shrink-0 bg-surface">
              <button
                className="font-label-md text-label-md text-secondary hover:text-primary transition-colors px-md py-sm rounded-md hover:bg-surface-variant focus:outline-none focus:ring-1 focus:ring-primary"
                type="button"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <div className="flex gap-md">
                <button
                  className="font-label-md text-label-md text-on-surface-variant px-lg py-sm rounded-md border border-tertiary hover:bg-surface-variant transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
                  type="button"
                  onClick={handleDraft}
                  disabled={isSubmitting}
                >
                  Draft
                </button>
                <button
                  className="font-label-md text-label-md bg-primary text-white px-xl py-sm rounded-md border border-primary hover:bg-primary-container hover:text-on-primary-container transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-surface disabled:opacity-50"
                  type="button"
                  onClick={() => saveExperience()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Experience'}
                </button>
              </div>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
