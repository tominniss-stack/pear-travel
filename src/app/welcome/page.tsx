// ─────────────────────────────────────────────────────────────────────────────
// Genesis Onboarding Wizard — /welcome
// Typeform-style 6-step profile configuration with Framer Motion
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useProfileStore,
  useHydratedProfileStore,
} from '@/store/profileStore';
import type {
  DailyPacing,
  TransportPreference,
  DiningStyle,
} from '@/store/profileStore';
import { DisplayModeToggle } from '@/components/shared/DisplayModeToggle';
import { ThemeShowcase } from '@/components/welcome/ThemeShowcase';

// ── Animation Variants ────────────────────────────────────────────────────────

const stepVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -24 },
};

// ── Option Data ───────────────────────────────────────────────────────────────

const PACING_OPTIONS: { value: DailyPacing; label: string; desc: string }[] = [
  { value: 'relaxed',   label: 'Relaxed',   desc: 'One anchor activity per day with plenty of free time to wander.' },
  { value: 'moderate',  label: 'Moderate',  desc: '2–3 activities with comfortable breathing room between each.' },
  { value: 'intensive', label: 'Intensive', desc: 'Packed days, maximise every hour. 5+ activities scheduled.' },
];

const TRANSPORT_OPTIONS: { value: TransportPreference; label: string; desc: string }[] = [
  { value: 'walk',             label: 'Walk Everywhere',  desc: '10k+ steps a day. The city is best explored on foot.' },
  { value: 'public-transport', label: 'Public Transport', desc: 'Metro, bus, tram — travel like a local for longer distances.' },
  { value: 'private',          label: 'Private',          desc: 'Taxis and rideshares. Minimise friction between destinations.' },
];

const DINING_OPTIONS: { value: DiningStyle; label: string; desc: string }[] = [
  { value: 'gastronomy',  label: 'Gastronomy Focus', desc: 'Build days around reservations and culinary experiences.' },
  { value: 'convenience', label: 'Convenience',      desc: 'Quick casual bites fitted around the schedule.' },
];

const START_TIME_OPTIONS = [
  '07:00', '07:30', '08:00', '08:30', '09:00',
  '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
];

// ── Hydration Wrapper ─────────────────────────────────────────────────────────

export default function WelcomePage() {
  const hydrated = useHydratedProfileStore((s) => s.hasCompletedOnboarding);

  if (hydrated === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-900 dark:border-slate-100 border-t-transparent dark:border-t-transparent" />
          <p className="text-sm text-slate-400 dark:text-slate-500 font-medium tracking-wide">
            Preparing your profile…
          </p>
        </div>
      </div>
    );
  }

  // Redirect users who have already completed onboarding
  if (hydrated === true) {
    if (typeof window !== 'undefined') {
      window.location.replace('/dashboard');
    }
    return null;
  }

  return <OnboardingWizard />;
}

// ── Wizard Content ────────────────────────────────────────────────────────────

