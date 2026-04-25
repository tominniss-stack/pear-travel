"use client";

import * as Popover from "@radix-ui/react-popover";
import { Monitor } from "lucide-react";
import { DisplayModeToggle } from "./DisplayModeToggle";

export function AppShellThemeToggle() {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label="Change display mode"
          title="Change display mode"
          className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <Monitor className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          collisionPadding={16}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl p-4 w-72 z-50"
        >
          <div className="space-y-3">
            <div>
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Appearance
              </label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                Choose your preferred display mode
              </p>
            </div>
            <DisplayModeToggle />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}