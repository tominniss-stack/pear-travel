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
    <div
      role="group"
      aria-label="Filter places by category"
      className="flex overflow-x-auto gap-2 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
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
            className={`whitespace-nowrap inline-flex flex-shrink-0 items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 ${
              isActive
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <span aria-hidden="true">{emoji}</span>
            <span>{category}</span>
            <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium ${
              isActive ? 'bg-white/20 dark:bg-black/20 text-white dark:text-zinc-900' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
            }`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