function OnboardingWizard() {
  const router = useRouter();
  const { dailyPacing, transportPreference, diningStyle, idealStartTime, updateProfile } =
    useProfileStore();

  const [step, setStep] = useState(1);
  const totalSteps = 6;

  const handleNext = useCallback(() => {
    if (step < totalSteps) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

  const handleComplete = useCallback(() => {
    updateProfile({ hasCompletedOnboarding: true });
    router.push('/dashboard');
  }, [updateProfile, router]);

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      {/* ── Progress Bar ── */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-slate-100 dark:bg-slate-900">
        <motion.div
          className="h-full bg-slate-900 dark:bg-slate-100"
          initial={{ width: 0 }}
          animate={{ width: `${(step / totalSteps) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        />
      </div>

      {/* ── Step Counter ── */}
      <div className="pt-10 pb-2 text-center">
        <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
          Step {step} of {totalSteps}
        </span>
      </div>

      {/* ── Main Content ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-32">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">

            {/* ═══ STEP 1: Daily Pacing ═══ */}
            {step === 1 && (
              <motion.div
                key="step-1"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="flex flex-col"
              >
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                  How do you like to<br />pace your days?
                </h1>
                <p className="mt-3 text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                  This determines how aggressively the AI schedules activities and downtime.
                </p>

                <div className="mt-10 flex flex-col gap-3">
                  {PACING_OPTIONS.map(({ value, label, desc }) => (
                    <OptionCard
                      key={value}
                      selected={dailyPacing === value}
                      onClick={() => updateProfile({ dailyPacing: value })}
                      label={label}
                      desc={desc}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ═══ STEP 2: Transport Preference ═══ */}
            {step === 2 && (
              <motion.div
                key="step-2"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="flex flex-col"
              >
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                  How do you prefer<br />to get around?
                </h1>
                <p className="mt-3 text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                  Instructs the AI on acceptable transit distances and preferred transport modes.
                </p>

                <div className="mt-10 flex flex-col gap-3">
                  {TRANSPORT_OPTIONS.map(({ value, label, desc }) => (
                    <OptionCard
                      key={value}
                      selected={transportPreference === value}
                      onClick={() => updateProfile({ transportPreference: value })}
                      label={label}
                      desc={desc}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ═══ STEP 3: Dining Style ═══ */}
            {step === 3 && (
              <motion.div
                key="step-3"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="flex flex-col"
              >
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                  What&apos;s your<br />dining style?
                </h1>
                <p className="mt-3 text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                  Determines if days are built around restaurant reservations or if food is fitted around activities.
                </p>

                <div className="mt-10 flex flex-col gap-3">
                  {DINING_OPTIONS.map(({ value, label, desc }) => (
                    <OptionCard
                      key={value}
                      selected={diningStyle === value}
                      onClick={() => updateProfile({ diningStyle: value })}
                      label={label}
                      desc={desc}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ═══ STEP 4: Ideal Start Time ═══ */}
            {step === 4 && (
              <motion.div
                key="step-4"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="flex flex-col"
              >
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                  When do you like<br />to start your day?
                </h1>
                <p className="mt-3 text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                  The earliest time you want your first scheduled activity to begin.
                </p>

                <div className="mt-10 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {START_TIME_OPTIONS.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => updateProfile({ idealStartTime: time })}
                      className={`rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-200 ${
                        idealStartTime === time
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-lg'
                          : 'bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ═══ STEP 5: App Appearance (Display Mode) ═══ */}
            {step === 5 && (
              <motion.div
                key="step-5"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="flex flex-col"
              >
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                  How should the<br />app look?
                </h1>
                <p className="mt-3 text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                  Choose your preferred display mode. This controls light and dark appearance across the entire app.
                </p>

                <div className="mt-10">
                  <DisplayModeToggle />
                </div>
              </motion.div>
            )}

            {/* ═══ STEP 6: Default Itinerary Aesthetic ═══ */}
            {step === 6 && (
              <motion.div
                key="step-6"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="flex flex-col"
              >
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                  Pick your default<br />itinerary style.
                </h1>
                <p className="mt-3 text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                  Every new trip will open in this layout. You can always change it per-trip.
                </p>

                <div className="mt-10">
                  <ThemeShowcase initialPreference="CLASSIC" />
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ── Navigation Footer ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-100 dark:border-slate-900 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-6 py-5">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-slate-100"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-full bg-slate-900 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:bg-slate-800 hover:shadow-xl active:scale-[0.97] dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              className="rounded-full bg-slate-900 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:bg-slate-800 hover:shadow-xl active:scale-[0.97] dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Complete ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reusable Option Card ──────────────────────────────────────────────────────

function OptionCard({
  selected,
  onClick,
  label,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full text-left rounded-xl px-5 py-4 transition-all duration-200 border ${
        selected
          ? 'border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800/50'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <span
            className={`block text-sm font-semibold ${
              selected
                ? 'text-slate-900 dark:text-slate-100'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {label}
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-slate-400 dark:text-slate-500">
            {desc}
          </span>
        </div>
        <div
          className={`shrink-0 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-200 ${
            selected
              ? 'border-slate-900 bg-slate-900 dark:border-slate-100 dark:bg-slate-100'
              : 'border-slate-300 dark:border-slate-600'
          }`}
        >
          {selected && (
            <svg
              className="h-3 w-3 text-white dark:text-slate-900"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}
