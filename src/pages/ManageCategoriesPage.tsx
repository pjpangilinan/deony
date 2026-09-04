import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/ui/useToast';
import { SkeletonRow, EmptyState } from '../components/ui';

interface Category {
  id: string;
  name: string;
  media_type: string;
  sort_order: number;
  is_builtin: boolean;
  icon?: string;
  count?: number;
}

const AVAILABLE_ICONS = [
  'movie',
  'tv',
  'menu_book',
  'sports_esports',
  'album',
  'podcasts',
  'article',
  'bookmark',
  'favorite',
  'folder',
];

const MEDIA_TYPES = [
  { value: 'movie', label: 'Movie' },
  { value: 'tv', label: 'TV Show' },
  { value: 'book', label: 'Book' },
  { value: 'game', label: 'Video Game' },
  { value: 'music', label: 'Music / Album' },
  { value: 'other', label: 'Other' },
];

export function ManageCategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMediaType, setNewMediaType] = useState('movie');
  const [newIcon, setNewIcon] = useState('movie');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drag State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get<{ items: Category[] }>('/categories');
      const sorted = (res.items || []).sort((a, b) => a.sort_order - b.sort_order);
      setCategories(sorted);
    } catch (err) {
      console.error(err);
      showToast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (cat: Category) => {
    if (cat.icon) return cat.icon;
    switch (cat.media_type) {
      case 'book':
      case 'books': return 'menu_book';
      case 'movie':
      case 'movies': return 'movie';
      case 'tv': return 'tv';
      case 'music':
      case 'albums': return 'album';
      case 'game':
      case 'games': return 'sports_esports';
      case 'podcasts': return 'podcasts';
      default: return 'folder';
    }
  };

  const handleOpenModal = () => {
    setNewName('');
    setNewMediaType('movie');
    setNewIcon('movie');
    setIsModalOpen(true);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setIsSubmitting(true);
      await api.post('/categories', {
        name: newName.trim(),
        media_type: newMediaType,
        icon: newIcon,
        sort_order: categories.length,
        is_builtin: false,
      });
      showToast('Category created', 'success');
      setIsModalOpen(false);
      await fetchCategories();
    } catch (err) {
      console.error(err);
      showToast('Failed to create category', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (cat.is_builtin) {
      showToast('Cannot delete built-in category', 'error');
      return;
    }

    const confirmMsg = cat.count && cat.count > 0
      ? `Delete "${cat.name}"? This category currently has ${cat.count} item(s).`
      : `Are you sure you want to delete "${cat.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.delete(`/categories/${cat.id}`);
      showToast('Category deleted', 'success');
      setCategories(prev => prev.filter(c => c.id !== cat.id));
    } catch (err) {
      console.error(err);
      showToast('Failed to delete category', 'error');
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    const reordered = [...categories];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const updated = reordered.map((cat, idx) => ({
      ...cat,
      sort_order: idx,
    }));

    setCategories(updated);
    setDraggedIndex(null);

    try {
      await Promise.all(
        updated.map(cat =>
          api.patch(`/categories/${cat.id}`, { sort_order: cat.sort_order })
        )
      );
    } catch (err) {
      console.error('Failed to save category order', err);
      showToast('Failed to save category order', 'error');
    }
  };

  return (
    <div className="max-w-[800px] mx-auto px-gutter py-xl">
      <div className="flex items-center gap-sm mb-lg text-secondary">
        <span className="material-symbols-outlined text-[16px]">settings</span>
        <Link to="/settings" className="font-label-md text-label-md hover:text-primary transition-colors">Settings</Link>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <span className="font-label-md text-label-md text-on-surface">Category Management</span>
      </div>

      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-md mb-xl">
        <div>
          <h1 className="font-headline-md text-headline-md text-primary mb-sm">Category Management</h1>
          <p className="font-body-md text-body-md text-secondary">Organize and prioritize your archive collections.</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="bg-primary text-on-primary font-label-md text-label-md rounded-lg px-lg py-sm flex items-center gap-sm shrink-0 hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Create Custom Category
        </button>
      </div>

      <div className="bg-surface-container-lowest border border-tertiary rounded-xl p-lg">
        <div className="flex justify-between text-secondary font-label-md text-label-md mb-md pb-md border-b border-tertiary">
          <span>CATEGORY</span>
          <span>ITEMS</span>
        </div>

        {loading ? (
          <div className="flex flex-col gap-sm">
            {[1, 2, 3, 4].map(i => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon="category"
            title="No categories found"
            description="Organize your experiences into custom categories like Anime, Philosophy Books, or Retro Games."
            primaryAction={{
              label: 'Create Custom Category',
              onClick: handleOpenModal,
              icon: 'add',
            }}
          />
        ) : (
          <div className="flex flex-col gap-sm">
            {categories.map((cat, idx) => (
              <div
                key={cat.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, idx)}
                className={`flex justify-between items-center p-sm rounded-lg hover:bg-surface-variant/40 transition-colors border border-transparent hover:border-tertiary group cursor-default ${
                  draggedIndex === idx ? 'opacity-40 border-dashed border-primary' : ''
                }`}
              >
                <div className="flex items-center gap-md">
                  <span
                    className="material-symbols-outlined cursor-grab active:cursor-grabbing text-secondary hover:text-on-surface transition-colors"
                    aria-label="Drag to reorder"
                  >
                    drag_indicator
                  </span>
                  <div className="w-8 h-8 bg-surface-variant flex items-center justify-center rounded text-primary">
                    <span className="material-symbols-outlined text-[20px]">
                      {getIcon(cat)}
                    </span>
                  </div>
                  <span className="font-body-lg text-body-lg text-on-surface">{cat.name}</span>
                  {!cat.is_builtin && (
                    <span className="font-caption text-caption bg-surface-variant text-on-surface-variant px-sm py-[2px] rounded-full">
                      Custom
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-lg">
                  <span className="font-body-md text-body-md text-secondary">
                    {cat.count !== undefined ? cat.count : 0}
                  </span>
                  {!cat.is_builtin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      className="text-secondary hover:text-error transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 p-xs rounded"
                      aria-label={`Delete ${cat.name}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-center text-secondary font-caption text-caption mt-xl">
        Drag items by the handle to reorder them in your navigation menus.
      </p>

      {/* Create Custom Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-gutter">
          <div className="bg-surface rounded-xl border border-tertiary max-w-[480px] w-full p-xl shadow-xl animate-fade-in">
            <div className="flex justify-between items-center mb-lg">
              <h2 className="font-headline-md text-headline-md text-primary">Create Custom Category</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-secondary hover:text-primary transition-colors"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="flex flex-col gap-lg">
              <div className="flex flex-col gap-xs">
                <label htmlFor="cat-name" className="font-label-md text-label-md text-on-surface-variant uppercase">
                  Category Name
                </label>
                <input
                  id="cat-name"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Graphic Novels, Podcasts, Anime"
                  className="w-full py-sm border-b border-tertiary focus:border-primary bg-transparent outline-none font-body-md text-body-md text-on-surface transition-colors"
                />
              </div>

              <div className="flex flex-col gap-xs">
                <label htmlFor="cat-media-type" className="font-label-md text-label-md text-on-surface-variant uppercase">
                  Media Type <span className="text-secondary text-caption normal-case">(immutable once created)</span>
                </label>
                <select
                  id="cat-media-type"
                  value={newMediaType}
                  onChange={(e) => setNewMediaType(e.target.value)}
                  className="w-full py-sm border-b border-tertiary focus:border-primary bg-transparent outline-none font-body-md text-body-md text-on-surface cursor-pointer"
                >
                  {MEDIA_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase mb-xs">
                  Icon
                </label>
                <div className="grid grid-cols-5 gap-sm">
                  {AVAILABLE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewIcon(icon)}
                      className={`h-10 rounded-lg flex items-center justify-center border transition-all ${
                        newIcon === icon
                          ? 'border-primary bg-primary text-on-primary'
                          : 'border-tertiary bg-surface-variant text-on-surface hover:border-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-md mt-md">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-lg py-sm rounded-lg border border-tertiary text-on-surface-variant font-label-md text-label-md hover:bg-surface-variant transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newName.trim()}
                  className="px-lg py-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
