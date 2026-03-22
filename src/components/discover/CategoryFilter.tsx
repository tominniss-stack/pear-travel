'use client';

import { useCallback } from 'react';

export interface CategoryFilterProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  totalCount: number;
  categoryCounts: Record<string, number>;
}

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    'All':                '✨',
    'Museum':             '🏛️',
    'Art Gallery':        '🎨',
    'Place of Worship':   '⛪',
    'Cathedral':          '⛪',
    'Park & Gardens':     '🌿',
    'Zoo':                '🦁',
    'Amusement Park':     '🎡',
    'Aquarium':           '🐠',
    'Stadium':            '🏟️',
    'Cinema':             '🎬',
    'Nightlife':          '🌙',
    'Bar':                '🍸',
    'Restaurant':         '🍽️',
    'Café':               '☕',
    'Shopping':           '🛍️',
    'Market':             '🏪',
    'Tourist Attraction': '📸',
    'Nature':             '🌲',
    'Library':            '📚',
    'Historic Site':      '🗿',
    'Spa & Wellness':     '🧖',
  };
  return map[category] ?? '📍';
}

export default function CategoryFilter({ categories, activeCategory, onCategoryChange, totalCount, categoryCounts }: CategoryFilterProps) {
  const allCategories = ['All', ...categories];

  const handleClick = useCallback((category: string) => {
      onCategoryChange(category);
    }, [onCategoryChange]);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-slate-50 to-transparent dark:from-slate-900 z-10" aria-hidden="true" />
      <div role="group" aria-label="Filter places by category" className="flex gap-2 overflow-x-auto pb-2 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {allCategories.map((category) => {
          const isActive = activeCategory === category;
          const count    = category === 'All' ? totalCount : (categoryCounts[category] ?? 0);
          const emoji    = getCategoryEmoji(category);

          return (
            <button
              key={category}
              type="button"
              onClick={() => handleClick(category)}
              aria-pressed={isActive}
              aria-label={`Filter by ${category} — ${count} place${count !== 1 ? 's' : ''}`}
              className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 ${isActive ? 'border-brand-500 bg-brand-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700'}`}
            >
              <span aria-hidden="true">{emoji}</span>
              <span>{category}</span>
              <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}