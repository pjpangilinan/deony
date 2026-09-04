import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { SkeletonCard, EmptyState } from '../components/ui';
import { normalizeRatingTo5, formatRating5 } from '../utils/rating';
import { useAuth } from '../providers/AuthProvider';
import { useToast } from '../components/ui/useToast';
import { generateStatisticsPdf } from '../utils/pdfExport';
import { shareContent } from '../utils/share';

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

interface LibraryPageProps {
  initialView?: 'catalog' | 'stats';
}

export function LibraryPage({ initialView }: LibraryPageProps = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const viewFromUrl = searchParams.get('view') as 'catalog' | 'stats' | null;
  const [libraryTab, setLibraryTab] = useState<'catalog' | 'stats'>(
    initialView || (viewFromUrl === 'stats' ? 'stats' : 'catalog')
  );

  useEffect(() => {
    if (initialView) {
      setLibraryTab(initialView);
    } else if (viewFromUrl === 'stats') {
      setLibraryTab('stats');
    } else if (viewFromUrl === 'catalog') {
      setLibraryTab('catalog');
    }
  }, [initialView, viewFromUrl]);

  const handleTabChange = (tab: 'catalog' | 'stats') => {
    setLibraryTab(tab);
    setSearchParams({ view: tab });
  };

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

  // Statistics State
  const [stats, setStats] = useState({
    totalEntries: 0,
    wordsWritten: 0,
    mediaAdded: 0,
    currentStreak: 0,
  });
  const [monthlyData, setMonthlyData] = useState<number[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; percentage: number }[]>([]);
  const [recentCompleted, setRecentCompleted] = useState<Experience[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    fetchLibraryData();
  }, []);

  // Keyboard shortcut: Pressing '/' focuses search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        libraryTab === 'catalog' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [libraryTab]);

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
      const [expRes, catRes] = await Promise.all([
        api.get<{ items: Experience[] }>('/experiences'),
        api.get<{ items: Category[] }>('/categories')
      ]);

      const exps = expRes.items || [];
      setExperiences(exps);
      setCategories(catRes.items || []);

      // Calculate statistics
      calculateStatistics(exps);

      // Batch fetch media items for covers
      const mediaIds = Array.from(new Set(exps.map((e) => e.media_id).filter(Boolean)));
      if (mediaIds.length > 0) {
        try {
          const mediaRes = await api.post<{ items: MediaItem[] }>('/media/batch-get', { ids: mediaIds });
          if (mediaRes.items) {
            const map: Record<string, MediaItem> = {};
            mediaRes.items.forEach((m) => {
              map[m.id] = m;
            });
            setMediaMap(map);
          }
        } catch (mErr) {
          console.error('Failed to batch fetch media items:', mErr);
        }
      }
    } catch (e) {
      console.error('Failed to fetch library data:', e);
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (allExps: Experience[]) => {
    const completed = allExps.filter(e => e.status === 'Completed');
    setRecentCompleted(completed);

    let words = 0;
    const mediaIds = new Set<string>();
    const months = Array(7).fill(0);
    const catCounts: Record<string, number> = {};
    const now = new Date();

    completed.forEach(e => {
      if (e.thoughts) {
        words += e.thoughts.trim().split(/\s+/).length;
      }
      if (e.media_id) {
        mediaIds.add(e.media_id);
      }
      if (e.media_type) {
        catCounts[e.media_type] = (catCounts[e.media_type] || 0) + 1;
      }

      const d = e.sort_date ? new Date(e.sort_date) : new Date(e.created_at);
      const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
      if (diffMonths >= 0 && diffMonths < 7) {
        months[6 - diffMonths]++;
      }
    });

    const maxMonth = Math.max(...months, 1);
    setMonthlyData(months.map(m => (m / maxMonth) * 100));

    const totalCatCount = completed.filter(e => e.media_type).length || 1;
    const catArray = Object.entries(catCounts)
      .map(([name, count]) => ({ name, percentage: Math.round((count / totalCatCount) * 100) }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 4);
    setCategoryData(catArray);

    const sortedDates = completed
      .map(e => new Date(e.sort_date || e.created_at))
      .sort((a, b) => b.getTime() - a.getTime());

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const d of sortedDates) {
      const compareDate = new Date(d);
      compareDate.setHours(0, 0, 0, 0);
      const diffTime = currentDate.getTime() - compareDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

      if (diffDays === 0 || diffDays === 1) {
        if (diffDays === 1 || (diffDays === 0 && streak === 0)) streak++;
        currentDate = compareDate;
      } else if (diffDays > 1) {
        break;
      }
    }

    setStats({
      totalEntries: completed.length,
      wordsWritten: words,
      mediaAdded: mediaIds.size,
      currentStreak: streak,
    });
  };

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      const recent = recentCompleted.slice(0, 10).map((e) => ({
        title: e.media_title,
        type: e.media_type,
        rating: e.rating || undefined,
        date: e.sort_date ? new Date(e.sort_date).toLocaleDateString() : undefined,
      }));

      const success = generateStatisticsPdf({
        username: user?.username,
        totalEntries: stats.totalEntries,
        wordsWritten: stats.wordsWritten,
        mediaAdded: stats.mediaAdded,
        currentStreak: stats.currentStreak,
        categories: categoryData,
        recentEntries: recent,
      });

      if (success) {
        showToast('Archive summary PDF downloaded!', 'success');
      } else {
        showToast('Could not generate PDF', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Could not generate PDF', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareSummary = async () => {
    const topCats = categoryData.map((c) => `${c.name} (${c.percentage}%)`).join(', ');
    const summaryText = `🏛️ My Deony Archive Summary\n\n• Completed: ${stats.totalEntries} experiences\n• Words Written: ${stats.wordsWritten.toLocaleString()}\n• Media Curated: ${stats.mediaAdded} items\n• Current Streak: ${stats.currentStreak} days\n${topCats ? `• Top Categories: ${topCats}\n` : ''}\nDeony — Digital Sanctuary: ${window.location.origin}`;

    const res = await shareContent({
      title: 'My Deony Archive Summary',
      text: summaryText,
      url: window.location.origin,
    });

    if (res === 'shared') {
      showToast('Archive summary shared!', 'success');
    } else if (res === 'copied') {
      showToast('Archive summary copied to clipboard!', 'success');
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedRating('all');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'all' ||
    selectedStatus !== 'all' ||
    selectedRating !== 'all';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return {
          bg: 'bg-primary/90 text-on-primary',
          border: 'border-primary/40',
          dot: 'bg-emerald-300',
          label: 'Completed'
        };
      case 'Currently Experiencing':
        return {
          bg: 'bg-amber-800/90 text-white',
          border: 'border-amber-600/40',
          dot: 'bg-amber-300 animate-pulse',
          label: 'In Progress'
        };
      case 'Want to Experience':
        return {
          bg: 'bg-surface-variant/95 text-on-surface-variant',
          border: 'border-tertiary/40',
          dot: 'bg-primary',
          label: 'Wishlist'
        };
      case 'Dropped':
        return {
          bg: 'bg-error-container/90 text-on-error-container',
          border: 'border-error/40',
          dot: 'bg-error',
          label: 'Dropped'
        };
      default:
        return {
          bg: 'bg-surface-variant/90 text-on-surface-variant',
          border: 'border-tertiary/30',
          dot: 'bg-secondary',
          label: status
        };
    }
  };

  // Client-side filtering & sorting
  const filtered = experiences
    .filter((exp) => {
      if (selectedCategory !== 'all' && exp.category_id !== selectedCategory) {
        return false;
      }
      if (selectedStatus !== 'all' && exp.status !== selectedStatus) {
        return false;
      }
      if (selectedRating !== 'all') {
        if (selectedRating === 'unrated') {
          if (exp.rating !== null && exp.rating !== undefined) return false;
        } else if (selectedRating === 'rated') {
          if (exp.rating === null || exp.rating === undefined) return false;
        } else {
          const target = Number(selectedRating);
          const norm = normalizeRatingTo5(exp.rating);
          if (norm === null || Math.round(norm) !== target) return false;
        }
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const media = mediaMap[exp.media_id];
        const titleMatch = (exp.media_title || '').toLowerCase().includes(q);
        const thoughtsMatch = (exp.thoughts || '').toLowerCase().includes(q);
        const descMatch = (media?.description || '').toLowerCase().includes(q);
        const cat = categories.find((c) => c.id === exp.category_id);
        const categoryMatch = (cat?.name || '').toLowerCase().includes(q);
        const badge = getStatusBadge(exp.status);
        const statusMatch = (exp.status || '').toLowerCase().includes(q) || badge.label.toLowerCase().includes(q);
        if (!titleMatch && !thoughtsMatch && !descMatch && !categoryMatch && !statusMatch) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date_desc') {
        const da = a.sort_date ? new Date(a.sort_date).getTime() : new Date(a.created_at).getTime();
        const db = b.sort_date ? new Date(b.sort_date).getTime() : new Date(b.created_at).getTime();
        return db - da;
      }
      if (sortBy === 'date_asc') {
        const da = a.sort_date ? new Date(a.sort_date).getTime() : new Date(a.created_at).getTime();
        const db = b.sort_date ? new Date(b.sort_date).getTime() : new Date(b.created_at).getTime();
        return da - db;
      }
      if (sortBy === 'rating_desc') {
        const ra = a.rating ?? -1;
        const rb = b.rating ?? -1;
        return rb - ra;
      }
      if (sortBy === 'rating_asc') {
        const ra = a.rating ?? 999;
        const rb = b.rating ?? 999;
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
    <div className="flex-1 w-full pt-16 md:pt-0 pb-xl px-gutter md:px-8 lg:px-12 max-w-[1300px] mx-auto min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary-container">
      {/* Top Header: Title & View Switcher (Catalog vs Statistics) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md pt-lg pb-sm border-b border-tertiary/25 mb-lg">
        <div className="flex items-center gap-sm">
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
            {libraryTab === 'catalog' ? 'Personal Library' : 'Archive Statistics'}
          </h1>
          <span className="font-caption text-caption text-secondary px-sm py-0.5 rounded-full bg-surface-variant/70 border border-tertiary/25 font-medium">
            {experiences.length} total
          </span>
        </div>

        {/* View Switcher: Catalog vs Statistics */}
        <div className="flex items-center gap-xs bg-surface-variant/70 p-1 rounded-lg border border-tertiary/25 self-start sm:self-auto">
          <button
            type="button"
            id="tab-library-catalog"
            onClick={() => handleTabChange('catalog')}
            className={`flex items-center gap-xs px-md py-xs rounded-md font-label-md text-label-md transition-all cursor-pointer ${
              libraryTab === 'catalog'
                ? 'bg-surface text-primary shadow-xs font-semibold'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">photo_library</span>
            <span>Catalog</span>
          </button>
          <button
            type="button"
            id="tab-library-stats"
            onClick={() => handleTabChange('stats')}
            className={`flex items-center gap-xs px-md py-xs rounded-md font-label-md text-label-md transition-all cursor-pointer ${
              libraryTab === 'stats'
                ? 'bg-surface text-primary shadow-xs font-semibold'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">bar_chart</span>
            <span>Insights & Statistics</span>
          </button>
        </div>
      </div>

      {/* --- TAB 1: CATALOG --- */}
      {libraryTab === 'catalog' && (
        <div className="flex-1 flex flex-col animate-fade-in">
          {/* Header & Filters Section */}
          <header
            className="pb-md flex flex-col md:flex-row justify-between items-start md:items-center gap-md border-b border-tertiary/25 mb-md"
            ref={filterRef}
          >
            {/* Search Bar */}
            <form
              onSubmit={(e) => e.preventDefault()}
              className="relative w-full max-w-md min-w-[260px] sm:min-w-[340px] group"
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

            {/* Filter Pills, View Toggle, & Sort */}
            <div className="flex flex-wrap items-center gap-sm w-full md:w-auto justify-between md:justify-end">
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

              {/* Clear Filters Reset */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="font-label-md text-label-md text-secondary hover:text-primary transition-colors underline underline-offset-2 px-xs cursor-pointer"
                >
                  Reset
                </button>
              )}

              {/* View Mode Switcher */}
              <div className="flex items-center bg-surface-variant/60 rounded-lg p-0.5 border border-tertiary/20 ml-auto md:ml-0">
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

              {/* Sort Dropdown */}
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
                  {selectedRating === 'unrated' ? 'Unrated' : `${selectedRating} Stars`}
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
            </div>
          )}

          {/* Body Content */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-md flex-1">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonCard key={i} aspectRatio="poster" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            experiences.length === 0 ? (
              <EmptyState
                icon="auto_stories"
                title="Your shelves are waiting"
                description="Your personal library holds every memory, reflection, and rating you log across film, literature, games, and music."
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
            /* Poster Grid View */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-md gap-y-lg flex-1">
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
                    {/* Poster Cover Container */}
                    <div className="aspect-[2/3] w-full overflow-hidden rounded-lg border border-tertiary/15 bg-surface-variant relative mb-xs transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg shadow-tertiary/5">
                      {coverImage ? (
                        <img
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 ease-out"
                          src={coverImage}
                          alt={exp.media_title || 'Media cover'}
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-tertiary group-hover:bg-primary-container/5 transition-colors">
                          <span className="material-symbols-outlined text-[42px] opacity-25 group-hover:opacity-40 transition-opacity">
                            photo
                          </span>
                        </div>
                      )}

                      {/* Status Chip Overlay on Poster */}
                      {exp.status && (
                        <div className="absolute top-2 left-2 z-10">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium tracking-wide shadow-sm backdrop-blur-md ${badge.bg}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                            {badge.label}
                          </span>
                        </div>
                      )}

                      {/* Hover Quick Cue */}
                      <div className="absolute inset-0 bg-primary/15 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none flex items-center justify-center">
                        <span className="px-3 py-1 rounded-full bg-surface/95 text-primary text-xs font-medium shadow-md backdrop-blur-sm">
                          View Entry
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3
                      className="font-body-md text-sm sm:text-base font-medium text-on-surface truncate group-hover:text-primary transition-colors"
                      title={exp.media_title}
                    >
                      {exp.media_title || 'Untitled Draft'}
                    </h3>

                    {/* Metadata Row: Rating & Category */}
                    <div className="flex items-center gap-xs mt-0.5 text-secondary text-xs sm:text-sm">
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
                        <span className="truncate">{displayType}</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* Archival List / Table View */
            <div className="flex flex-col gap-xs flex-1">
              <div className="hidden sm:grid grid-cols-12 gap-md px-md py-xs font-label-md text-xs text-secondary uppercase tracking-wider border-b border-tertiary/20 mb-xs">
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
                    className="flex flex-col sm:grid sm:grid-cols-12 gap-sm sm:gap-md items-start sm:items-center px-md py-sm rounded-lg bg-surface-container-lowest border border-tertiary/20 hover:border-tertiary/60 hover:bg-surface-variant/30 transition-all cursor-pointer group"
                  >
                    {/* Left: Thumbnail & Title */}
                    <div className="col-span-6 flex items-center gap-md w-full min-w-0">
                      <div className="w-10 h-14 rounded overflow-hidden bg-surface-variant border border-tertiary/20 shrink-0 flex items-center justify-center">
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="material-symbols-outlined text-[20px] text-tertiary opacity-40">
                            photo
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-body-md text-sm sm:text-base font-medium text-on-surface truncate group-hover:text-primary transition-colors">
                          {exp.media_title || 'Untitled Draft'}
                        </div>
                        <div className="text-xs text-secondary truncate mt-0.5">
                          {displayType || 'Media'}
                          {exp.thoughts && (
                            <span className="italic ml-xs opacity-75">
                              — "{exp.thoughts.slice(0, 45)}..."
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="col-span-2 flex items-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                        {badge.label}
                      </span>
                    </div>

                    {/* Rating */}
                    <div className="col-span-2 flex items-center gap-1 text-sm">
                      {exp.rating !== undefined && exp.rating !== null ? (
                        <>
                          <span
                            className="material-symbols-outlined text-[16px] text-primary"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            star
                          </span>
                          <span className="font-medium text-on-surface">
                            {formatRating5(exp.rating)} / 5
                          </span>
                        </>
                      ) : (
                        <span className="text-xs italic text-secondary/70">Unrated</span>
                      )}
                    </div>

                    {/* Date */}
                    <div className="col-span-2 sm:text-right text-xs text-secondary w-full sm:w-auto">
                      {loggedDate
                        ? new Date(loggedDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : '—'}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: STATISTICS & INSIGHTS --- */}
      {libraryTab === 'stats' && (
        <div className="space-y-xl animate-fade-in">
          {/* Header */}
          <div className="mb-md">
            <h2 className="font-headline-md text-headline-md text-primary mb-xs">Statistics & Retrospectives</h2>
            <p className="font-body-md text-body-md text-secondary">A reflection on your journey, measured in moments and categories.</p>
          </div>

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-md">
            <StatCard title="TOTAL ENTRIES" value={stats.totalEntries.toString()} />
            <StatCard
              title="WORDS WRITTEN"
              value={stats.wordsWritten > 1000 ? `${(stats.wordsWritten / 1000).toFixed(1)}k` : stats.wordsWritten.toString()}
            />
            <StatCard title="MEDIA ADDED" value={stats.mediaAdded.toString()} />
            <StatCard title="CURRENT STREAK" value={`${stats.currentStreak} days`} />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-lg">
            {/* Monthly Trend Chart */}
            <div className="bg-surface-container-lowest border border-tertiary rounded-xl p-lg flex flex-col justify-between">
              <div className="font-headline-md text-headline-md text-primary mb-lg">Entries Over Time</div>
              <div className="flex items-end h-[180px] gap-md border-b border-tertiary pb-sm">
                {monthlyData.map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-sm transition-all duration-500 ${
                      i === 6 ? 'bg-primary' : 'bg-outline-variant'
                    }`}
                    style={{ height: `${Math.max(h, 5)}%` }}
                    title={`Month ${i + 1}`}
                  ></div>
                ))}
              </div>
              <div className="flex justify-between mt-sm font-label-md text-xs text-on-surface-variant">
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - (6 - i));
                  return <span key={i}>{d.toLocaleString('default', { month: 'short' })}</span>;
                })}
              </div>
            </div>

            {/* Top Categories */}
            <div className="bg-surface-container-lowest border border-tertiary rounded-xl p-lg flex flex-col justify-between">
              <h3 className="font-headline-md text-headline-md text-primary m-0 mb-lg">Top Categories</h3>
              {categoryData.length === 0 ? (
                <div className="text-secondary font-body-md py-lg text-center">No categories logged yet.</div>
              ) : (
                <div className="flex flex-col gap-md">
                  {categoryData.map((cat) => (
                    <div key={cat.name} className="flex flex-col gap-xs">
                      <div className="flex justify-between font-label-md text-label-md text-on-surface">
                        <span className="uppercase">{cat.name}</span>
                        <span>{cat.percentage}%</span>
                      </div>
                      <div className="w-full bg-surface-variant rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all duration-500"
                          style={{ width: `${cat.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Your Year in Deony Banner */}
          <div className="bg-primary text-on-primary rounded-xl p-lg sm:p-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-lg bg-[radial-gradient(circle_at_10px_10px,rgba(255,255,255,0.1)_2px,transparent_0)] bg-[length:30px_30px]">
            <div className="md:max-w-[65%]">
              <h3 className="font-headline-lg text-headline-lg m-0 mb-sm">Your Year in Deony</h3>
              <p className="font-body-md text-body-md m-0 opacity-90 leading-relaxed">
                You've consistently documented your thoughts, capturing experiences across diverse art forms. Every rating and reflection enriches your personal memory archive.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row md:flex-col gap-sm w-full md:w-[200px] shrink-0">
              <button
                type="button"
                onClick={handleShareSummary}
                className="flex items-center justify-center gap-sm px-lg py-sm rounded-lg bg-on-primary text-primary font-label-md text-label-md hover:bg-surface-variant transition-all hover:shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">share</span> Share Summary
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="flex items-center justify-center gap-sm px-lg py-sm rounded-lg border border-on-primary bg-transparent text-on-primary font-label-md text-label-md hover:bg-primary-container transition-all hover:shadow-sm cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isGeneratingPdf ? 'hourglass_top' : 'download'}
                </span>
                {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-surface-container-lowest border border-tertiary rounded-xl p-md sm:p-lg flex flex-col justify-between min-h-[110px]">
      <div className="font-label-md text-xs text-secondary tracking-wider uppercase">{title}</div>
      <div className="font-headline-lg text-headline-lg text-primary font-medium mt-1">{value}</div>
    </div>
  );
}
