"use client";

import * as Popover from "@radix-ui/react-popover";
import { useTheme } from "next-themes";
import { Palette, Sun, Moon, Monitor, RotateCcw } from "lucide-react";
import { useState, useEffect, useTransition } from "react";
import { useTripStore } from "@/store/tripStore";
import { updateTripThemeAction } from "@/app/actions/trip";

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
          className="p-2 rounded-full bg-panel-elevated dark:bg-panel-elevated-dark hover:bg-panel-border dark:hover:bg-panel-border-dark transition-colors"
        >
          <Palette className="h-5 w-5 text-panel-text-primary dark:text-panel-text-inverse" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          collisionPadding={16}
          className="bg-panel-surface dark:bg-panel-surface-dark border border-panel-border dark:border-panel-border-dark rounded-xl shadow-2xl p-4 w-72 z-50"
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-panel-text-primary dark:text-panel-text-inverse">
                Trip Canvas
              </label>
              <p className="text-xs text-panel-text-secondary dark:text-panel-text-secondary">
                Visual theme for your itinerary
              </p>
              <div className="grid grid-cols-2 gap-3 w-full">
                {(
                  [
                    "CLASSIC",
                    "EDITORIAL",
                    "NOTEBOOK",
                    "TERMINAL",
                  ] as const
                ).map((canvas) => (
                  <button
                    key={canvas}
                    onClick={() => handleThemeChange(canvas)}
                    className={`group relative flex flex-col items-center justify-center h-16 w-full min-w-0 rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-95 ${
                      activeCanvas === canvas
                        ? "bg-panel-brand dark:bg-panel-brand text-panel-text-inverse dark:text-panel-text-inverse border-panel-brand"
                        : "bg-panel-elevated dark:bg-panel-elevated-dark text-panel-text-primary dark:text-panel-text-inverse hover:bg-panel-border dark:hover:bg-panel-border-dark border-transparent"
                    }`}
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest truncate w-full px-1">
                      {canvas}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-panel-text-primary dark:text-panel-text-inverse">
                Display Mode
              </label>
              {mounted ? (
                <div className="flex items-center space-x-1 bg-panel-elevated dark:bg-panel-elevated-dark p-1 rounded-lg mt-2">
                  <button
                    onClick={() => setTheme("light")}
                    disabled={isTerminalTheme}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                      theme === "light" && !isTerminalTheme
                        ? "bg-panel-surface dark:bg-panel-surface-dark text-panel-text-primary dark:text-panel-text-inverse shadow-sm"
                        : "text-panel-text-secondary dark:text-panel-text-secondary"
                    } ${
                      isTerminalTheme
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    }`}
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                      theme === "dark" || isTerminalTheme
                        ? "bg-panel-surface dark:bg-panel-surface-dark text-panel-text-primary dark:text-panel-text-inverse shadow-sm"
                        : "text-panel-text-secondary dark:text-panel-text-secondary"
                    }`}
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </button>
                  <button
                    onClick={() => setTheme("system")}
                    disabled={isTerminalTheme}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                      theme === "system" && !isTerminalTheme
                        ? "bg-panel-surface dark:bg-panel-surface-dark text-panel-text-primary dark:text-panel-text-inverse shadow-sm"
                        : "text-panel-text-secondary dark:text-panel-text-secondary"
                    } ${
                      isTerminalTheme
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    }`}
                  >
                    <Monitor className="h-4 w-4" />
                    System
                  </button>
                </div>
              ) : (
                <div className="h-10 bg-panel-elevated dark:bg-panel-elevated-dark rounded-lg mt-2 animate-pulse" />
              )}
              {isTerminalTheme && (
                <p className="text-xs text-panel-text-secondary dark:text-panel-text-secondary mt-2">
                  Terminal theme requires Dark Display.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-panel-border dark:border-panel-border-dark flex items-center justify-between">
            <p className="text-xs text-panel-text-secondary dark:text-panel-text-secondary">
              Trip override active.
            </p>
            <button 
              onClick={() => handleThemeChange("CLASSIC")}
              className="flex items-center gap-1.5 text-xs font-semibold text-panel-text-secondary dark:text-panel-text-secondary hover:text-panel-brand dark:hover:text-panel-brand transition-colors">
              <RotateCcw className="h-3 w-3" />
              Reset to Default
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
