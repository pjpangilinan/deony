import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ui/useToast';
import { useAuth } from '../providers/AuthProvider';
import { generateStatisticsPdf } from '../utils/pdfExport';
import { shareContent } from '../utils/share';

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
}

interface Stats {
  totalEntries: number;
  wordsWritten: number;
  mediaAdded: number;
  currentStreak: number;
}

export function StatisticsPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalEntries: 0,
    wordsWritten: 0,
    mediaAdded: 0,
    currentStreak: 0
  });

  const [monthlyData, setMonthlyData] = useState<number[]>([]);
  const [categoryData, setCategoryData] = useState<{name: string, percentage: number}[]>([]);
  const [recentCompleted, setRecentCompleted] = useState<Experience[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get<{items: Experience[]}>('/experiences');
      const completed = res.items.filter(e => e.status === 'Completed');
      setRecentCompleted(completed);
      
      let words = 0;
      const mediaIds = new Set<string>();
      const months = Array(7).fill(0);
      const categories: Record<string, number> = {};
      
      const now = new Date();
      
      completed.forEach(e => {
        if (e.thoughts) {
          words += e.thoughts.trim().split(/\s+/).length;
        }
        if (e.media_id) {
          mediaIds.add(e.media_id);
        }
        
        if (e.media_type) {
          categories[e.media_type] = (categories[e.media_type] || 0) + 1;
        }

        const d = e.sort_date ? new Date(e.sort_date) : new Date(e.created_at);
        const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
        if (diffMonths >= 0 && diffMonths < 7) {
          months[6 - diffMonths]++;
        }
      });

      const maxMonth = Math.max(...months, 1);
      setMonthlyData(months.map(m => (m / maxMonth) * 100));

      const totalCategories = completed.filter(e => e.media_type).length || 1;
      const catArray = Object.entries(categories)
        .map(([name, count]) => ({ name, percentage: Math.round((count / totalCategories) * 100) }))
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 3);
      
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
        currentStreak: streak
      });

    } catch (err) {
      console.error(err);
      showToast('Failed to load statistics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      const recent = recentCompleted.slice(0, 10).map((e) => ({
        title: e.media_title,
        type: e.media_type,
        rating: e.rating,
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

  return (
    <div className="max-w-[900px] mx-auto px-gutter py-xl">
      <div className="mb-xl">
        <h1 className="font-headline-lg text-headline-lg text-primary m-0 mb-sm">Statistics & Retrospectives</h1>
        <p className="font-body-md text-body-md text-on-surface-variant m-0">A reflection on your journey, measured in moments and categories.</p>
      </div>

      {loading ? (
        <div className="space-y-xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-md">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-surface-variant animate-pulse h-[120px] rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-md">
            <div className="bg-surface-variant animate-pulse h-[300px] rounded-xl"></div>
            <div className="bg-surface-variant animate-pulse h-[300px] rounded-xl"></div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-md mb-xl">
            <StatCard title="TOTAL ENTRIES" value={stats.totalEntries.toString()} />
            <StatCard title="WORDS WRITTEN" value={stats.wordsWritten > 1000 ? `${(stats.wordsWritten/1000).toFixed(1)}k` : stats.wordsWritten.toString()} />
            <StatCard title="MEDIA ADDED" value={stats.mediaAdded.toString()} />
            <StatCard title="CURRENT STREAK" value={`${stats.currentStreak} days`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-md mb-xxl">
            <div className="bg-surface-container-lowest border border-tertiary rounded-xl p-lg flex flex-col">
              <div className="font-headline-md text-headline-md text-primary mb-xl">Entries Over Time</div>
              <div className="flex items-end h-[200px] gap-md border-b border-tertiary pb-sm">
                {monthlyData.map((h, i) => (
                  <div key={i} 
                    className={`flex-1 rounded-t-sm transition-all duration-500 ${i === 6 ? 'bg-primary' : 'bg-outline-variant'}`}
                    style={{ height: `${Math.max(h, 5)}%` }}
                  ></div>
                ))}
              </div>
              <div className="flex justify-between mt-sm font-label-md text-label-md text-on-surface-variant">
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - (6 - i));
                  return <span key={i}>{d.toLocaleString('default', { month: 'short' })}</span>;
                })}
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-tertiary rounded-xl p-xl flex flex-col justify-between">
              <h3 className="font-headline-md text-headline-md text-primary m-0 mb-lg">Top Categories</h3>
              {categoryData.length === 0 ? (
                <div className="text-secondary font-body-md py-xl text-center">No categories to display yet.</div>
              ) : (
                <div className="flex flex-col gap-md">
                  {categoryData.map(cat => (
                    <div key={cat.name} className="flex flex-col gap-xs">
                      <div className="flex justify-between font-label-md text-label-md text-on-surface">
                        <span className="uppercase">{cat.name}</span>
                        <span>{cat.percentage}%</span>
                      </div>
                      <div className="w-full bg-surface-variant rounded-full h-2">
                        <div 
                          className="bg-primary rounded-full h-2" 
                          style={{ width: `${cat.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-primary text-on-primary rounded-xl p-xl flex flex-col md:flex-row justify-between items-center gap-xl bg-[radial-gradient(circle_at_10px_10px,rgba(255,255,255,0.1)_2px,transparent_0)] bg-[length:30px_30px]">
            <div className="md:max-w-[60%]">
              <h3 className="font-headline-lg text-headline-lg m-0 mb-md">Your Year in Deony</h3>
              <p className="font-body-md text-body-md m-0 opacity-90">
                You've consistently documented your thoughts, capturing a variety of experiences across different categories. Keep the momentum going!
              </p>
            </div>
            <div className="flex flex-col gap-md w-full md:w-[200px] shrink-0">
              <button 
                type="button"
                onClick={handleShareSummary}
                className="flex items-center justify-center gap-sm px-lg py-sm rounded-lg bg-on-primary text-primary font-label-md text-label-md hover:bg-surface-variant transition-all hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">share</span> Share Summary
              </button>
              <button 
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="flex items-center justify-center gap-sm px-lg py-sm rounded-lg border border-on-primary bg-transparent text-on-primary font-label-md text-label-md hover:bg-primary-container transition-all hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isGeneratingPdf ? 'hourglass_top' : 'download'}
                </span> 
                {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string, value: string }) {
  return (
    <div className="bg-surface-container-lowest border border-tertiary rounded-xl p-lg flex flex-col justify-between min-h-[120px]">
      <div className="font-label-md text-label-md text-on-surface-variant tracking-wider uppercase">{title}</div>
      <div className="font-headline-lg text-headline-lg text-on-surface">{value}</div>
    </div>
  );
}
