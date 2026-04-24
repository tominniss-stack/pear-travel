"use client";

import * as Popover from "@radix-ui/react-popover";
import { useTheme } from "next-themes";
import { Palette, LayoutTemplate, Newspaper, BookOpen, TerminalSquare, Sun, Moon, Monitor, RotateCcw } from "lucide-react";
import { useState, useEffect, useTransition } from "react";
import { useTripStore } from "@/store/tripStore";
import { updateTripThemeAction } from "@/app/actions/trip";

const THEMES = [
  { id: 'CLASSIC', label: 'Classic', desc: 'Clean, structured utility', icon: LayoutTemplate },
  { id: 'EDITORIAL', label: 'Editorial', desc: 'Elegant magazine aesthetic', icon: Newspaper },
  { id: 'NOTEBOOK', label: 'Notebook', desc: 'Casual scrapbook vibe', icon: BookOpen },
  { id: 'TERMINAL', label: 'Terminal', desc: 'Developer CLI layout', icon: TerminalSquare },
] as const;

export function AppearancePopover() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const activeCanvas = useTripStore((state) => state.themeOverride) || "CLASSIC";
  const setThemeOverride = useTripStore((state) => state.setThemeOverride);
  const tripId = useTripStore((state) => state.currentTripId);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setMounted(true), []);

  const handleThemeChange = (theme: 'CLASSIC' | 'EDITORIAL' | 'NOTEBOOK' | 'TERMINAL') => {
    setThemeOverride(theme); // Instant optimistic UI update
    if (tripId) {
      startTransition(() => {
        updateTripThemeAction(tripId, theme as any);
      });
    }
  };

  const isTerminalTheme = activeCanvas === "TERMINAL";

  useEffect(() => {
    if (isTerminalTheme && theme !== "dark") {
      setTheme("dark");
    }
  }, [isTerminalTheme, theme, setTheme]);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label="Change trip appearance"
          title="Change trip appearance"
          className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <Palette className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          collisionPadding={16}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl p-4 w-72 z-50"
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Trip Canvas
              </label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Visual theme for your itinerary
              </p>
              <div className="flex flex-col gap-1 w-full mt-2">
                {THEMES.map((themeOption) => {
                  const Icon = themeOption.icon;
                  const isActive = activeCanvas === themeOption.id;

                  return (
                    <button
                      key={themeOption.id}
                      onClick={() => handleThemeChange(themeOption.id)}
                      className={`
                        flex items-center gap-3 p-2 w-full rounded-lg text-left transition-all duration-200 border
                        ${isActive
                          ? 'bg-zinc-100/50 border-black/10 dark:bg-zinc-800/50 dark:border-white/10'
                          : 'bg-transparent border-transparent hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50'}
                      `}
                    >
                      <div className={`p-1.5 rounded-md ${isActive ? 'bg-white dark:bg-zinc-900 shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                        <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-zinc-500 dark:text-zinc-400'}`} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate text-zinc-900 dark:text-zinc-100">{themeOption.label}</span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{themeOption.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Display Mode
              </label>
              {mounted ? (
                <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg w-full mt-2">
                  {[
                    { id: 'light', label: 'Light', icon: Sun },
                    { id: 'dark', label: 'Dark', icon: Moon },
                    { id: 'system', label: 'Auto', icon: Monitor },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const isActive = isTerminalTheme && mode.id === 'dark' ? true : (!isTerminalTheme && theme === mode.id);
                    const isDisabled = isTerminalTheme && mode.id !== 'dark';
                    return (
                      <button
                        key={mode.id}
                        onClick={() => setTheme(mode.id)}
                        disabled={isDisabled}
                        className={`
                          flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all
                          ${isActive
                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/5'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}
                          ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}
                        `}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="h-10 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg mt-2 animate-pulse w-full" />
              )}
              {isTerminalTheme && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                  Terminal theme requires Dark Display.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Trip override active.
            </p>
            <button
              onClick={() => handleThemeChange("CLASSIC")}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              <RotateCcw className="h-3 w-3" />
              Reset to Default
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
