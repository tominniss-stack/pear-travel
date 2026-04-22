/// <reference lib="webworker" />

// @ts-ignore - Serwist module resolution quirk: resolves in 
// local TS server but fails during next build's service worker 
// compilation context.
import { defaultCache } from "@serwist/next/worker";
// @ts-ignore - Same Serwist resolution quirk as above
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
// @ts-ignore - Same Serwist resolution quirk as above
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
