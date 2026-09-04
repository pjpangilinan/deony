import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { SkeletonCard, EmptyState } from '../components/ui';
import { normalizeRatingTo5, formatRating5 } from '../utils/rating';

interface Experience {
  id: string;
  media_id: string;
  category_id: string;
  status: string;
  rating?: number | null;
  started_on?: string;
  ended_on?: string;
  sort_date?: string;
  thoughts?: string;
  media_title: string;
  media_type: string;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  media_type: string;
}

interface MediaItem {
  id: string;
  cover_image?: string;
  title?: string;
  media_type?: string;
  description?: string;
}

type SortOption = 'date_desc' | 'date_asc' | 'rating_desc' | 'rating_asc' | 'title_asc' | 'title_desc';

const SORT_LABELS: Record<SortOption, string> = {
  date_desc: 'Sort by Date Logged',
  date_asc: 'Sort by Oldest',
  rating_desc: 'Sort by Highest Rating',
  rating_asc: 'Sort by Lowest Rating',
  title_asc: 'Sort by Title (A-Z)',
  title_desc: 'Sort by Title (Z-A)'
};

export function LibraryPage() {
  const navigate = useNavigate();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mediaMap, setMediaMap] = useState<Record<string, MediaItem>>({});
  const [loading, setLoading] = useState(true);

  // View state: Grid vs List view
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');

  // Dropdown open states
  const [openDropdown, setOpenDropdown] = useState<'category' | 'status' | 'rating' | 'sort' | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLibraryData();
  }, []);

  // Keyboard shortcut: Pressing '/' focuses search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchLibraryData = async () => {
    try {
      setLoading(true);
      const [expRes, catRes] = await Promise.allSettled([
        api.get<{ items: Experience[] }>('/experiences'),
        api.get<{ items: Category[] }>('/categories')
      ]);

      let exps: Experience[] = [];
      if (expRes.status === 'fulfilled' && expRes.value?.items) {
        exps = expRes.value.items;
        setExperiences(exps);
      }

      if (catRes.status === 'fulfilled' && catRes.value?.items) {
        setCategories(catRes.value.items);
      }

      // Fetch batch media for cover images
      const mediaIds = Array.from(new Set(exps.map((e) => e.media_id).filter(Boolean)));
      if (mediaIds.length > 0) {
        try {
          const mediaRes = await api.post<{ items: MediaItem[] }>('/media/batch-get', { ids: mediaIds });
          const map: Record<string, MediaItem> = {};
          (mediaRes.items || []).forEach((m) => {
            map[m.id] = m;
          });
          setMediaMap(map);
        } catch (mediaErr) {
          console.error('Failed to load media covers:', mediaErr);
        }
      }
    } catch (e) {
      console.error('Failed to load library:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedRating('all');
    setSortBy('date_desc');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'all' ||
    selectedStatus !== 'all' ||
    selectedRating !== 'all';

  // Helper for Status Badge styling
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Completed':
        return {
          label: 'Completed',
          bg: 'bg-emerald-800/90 text-emerald-100 border border-emerald-600/40',
          dot: 'bg-emerald-400',
          icon: 'check_circle'
        };
      case 'Currently Experiencing':
        return {
          label: 'In Progress',
          bg: 'bg-amber-800/90 text-amber-100 border border-amber-600/40',
          dot: 'bg-amber-400',
          icon: 'motion_photos_on'
        };
      case 'Want to Experience':
        return {
          label: 'Wishlist',
          bg: 'bg-primary/90 text-on-primary border border-primary-fixed-dim/40',
          dot: 'bg-primary-fixed',
          icon: 'bookmark'
        };
      case 'Dropped':
        return {
          label: 'Dropped',
          bg: 'bg-rose-900/90 text-rose-100 border border-rose-700/40',
          dot: 'bg-rose-400',
          icon: 'cancel'
        };
      default:
        return {
          label: status || 'Logged',
          bg: 'bg-surface-variant/90 text-on-surface border border-tertiary/40',
          dot: 'bg-secondary',
          icon: 'circle'
        };
    }
  };

  // Filter and sort experiences with tokenized multi-field search
  const filtered = experiences
    .filter((exp) => {
      // Robust tokenized multi-field search
      if (searchQuery.trim()) {
        const queryTokens = searchQuery.toLowerCase().trim().split(/\s+/);
        const media = mediaMap[exp.media_id];
        const cat = categories.find((c) => c.id === exp.category_id);
        const ratingStr = exp.rating !== undefined && exp.rating !== null ? formatRating5(exp.rating) : '';
        const badge = getStatusBadge(exp.status);
        const corpus = [
          exp.media_title || '',
          media?.title || '',
          exp.media_type || '',
          media?.media_type || '',
          cat?.name || '',
          exp.status || '',
          badge.label,
          exp.thoughts || '',
          media?.description || '',
          ratingStr ? `${ratingStr} star` : '',
          ratingStr ? `${ratingStr} stars` : '',
        ]
          .join(' ')
          .toLowerCase();

        const matchesAll = queryTokens.every((token) => corpus.includes(token));
        if (!matchesAll) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && exp.category_id !== selectedCategory) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && exp.status !== selectedStatus) {
        return false;
      }

      // Rating filter
      if (selectedRating === 'rated') {
        if (exp.rating === null || exp.rating === undefined) return false;
      } else if (selectedRating === 'unrated') {
        if (exp.rating !== null && exp.rating !== undefined) return false;
      } else if (selectedRating !== 'all') {
        const norm = normalizeRatingTo5(exp.rating);
        if (norm === null) return false;
        const targetStars = Number(selectedRating);
        if (Math.round(norm) !== targetStars) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date_desc') {
        const da = a.sort_date ? new Date(a.sort_date).getTime() : new Date(a.created_at || 0).getTime();
        const db = b.sort_date ? new Date(b.sort_date).getTime() : new Date(b.created_at || 0).getTime();
        return db - da;
      }
      if (sortBy === 'date_asc') {
        const da = a.sort_date ? new Date(a.sort_date).getTime() : new Date(a.created_at || 0).getTime();
        const db = b.sort_date ? new Date(b.sort_date).getTime() : new Date(b.created_at || 0).getTime();
        return da - db;
      }
      if (sortBy === 'rating_desc') {
        const ra = normalizeRatingTo5(a.rating) ?? -1;
        const rb = normalizeRatingTo5(b.rating) ?? -1;
        return rb - ra;
      }
      if (sortBy === 'rating_asc') {
        const ra = normalizeRatingTo5(a.rating) ?? 999;
        const rb = normalizeRatingTo5(b.rating) ?? 999;
        return ra - rb;
      }
      if (sortBy === 'title_asc') {
        return (a.media_title || '').localeCompare(b.media_title || '');
      }
      if (sortBy === 'title_desc') {
        return (b.media_title || '').localeCompare(a.media_title || '');
      }
      return 0;
    });

  return (
    <div className="flex-1 w-full pt-16 md:pt-0 pb-xxl px-gutter md:px-margin-desktop max-w-[1400px] mx-auto min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary-container">
      {/* Header & Filters Section matching code.html design */}
      <header
        className="py-lg flex flex-col md:flex-row justify-between items-start md:items-end gap-md md:gap-lg border-b border-tertiary/20 mb-lg"
        ref={filterRef}
      >
        {/* Left Column: Title & Dynamic Search Bar */}
        <div className="w-full md:w-auto md:min-w-[360px] flex-1 max-w-lg">
          <div className="flex items-center gap-sm mb-xs">
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
              Library
            </h2>
            <span className="font-caption text-caption text-secondary px-sm py-0.5 rounded-full bg-surface-variant/70 border border-tertiary/20">
              {experiences.length} logged
            </span>
          </div>

          <form
            onSubmit={(e) => e.preventDefault()}
            className="relative w-full max-w-md min-w-[260px] sm:min-w-[340px] mt-sm group"
          >
            <span className="material-symbols-outlined absolute left-0 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-primary transition-colors text-[20px] pointer-events-none">
              search
            </span>
            <input
              ref={searchInputRef}
              id="library-search-input"
              type="text"
              name="search"
              autoComplete="off"
              placeholder="Search media, thoughts, categories... (Press '/' to focus)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-b border-tertiary focus:border-primary pl-8 pr-12 py-xs outline-none font-body-md text-body-md transition-colors placeholder:text-secondary-fixed-dim"
            />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-secondary hover:text-primary transition-colors p-xs flex items-center justify-center cursor-pointer"
                  aria-label="Clear search"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              ) : (
                <kbd className="hidden sm:inline-block font-caption text-[11px] text-secondary/60 bg-surface-variant px-1.5 py-0.5 rounded border border-tertiary/30 select-none">
                  /
                </kbd>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Filter Pills, View Toggle, & Sort */}
        <div className="flex flex-col items-start md:items-end w-full md:w-auto shrink-0 gap-sm mt-md md:mt-0">
          {/* Top Row: Filter Pills */}
          <div className="flex flex-wrap items-center gap-sm">
            {/* Category Filter Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
                className={`font-label-md text-label-md px-md py-xs rounded-full border transition-all flex items-center gap-xs cursor-pointer ${
                  selectedCategory !== 'all'
                    ? 'bg-primary/10 text-primary border-primary font-medium shadow-xs'
                    : 'bg-surface-variant text-on-surface-variant border-transparent hover:border-outline'
                }`}
              >
                <span>
                  {selectedCategory === 'all'
                    ? 'Category'
                    : categories.find((c) => c.id === selectedCategory)?.name || 'Category'}
                </span>
                <span className="material-symbols-outlined text-[14px]">
                  {openDropdown === 'category' ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {openDropdown === 'category' && (
                <div className="absolute right-0 md:left-auto mt-xs w-48 bg-surface rounded-md shadow-lg border border-tertiary py-xs z-30 animate-fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('all');
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-md py-xs font-body-sm transition-colors cursor-pointer ${
                      selectedCategory === 'all'
                        ? 'text-primary font-medium bg-surface-variant'
                        : 'text-on-surface hover:bg-surface-variant'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-md py-xs font-body-sm transition-colors cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'text-primary font-medium bg-surface-variant'
                          : 'text-on-surface hover:bg-surface-variant'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Filter Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                className={`font-label-md text-label-md px-md py-xs rounded-full border transition-all flex items-center gap-xs cursor-pointer ${
                  selectedStatus !== 'all'
                    ? 'bg-primary/10 text-primary border-primary font-medium shadow-xs'
                    : 'bg-surface-variant text-on-surface-variant border-transparent hover:border-outline'
                }`}
              >
                <span>{selectedStatus === 'all' ? 'Status' : selectedStatus}</span>
                <span className="material-symbols-outlined text-[14px]">
                  {openDropdown === 'status' ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {openDropdown === 'status' && (
                <div className="absolute right-0 md:left-auto mt-xs w-52 bg-surface rounded-md shadow-lg border border-tertiary py-xs z-30 animate-fade-in">
                  {['all', 'Currently Experiencing', 'Completed', 'Want to Experience', 'Dropped'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setSelectedStatus(st);
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-md py-xs font-body-sm transition-colors cursor-pointer ${
                        selectedStatus === st
                          ? 'text-primary font-medium bg-surface-variant'
                          : 'text-on-surface hover:bg-surface-variant'
                      }`}
                    >
                      {st === 'all' ? 'All Statuses' : st}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Rating Filter Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'rating' ? null : 'rating')}
                className={`font-label-md text-label-md px-md py-xs rounded-full border transition-all flex items-center gap-xs cursor-pointer ${
                  selectedRating !== 'all'
                    ? 'bg-primary/10 text-primary border-primary font-medium shadow-xs'
                    : 'bg-surface-variant text-on-surface-variant border-transparent hover:border-outline'
                }`}
              >
                <span>
                  {selectedRating === 'all'
                    ? 'Rating'
                    : selectedRating === 'rated'
                    ? 'Rated'
                    : selectedRating === 'unrated'
                    ? 'Unrated'
                    : `${selectedRating} ★`}
                </span>
                <span className="material-symbols-outlined text-[14px]">
                  {openDropdown === 'rating' ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {openDropdown === 'rating' && (
                <div className="absolute right-0 mt-xs w-44 bg-surface rounded-md shadow-lg border border-tertiary py-xs z-30 animate-fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRating('all');
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-md py-xs font-body-sm transition-colors cursor-pointer ${
                      selectedRating === 'all'
                        ? 'text-primary font-medium bg-surface-variant'
                        : 'text-on-surface hover:bg-surface-variant'
                    }`}
                  >
                    All Ratings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRating('rated');
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-md py-xs font-body-sm transition-colors cursor-pointer ${
                      selectedRating === 'rated'
                        ? 'text-primary font-medium bg-surface-variant'
                        : 'text-on-surface hover:bg-surface-variant'
                    }`}
                  >
                    Rated Only
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRating('unrated');
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-md py-xs font-body-sm transition-colors cursor-pointer ${
                      selectedRating === 'unrated'
                        ? 'text-primary font-medium bg-surface-variant'
                        : 'text-on-surface hover:bg-surface-variant'
                    }`}
                  >
                    Unrated Only
                  </button>
                  <div className="my-xs border-t border-tertiary/20" />
                  {['5', '4', '3', '2', '1'].map((stars) => (
                    <button
                      key={stars}
                      type="button"
                      onClick={() => {
                        setSelectedRating(stars);
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-md py-xs font-body-sm transition-colors cursor-pointer ${
                        selectedRating === stars
                          ? 'text-primary font-medium bg-surface-variant'
                          : 'text-on-surface hover:bg-surface-variant'
                      }`}
                    >
                      {stars} Stars
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clear Filters CTA if any active */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="font-label-md text-label-md text-secondary hover:text-primary transition-colors underline underline-offset-2 px-xs cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* Bottom Row: View Mode Toggle & Sort Dropdown */}
          <div className="flex items-center gap-md">
            {/* Grid / List View Toggle */}
            <div className="flex items-center bg-surface-variant/60 rounded-lg p-0.5 border border-tertiary/20">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-secondary hover:text-on-surface'
                }`}
                title="Grid view"
                aria-label="Grid view"
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1 rounded flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-secondary hover:text-on-surface'
                }`}
                title="List view"
                aria-label="List view"
              >
                <span className="material-symbols-outlined text-[18px]">view_list</span>
              </button>
            </div>

            {/* Sort Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
                className="flex items-center gap-xs text-secondary hover:text-primary transition-colors group cursor-pointer font-label-md text-label-md"
              >
                <span className="material-symbols-outlined text-[16px] text-secondary group-hover:text-primary">
                  sort
                </span>
                <span>{SORT_LABELS[sortBy]}</span>
                <span className="material-symbols-outlined text-[16px] group-hover:text-primary transition-colors">
                  {openDropdown === 'sort' ? 'expand_less' : 'keyboard_arrow_down'}
                </span>
              </button>
              {openDropdown === 'sort' && (
                <div className="absolute right-0 mt-xs w-52 bg-surface rounded-md shadow-lg border border-tertiary py-xs z-30 animate-fade-in">
                  {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setSortBy(opt);
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-md py-xs font-body-sm transition-colors cursor-pointer ${
                        sortBy === opt
                          ? 'text-primary font-medium bg-surface-variant'
                          : 'text-on-surface hover:bg-surface-variant'
                      }`}
                    >
                      {SORT_LABELS[opt]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Active Filter Indicators Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-xs mb-md text-caption text-secondary animate-fade-in">
          <span>Filtering:</span>
          {searchQuery && (
            <span className="inline-flex items-center gap-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 font-medium">
              "{searchQuery}"
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="hover:text-error"
                aria-label="Remove search filter"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </span>
          )}
          {selectedCategory !== 'all' && (
            <span className="inline-flex items-center gap-xs px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant border border-tertiary/40">
              {categories.find((c) => c.id === selectedCategory)?.name}
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="hover:text-error"
                aria-label="Remove category filter"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </span>
          )}
          {selectedStatus !== 'all' && (
            <span className="inline-flex items-center gap-xs px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant border border-tertiary/40">
              {selectedStatus}
              <button
                type="button"
                onClick={() => setSelectedStatus('all')}
                className="hover:text-error"
                aria-label="Remove status filter"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </span>
          )}
          {selectedRating !== 'all' && (
            <span className="inline-flex items-center gap-xs px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant border border-tertiary/40">
              {selectedRating === 'rated'
                ? 'Rated'
                : selectedRating === 'unrated'
                ? 'Unrated'
                : `${selectedRating} Stars`}
              <button
                type="button"
                onClick={() => setSelectedRating('all')}
                className="hover:text-error"
                aria-label="Remove rating filter"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </span>
          )}
          <span className="text-secondary/70 ml-xs">
            ({filtered.length} {filtered.length === 1 ? 'item' : 'items'} found)
          </span>
        </div>
      )}

      {/* Loading Skeleton State */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-md gap-y-xl flex-1">
          {[...Array(10)].map((_, i) => (
            <SkeletonCard key={i} aspectRatio="poster" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* Empty State */
        experiences.length === 0 ? (
          <EmptyState
            icon="shelves"
            title="Your shelves are waiting"
            description="Your personal media archive is empty. Begin logging films, books, games, or albums to build your private collection."
            primaryAction={{
              label: 'Log your first experience',
              onClick: () => navigate('/log'),
              icon: 'add',
            }}
          />
        ) : (
          <EmptyState
            icon="search_off"
            title="No matching media"
            description={`No items match your query "${searchQuery || 'active filters'}". Try resetting your filters to explore your archive.`}
            primaryAction={{
              label: 'Clear Filters',
              onClick: handleClearFilters,
              icon: 'restart_alt',
            }}
          />
        )
      ) : viewMode === 'grid' ? (
        /* Gratifying Poster Grid View with Status Badges and Elevation */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-md gap-y-xl flex-1">
          {filtered.map((exp) => {
            const media = mediaMap[exp.media_id];
            const coverImage = media?.cover_image;
            const category = categories.find((c) => c.id === exp.category_id);
            const displayType =
              category?.name ||
              (exp.media_type ? exp.media_type.charAt(0).toUpperCase() + exp.media_type.slice(1) : '');
            const badge = getStatusBadge(exp.status);

            return (
              <article
                key={exp.id}
                className="group flex flex-col cursor-pointer transition-transform duration-200 active:scale-[0.98]"
                onClick={() => navigate(`/experience/${exp.id}`)}
              >
                {/* Poster Cover Container with Hover Lift & Subtle Zoom */}
                <div className="aspect-[2/3] w-full overflow-hidden rounded-lg border border-tertiary/15 bg-surface-variant relative mb-sm transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-xl shadow-tertiary/5">
                  {coverImage ? (
                    <img
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 ease-out"
                      src={coverImage}
                      alt={exp.media_title || 'Media cover'}
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-tertiary group-hover:bg-primary-container/5 transition-colors">
                      <span className="material-symbols-outlined text-[48px] opacity-25 group-hover:opacity-40 transition-opacity">
                        photo
                      </span>
                    </div>
                  )}

                  {/* Status Chip Overlay on Poster */}
                  {exp.status && (
                    <div className="absolute top-2 left-2 z-10">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide shadow-sm backdrop-blur-md ${badge.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                        {badge.label}
                      </span>
                    </div>
                  )}

                  {/* Hover Quick Cue */}
                  <div className="absolute inset-0 bg-primary/15 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none flex items-center justify-center">
                    <span className="px-3 py-1 rounded-full bg-surface/90 text-primary text-[12px] font-medium shadow-md backdrop-blur-sm">
                      View Entry
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3
                  className={`font-body-md text-body-md font-medium text-on-surface truncate group-hover:text-primary transition-colors ${
                    exp.rating === null || exp.rating === undefined ? 'text-secondary/80' : ''
                  }`}
                  title={exp.media_title}
                >
                  {exp.media_title || 'Untitled Draft'}
                </h3>

                {/* Metadata Row: Rating & Category */}
                <div className="flex items-center gap-xs mt-xs text-secondary">
                  {exp.rating !== undefined && exp.rating !== null ? (
                    <>
                      <span
                        className="material-symbols-outlined text-[16px] text-primary"
                        style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
                      >
                        star
                      </span>
                      <span className="font-caption text-caption font-medium text-on-surface">
                        {formatRating5(exp.rating)}
                      </span>
                      {displayType && <span className="font-caption text-caption mx-xs">•</span>}
                    </>
                  ) : (
                    <>
                      <span className="font-caption text-caption italic text-secondary/70">Unrated</span>
                      {displayType && <span className="font-caption text-caption mx-xs">•</span>}
                    </>
                  )}
                  {displayType && (
                    <span className="font-caption text-caption truncate">{displayType}</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* Gratifying Archival List / Table View */
        <div className="flex flex-col gap-xs flex-1">
          <div className="hidden sm:grid grid-cols-12 gap-md px-md py-xs font-label-md text-[11px] text-secondary uppercase tracking-wider border-b border-tertiary/20 mb-xs">
            <span className="col-span-6">Title & Category</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-2">Rating</span>
            <span className="col-span-2 text-right">Date Logged</span>
          </div>

          {filtered.map((exp) => {
            const media = mediaMap[exp.media_id];
            const coverImage = media?.cover_image;
            const category = categories.find((c) => c.id === exp.category_id);
            const displayType =
              category?.name ||
              (exp.media_type ? exp.media_type.charAt(0).toUpperCase() + exp.media_type.slice(1) : '');
            const badge = getStatusBadge(exp.status);
            const loggedDate = exp.sort_date || exp.created_at;

            return (
              <article
                key={exp.id}
                onClick={() => navigate(`/experience/${exp.id}`)}
                className="group flex flex-col sm:grid sm:grid-cols-12 gap-sm sm:gap-md items-start sm:items-center px-md py-sm rounded-lg border border-transparent hover:border-tertiary/30 hover:bg-surface-container-high transition-all cursor-pointer"
              >
                {/* Title & Thumbnail */}
                <div className="col-span-6 flex items-center gap-md w-full">
                  <div className="w-10 h-14 shrink-0 rounded overflow-hidden bg-surface-variant border border-tertiary/20">
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt={exp.media_title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-tertiary">
                        <span className="material-symbols-outlined text-[16px] opacity-30">photo</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-body-md text-body-md font-medium text-on-surface truncate group-hover:text-primary transition-colors">
                      {exp.media_title || 'Untitled Draft'}
                    </h3>
                    <span className="font-caption text-caption text-secondary">
                      {displayType || 'Media'}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.bg}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                    {badge.label}
                  </span>
                </div>

                {/* Rating */}
                <div className="col-span-2 flex items-center gap-xs">
                  {exp.rating !== undefined && exp.rating !== null ? (
                    <>
                      <span
                        className="material-symbols-outlined text-[16px] text-primary"
                        style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
                      >
                        star
                      </span>
                      <span className="font-caption text-caption font-medium text-on-surface">
                        {formatRating5(exp.rating)} / 5
                      </span>
                    </>
                  ) : (
                    <span className="font-caption text-caption italic text-secondary">Unrated</span>
                  )}
                </div>

                {/* Date Logged */}
                <div className="col-span-2 text-left sm:text-right font-caption text-caption text-secondary flex sm:block items-center justify-between w-full">
                  <span>
                    {loggedDate
                      ? new Date(loggedDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                      : '—'}
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-secondary group-hover:text-primary group-hover:translate-x-0.5 transition-transform ml-xs sm:inline-block hidden">
                    arrow_forward
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
