// ─────────────────────────────────────────────────────────────────────────────
// TripIntakeForm — Pear Travel v2 → Phase 10 "Concierge" Revamp
// Luxury Typeform-style animated intake with framer-motion
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import {
  useState,
  useCallback,
  useEffect,
} from 'react';
import { useRouter } from 'next/navigation';
import { usePlacesWidget } from 'react-google-autocomplete';
import { DayPicker } from 'react-day-picker';
import type { DateRange } from 'react-day-picker';
import { format, differenceInCalendarDays } from 'date-fns';
import 'react-day-picker/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useTripStore, useHydratedTripStore } from '@/store/tripStore';
import type {
  BookingMode,
  DiningProfile,
  Interest,
  TripIntake,
  PrimaryTransitMode,
} from '@/types';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';

// ── Daily Transport (Phase 10 local-only state) ───────────────────────────────
type DailyTransport = 'Walk' | 'Public Transit' | 'Taxi/Uber';

const DAILY_TRANSPORT_OPTIONS: { value: DailyTransport; emoji: string; label: string }[] = [
  { value: 'Walk',           emoji: '🚶', label: 'Walk' },
  { value: 'Public Transit', emoji: '🚇', label: 'Public Transit' },
  { value: 'Taxi/Uber',      emoji: '🚕', label: 'Taxi / Uber' },
];

// ── Animation Variants ────────────────────────────────────────────────────────
const stepVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -20 },
};

const revealVariants = {
  hidden:  { opacity: 0, height: 0, marginTop: 0, overflow: 'hidden' as const },
  visible: { opacity: 1, height: 'auto', marginTop: 24, overflow: 'visible' as const },
};

const INTERESTS: { label: Interest; emoji: string }[] = [
  { label: 'History',             emoji: '🏛️' },
  { label: 'Food & Drink',        emoji: '🍽️' },
  { label: 'Art & Culture',       emoji: '🎨' },
  { label: 'Off the Beaten Path', emoji: '🧭' },
  { label: 'Nightlife',           emoji: '🌙' },
  { label: 'Architecture',        emoji: '🏗️' },
  { label: 'Nature & Parks',      emoji: '🌿' },
  { label: 'Shopping',            emoji: '🛍️' },
  { label: 'Music & Theatre',     emoji: '🎭' },
  { label: 'Sport',               emoji: '⚽' },
];

const DINING_PROFILES: {
  value:       DiningProfile;
  label:       string;
  emoji:       string;
  description: string;
}[] = [
  { value: 'packed-lunch', label: 'Packed Lunch', emoji: '🥪', description: 'Self-catered — no restaurant lunches' },
  { value: 'budget',       label: 'Budget Eats',  emoji: '🍜', description: 'Street food & cafés, under £15/meal' },
  { value: 'mid-range',    label: 'Mid-Range',    emoji: '🍝', description: 'Bistros & restaurants, £15–40/meal' },
  { value: 'fine-dining',  label: 'Fine Dining',  emoji: '🍷', description: 'Upscale & tasting menus, £40+/meal' },
];

const MIN_DURATION = 1;
const MAX_DURATION = 30;
const MIN_BUDGET   = 50;
const MAX_BUDGET   = 50_000;

interface FormErrors {
  destination?:   string;
  dateRange?:     string;
  duration?:      string;
  interests?:     string;
  budgetGBP?:     string;
  accommodation?: string;
  transitMode?:   string;
}

function validateForm(fields: Partial<TripIntake>, bookingMode: BookingMode): FormErrors {
  const errors: FormErrors = {};

  if (!fields.destination?.trim() || fields.destination.trim().length < 2) {
    errors.destination = 'Please select a destination from the suggestions.';
  }

  if (bookingMode === 'booked') {
    if (!fields.startDate || !fields.endDate) {
      errors.dateRange = 'Please select your arrival and departure dates.';
    }
  } else {
    if (!fields.duration || fields.duration < MIN_DURATION) {
      errors.duration = `Minimum stay is ${MIN_DURATION} day.`;
    } else if (fields.duration > MAX_DURATION) {
      errors.duration = `Maximum stay is ${MAX_DURATION} days.`;
    }
  }

  if (!fields.interests || fields.interests.length === 0) {
    errors.interests = 'Please select at least one interest.';
  }

  if (!fields.budgetGBP || fields.budgetGBP < MIN_BUDGET) {
    errors.budgetGBP = `Minimum budget is £${MIN_BUDGET}.`;
  } else if (fields.budgetGBP > MAX_BUDGET) {
    errors.budgetGBP = `Maximum budget is £${MAX_BUDGET.toLocaleString('en-GB')}.`;
  }

  if (fields.accommodation !== undefined && fields.accommodation.trim() === '') {
    errors.accommodation = 'Please enter your location or toggle it off.';
  }

  return errors;
}

function FieldWrapper({ label, htmlFor, error, hint, children, className = '' }: { label: string; htmlFor?: string; error?: string; hint?: string; children: React.ReactNode; className?: string; }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={htmlFor} className="text-base font-medium tracking-tight text-zinc-800 dark:text-zinc-100">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-sm text-zinc-400 dark:text-zinc-500">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-red-500">
          <span aria-hidden="true">⚠</span>{error}
        </p>
      )}
    </div>
  );
}

function inputClass(hasError: boolean): string {
  return [
    'w-full rounded-2xl border-0 bg-zinc-50 dark:bg-zinc-900 px-5 py-4',
    'text-base text-zinc-900 dark:text-zinc-100',
    'placeholder-zinc-300 dark:placeholder-zinc-700 shadow-none transition-all duration-200 outline-none',
    'ring-1 ring-inset focus:ring-2 focus:ring-brand-500',
    hasError ? 'ring-red-400 focus:ring-red-400' : 'ring-zinc-200 dark:ring-zinc-800 hover:ring-zinc-300 dark:hover:ring-zinc-700',
  ].join(' ');
}

function BookingModeToggle({ value, onChange }: { value: BookingMode; onChange: (mode: BookingMode) => void; }) {
  const options: { mode: BookingMode; label: string; sub: string }[] = [
    { mode: 'planning', label: 'Just Planning 🗺️', sub: 'Choose number of days' },
    { mode: 'booked', label: 'Already Booked ✈️', sub: 'Select exact dates' },
  ];

  return (
    <div role="group" className="flex rounded-2xl bg-zinc-100 dark:bg-zinc-900 p-1.5 gap-1.5">
      {options.map(({ mode, label, sub }) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`flex flex-1 flex-col items-center rounded-xl px-4 py-3.5 text-sm font-medium transition-all duration-200 ${
              value === mode
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
        >
          {label}
          <span className="mt-1 text-xs font-normal opacity-60">{sub}</span>
        </button>
      ))}
    </div>
  );
}

function DateRangePicker({ range, onChange, error }: { range: DateRange | undefined; onChange: (range: DateRange | undefined) => void; error?: string; }) {
  const [isOpen, setIsOpen] = useState(false);
  const nightCount = range?.from && range?.to ? differenceInCalendarDays(range.to, range.from) : null;
  const displayText = range?.from ? (range.to ? `${format(range.from, 'd MMM yyyy')}  →  ${format(range.to, 'd MMM yyyy')}` : `${format(range.from, 'd MMM yyyy')}  →  Select end date`) : 'Select arrival & departure dates';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`flex w-full items-center justify-between rounded-2xl bg-zinc-50 dark:bg-zinc-900 px-5 py-4 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 ring-1 ring-inset ${error ? 'ring-red-400' : 'ring-zinc-200 dark:ring-zinc-800 hover:ring-zinc-300 dark:hover:ring-zinc-700'}`}
      >
        <div className="flex items-center gap-3">
          <svg className="h-5 w-5 flex-shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" /></svg>
          <span className={`text-base ${range?.from ? 'font-medium text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-600'}`}>{displayText}</span>
        </div>
        {nightCount !== null && <span className="flex-shrink-0 rounded-full bg-brand-100 dark:bg-brand-900 px-3 py-1 text-xs font-medium text-brand-700 dark:text-brand-300">{nightCount} night{nightCount !== 1 ? 's' : ''}</span>}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
            <DayPicker
              mode="range"
              selected={range}
              onSelect={(r) => { onChange(r); if (r?.from && r?.to) setIsOpen(false); }}
              disabled={{ before: new Date() }}
              numberOfMonths={2}
              className="p-3 relative z-50"
              classNames={{
                day_selected:     'bg-brand-600 text-white rounded-full',
                day_range_middle: 'bg-brand-100 dark:bg-brand-900 text-brand-800 dark:text-brand-200 rounded-none',
                day_range_start:  'bg-brand-600 text-white rounded-l-full',
                day_range_end:    'bg-brand-600 text-white rounded-r-full',
                day_today:        'font-bold text-brand-600 dark:text-brand-400',
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function PlacesAutocompleteInput({ id, value, onPlaceSelected, onInputChange, placeholder, error, types = ['(cities)'] }: { id: string; value: string; onPlaceSelected: (address: string, placeId?: string) => void; onInputChange: (value: string) => void; placeholder: string; error?: string; types?: string[]; }) {
  const { ref } = usePlacesWidget<HTMLInputElement>({
    apiKey: GOOGLE_API_KEY,
    onPlaceSelected: (place) => onPlaceSelected(place.formatted_address ?? place.name ?? '', place.place_id),
    options: { types, fields: ['formatted_address', 'place_id', 'name', 'geometry'] },
  });
  return <input ref={ref} id={id} type="text" value={value} onChange={(e) => onInputChange(e.target.value)} placeholder={placeholder} className={inputClass(!!error)} aria-invalid={!!error} />;
}

// ── HYDRATION WRAPPER ──
// This ensures the form doesn't render until Zustand has loaded the memory,
// preventing weird glitches where old destinations override new ones.
export default function TripIntakeForm() {
  const hydratedIntake = useHydratedTripStore((state) => state.intake);

  if (!hydratedIntake) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-sm text-zinc-400 dark:text-zinc-500 font-medium">Preparing your concierge…</p>
        </div>
      </div>
    );
  }

  return <IntakeFormContent initialIntake={hydratedIntake} />;
}

function IntakeFormContent({ initialIntake }: { initialIntake: TripIntake }) {
  const router = useRouter();
  
  const setIntake = useTripStore((state) => state.setIntake);
  const setAllPOIs = useTripStore((state) => state.setAllPOIs);
  const setItinerary = useTripStore((state) => state.setItinerary);
  const setCurrentTripId = useTripStore((state) => state.setCurrentTripId);

  const [step, setStep] = useState(1);
  const maxStep = 3;

  // Form State
  const [bookingMode, setBookingMode] = useState<BookingMode>(initialIntake.bookingMode ?? 'planning');
  const [destination, setDestination] = useState(initialIntake.destination);
  const [destPlaceId, setDestPlaceId] = useState(initialIntake.destinationPlaceId ?? '');
  
  // ── FIX 4: DEBOUNCED DESTINATION STATE ──
  const [debouncedDestination, setDebouncedDestination] = useState(initialIntake.destination);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    initialIntake.startDate && initialIntake.endDate
      ? { from: new Date(initialIntake.startDate), to: new Date(initialIntake.endDate) }
      : undefined
  );
  
  // Transit State
  const [transitMode, setTransitMode] = useState<PrimaryTransitMode>(initialIntake.transitDetails?.mode || 'Not Sure');
  const [outboundTime, setOutboundTime] = useState(initialIntake.transitDetails?.outbound?.time || '');
  const [outboundRef, setOutboundRef] = useState(initialIntake.transitDetails?.outbound?.reference || '');
  const [returnTime, setReturnTime] = useState(initialIntake.transitDetails?.return?.time || '');
  const [returnRef, setReturnRef] = useState(initialIntake.transitDetails?.return?.reference || '');

  const [duration, setDuration] = useState(initialIntake.duration || 3);
  const [accommodation, setAccommodation] = useState(initialIntake.accommodation);
  const [hasAccommodation, setHasAccommodation] = useState(Boolean(initialIntake.accommodation?.trim()));
  const [interests, setInterests] = useState<Interest[]>(initialIntake.interests || []);
  const [budgetGBP, setBudgetGBP] = useState(initialIntake.budgetGBP || 1000);
  const [budgetRaw, setBudgetRaw] = useState(initialIntake.budgetGBP > 0 ? String(initialIntake.budgetGBP) : '1000');
  const [diningProfile, setDiningProfile] = useState<DiningProfile>(initialIntake.diningProfile ?? 'mid-range');
  const [anchorPoints, setAnchorPoints] = useState(initialIntake.anchorPoints ?? '');

  // ── NEW: Daily Transport local state (Phase 10) ──
  const [dailyTransport, setDailyTransport] = useState<DailyTransport>('Public Transit');

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const derivedDuration = dateRange?.from && dateRange?.to ? Math.max(1, differenceInCalendarDays(dateRange.to, dateRange.from)) : duration;

  // Are dates selected? (used for conditional transit reveal in booked mode)
  const hasDatesSelected = Boolean(dateRange?.from && dateRange?.to);

  // ── FIX 4: APPLY 500ms DEBOUNCE EFFECT ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDestination(destination);
    }, 500);
    return () => clearTimeout(timer);
  }, [destination]);

  // ── MASSIVE setIntake EFFECT (PRESERVED — with dailyTransport hack) ──
  // State Hack: Append dailyTransport to anchorPoints so the AI prompt engine reads it
  useEffect(() => {
    const transportTag = `[Daily Transport Preference: ${dailyTransport}]`;
    const cleanedAnchors = anchorPoints.replace(/\[Daily Transport Preference:.*?\]/g, '').trim();
    const finalAnchors = cleanedAnchors ? `${cleanedAnchors}\n${transportTag}` : transportTag;

    setIntake({
      destination: debouncedDestination.trim(),
      destinationPlaceId: destPlaceId || undefined,
      bookingMode,
      startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      transitDetails: bookingMode === 'booked' ? {
        mode: transitMode,
        outbound: outboundTime || outboundRef ? { time: outboundTime, reference: outboundRef } : undefined,
        return: returnTime || returnRef ? { time: returnTime, reference: returnRef } : undefined,
      } : undefined,
      duration: derivedDuration,
      accommodation: hasAccommodation ? accommodation.trim() : '',
      interests,
      budgetGBP,
      diningProfile,
      anchorPoints: finalAnchors,
    });
  }, [
    bookingMode, debouncedDestination, destPlaceId, dateRange, transitMode, outboundTime, outboundRef, returnTime, returnRef,
    derivedDuration, accommodation, hasAccommodation, interests, budgetGBP, diningProfile, anchorPoints, dailyTransport, setIntake
  ]);

  const toggleInterest = useCallback((interest: Interest) => {
    setInterests((prev) => prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]);
    setErrors((prev) => ({ ...prev, interests: undefined }));
  }, []);

  const handleBudgetChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const parsed = parseInt(raw, 10);
    setBudgetRaw(raw);
    setBudgetGBP(isNaN(parsed) ? 0 : parsed);
    setErrors((prev) => ({ ...prev, budgetGBP: undefined }));
  }, []);

  const handleBookingModeChange = useCallback((mode: BookingMode) => {
    setBookingMode(mode);
    setErrors((prev) => ({ ...prev, dateRange: undefined, transitMode: undefined, duration: undefined }));
  }, []);

  const validateStep = useCallback((currentStep: number) => {
    const toValidate: Partial<TripIntake> = {
      destination: debouncedDestination,
      duration: derivedDuration,
      startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      transitDetails: bookingMode === 'booked' ? { mode: transitMode } : undefined,
      interests,
      budgetGBP,
      accommodation: hasAccommodation ? accommodation.trim() : '',
    };

    const validationErrors = validateForm(toValidate, bookingMode);
    const stepErrors: FormErrors = {};

    if (currentStep === 1) {
      stepErrors.destination = validationErrors.destination;
      stepErrors.dateRange = validationErrors.dateRange;
      stepErrors.duration = validationErrors.duration;
    }
    if (currentStep === 2) {
      stepErrors.interests = validationErrors.interests;
      stepErrors.budgetGBP = validationErrors.budgetGBP;
    }
    if (currentStep === 3 && hasAccommodation) {
      stepErrors.accommodation = validationErrors.accommodation;
    }

    setErrors(stepErrors);
    return Object.values(stepErrors).some(Boolean) === false;
  }, [ bookingMode, debouncedDestination, dateRange, transitMode, derivedDuration, interests, budgetGBP, hasAccommodation, accommodation ]);

  const handleNext = useCallback(() => {
    if (step === maxStep) return;
    if (validateStep(step)) {
      setStep((s) => Math.min(maxStep, s + 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step, maxStep, validateStep]);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step < maxStep) return handleNext();

    if (!validateStep(3)) return;

    setIsSubmitting(true);
    try {
      const mockTripId = `trip-${Date.now()}`;
      setCurrentTripId(mockTripId);
      router.push(`/discover/${mockTripId}`);
    } catch (err) {
      console.error('Failed to start trip:', err);
      setIsSubmitting(false);
    }
  }, [step, maxStep, handleNext, validateStep, setCurrentTripId, router]);

  const stepLabels = ['Basics & Logistics', 'The Vibe', 'Accommodation & Anchors'];

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col min-h-[70vh]">

      {/* ── Inline Horizontal Stepper ── */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {stepLabels.map((label, i) => {
          const stepNum = i + 1;
          const isActive = step === stepNum;
          const isComplete = step > stepNum;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && (
                <div className={`h-px w-6 flex-shrink-0 transition-colors duration-300 ${isComplete ? 'bg-brand-500' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
              )}
              <button
                type="button"
                onClick={() => { if (isComplete) setStep(stepNum); }}
                disabled={!isComplete}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all duration-300 ${
                  isActive
                    ? 'text-zinc-900 dark:text-white font-medium'
                    : isComplete
                    ? 'text-brand-600 dark:text-brand-400 cursor-pointer hover:text-brand-700'
                    : 'text-zinc-400 dark:text-zinc-500 cursor-default'
                }`}
              >
                <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                  isActive
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                    : isComplete
                    ? 'bg-brand-600 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                }`}>{stepNum}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Step Content with AnimatePresence ── */}
      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">

          {/* ═══ STEP 1: BASICS & LOGISTICS ═══ */}
          {step === 1 && (
            <motion.div
              key="step-1"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex flex-col gap-10"
            >
              <FieldWrapper label="How are you planning this trip?">
                <BookingModeToggle value={bookingMode} onChange={handleBookingModeChange} />
              </FieldWrapper>

              <FieldWrapper label="Where are you heading? 📍" error={errors.destination} hint="Start typing a city — select from the suggestions.">
                <PlacesAutocompleteInput
                  id="destination"
                  value={destination}
                  onPlaceSelected={(address, placeId) => {
                    if (placeId && placeId !== destPlaceId) { setAllPOIs([]); setItinerary(null); }
                    setDestination(address);
                    setDestPlaceId(placeId ?? '');
                    setErrors((prev) => ({ ...prev, destination: undefined }));
                  }}
                  onInputChange={(val) => { setDestination(val); setErrors((prev) => ({ ...prev, destination: undefined })); }}
                  placeholder="e.g. Barcelona, Tokyo, Cape Town…"
                  error={errors.destination}
                />
              </FieldWrapper>

              {bookingMode === 'booked' ? (
                <>
                  <FieldWrapper label="When are you travelling? 📅" error={errors.dateRange} hint="Select arrival & departure dates.">
                    <DateRangePicker range={dateRange} onChange={(r) => { setDateRange(r); setErrors((prev) => ({ ...prev, dateRange: undefined })); }} error={errors.dateRange} />
                  </FieldWrapper>

                  {/* Conditional transit reveal — only after dates selected */}
                  <AnimatePresence>
                    {hasDatesSelected && (
                      <motion.div
                        key="transit-section"
                        variants={revealVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        transition={{ duration: 0.4, ease: 'easeInOut' }}
                      >
                        <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 p-6">
                          <FieldWrapper label="How are you getting there?" error={errors.transitMode} hint="We'll schedule your first and last day around this.">
                            <div className="flex gap-2">
                              {(['Flight', 'Train', 'Car / Other', 'Not Sure'] as PrimaryTransitMode[]).map((mode) => (
                                <button key={mode} type="button" onClick={() => setTransitMode(mode)}
                                  className={`flex-1 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                                    transitMode === mode
                                      ? 'bg-brand-600 text-white'
                                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 ring-1 ring-inset ring-zinc-200 dark:ring-zinc-700 hover:ring-brand-300'
                                  }`}
                                >{mode}</button>
                              ))}
                            </div>
                          </FieldWrapper>

                          {/* Flight/Train details */}
                          <AnimatePresence>
                            {(transitMode === 'Flight' || transitMode === 'Train') && (
                              <motion.div key="flight-train" variants={revealVariants} initial="hidden" animate="visible" exit="hidden" transition={{ duration: 0.3 }}>
                                <div className="grid md:grid-cols-2 gap-6 pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-800">
                                  <div className="space-y-3">
                                    <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Outbound {transitMode}</h4>
                                    <div className="flex gap-3">
                                      <div className="flex-1">
                                        <label className="block text-xs font-medium text-zinc-500 mb-1">Number / Ref</label>
                                        <input type="text" placeholder={transitMode === 'Flight' ? 'e.g. BA314' : 'e.g. 1A2B3C'} value={outboundRef} onChange={(e) => setOutboundRef(e.target.value)} className={inputClass(false) + ' py-2.5 text-sm'} />
                                      </div>
                                      <div className="w-28">
                                        <label className="block text-xs font-medium text-zinc-500 mb-1">Arrival Time</label>
                                        <input type="time" value={outboundTime} onChange={(e) => setOutboundTime(e.target.value)} className={inputClass(false) + ' py-2.5 text-sm px-2'} />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Return {transitMode}</h4>
                                    <div className="flex gap-3">
                                      <div className="flex-1">
                                        <label className="block text-xs font-medium text-zinc-500 mb-1">Number / Ref</label>
                                        <input type="text" placeholder={transitMode === 'Flight' ? 'e.g. BA315' : 'e.g. 1A2B3C'} value={returnRef} onChange={(e) => setReturnRef(e.target.value)} className={inputClass(false) + ' py-2.5 text-sm'} />
                                      </div>
                                      <div className="w-28">
                                        <label className="block text-xs font-medium text-zinc-500 mb-1">Depart Time</label>
                                        <input type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} className={inputClass(false) + ' py-2.5 text-sm px-2'} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                            {transitMode === 'Car / Other' && (
                              <motion.div key="car-other" variants={revealVariants} initial="hidden" animate="visible" exit="hidden" transition={{ duration: 0.3 }}>
                                <div className="grid md:grid-cols-2 gap-6 pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-800">
                                  <FieldWrapper label="Estimated Arrival Time">
                                    <input type="time" value={outboundTime} onChange={(e) => setOutboundTime(e.target.value)} className={inputClass(false) + ' py-2.5 w-36'} />
                                  </FieldWrapper>
                                  <FieldWrapper label="Estimated Departure Time">
                                    <input type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} className={inputClass(false) + ' py-2.5 w-36'} />
                                  </FieldWrapper>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <FieldWrapper label="How many days? 📅" htmlFor="duration" error={errors.duration} hint={`Between ${MIN_DURATION} and ${MAX_DURATION} days.`}>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => setDuration((d) => Math.max(MIN_DURATION, d - 1))} disabled={duration <= MIN_DURATION} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-2xl font-medium text-zinc-600 dark:text-zinc-300 transition-all hover:bg-brand-100 hover:text-brand-600 dark:hover:bg-brand-900/40 disabled:opacity-30">−</button>
                    <input id="duration" type="number" value={duration} onChange={(e) => { const val = parseInt(e.target.value, 10); if (!isNaN(val)) { setDuration(Math.min(MAX_DURATION, Math.max(MIN_DURATION, val))); setErrors((prev) => ({ ...prev, duration: undefined })); } }} min={MIN_DURATION} max={MAX_DURATION} className="flex-1 rounded-2xl bg-zinc-50 dark:bg-zinc-900 px-4 py-4 text-center text-2xl font-medium text-zinc-900 dark:text-zinc-100 ring-1 ring-inset ring-zinc-200 dark:ring-zinc-800 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                    <button type="button" onClick={() => setDuration((d) => Math.min(MAX_DURATION, d + 1))} disabled={duration >= MAX_DURATION} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-2xl font-medium text-zinc-600 dark:text-zinc-300 transition-all hover:bg-brand-100 hover:text-brand-600 dark:hover:bg-brand-900/40 disabled:opacity-30">+</button>
                  </div>
                </FieldWrapper>
              )}
            </motion.div>
          )}

          {/* ═══ STEP 2: THE VIBE ═══ */}
          {step === 2 && (
            <motion.div
              key="step-2"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex flex-col gap-10"
            >
              <FieldWrapper label="What are your interests? 🎯" error={errors.interests} hint="Select everything that appeals — we'll curate your POIs around these.">
                <div id="interests" className="flex flex-wrap gap-3 pt-1">
                  {INTERESTS.map(({ label, emoji }) => {
                    const isSelected = interests.includes(label);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleInterest(label)}
                        className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 ring-offset-2 ring-2 ring-zinc-900 dark:ring-white'
                            : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <span aria-hidden="true" className="text-base">{emoji}</span>{label}
                      </button>
                    );
                  })}
                </div>
              </FieldWrapper>

              <div className="grid gap-8 md:grid-cols-2 md:gap-6">
                <FieldWrapper label="What's your total budget? 💷" htmlFor="budgetGBP" error={errors.budgetGBP} hint="Excluding flights. We'll keep daily spend within this.">
                  <div className="relative">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5"><span className="text-lg font-semibold text-slate-500 dark:text-slate-400">£</span></div>
                    <input id="budgetGBP" type="text" inputMode="numeric" value={budgetRaw} onChange={handleBudgetChange} className={inputClass(!!errors.budgetGBP) + ' pl-10 pr-28 text-lg font-semibold'} aria-invalid={!!errors.budgetGBP} />
                    {budgetGBP > 0 && <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-5"><span className="text-sm font-semibold text-slate-400 dark:text-slate-500">{budgetGBP.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })}</span></div>}
                  </div>
                </FieldWrapper>

                <FieldWrapper label="What's your food style? 🍴" hint="Determines dining suggestions in your itinerary.">
                  <div className="grid grid-cols-2 gap-3">
                    {DINING_PROFILES.map(({ value, label, emoji }) => {
                      const isSelected = diningProfile === value;
                      return (
                        <button key={value} type="button" onClick={() => setDiningProfile(value)} className={`flex flex-col items-start gap-1.5 rounded-2xl p-4 text-left transition-all duration-200 ${isSelected ? 'bg-brand-50 dark:bg-brand-950 ring-2 ring-brand-500' : 'bg-zinc-50 dark:bg-zinc-900 ring-1 ring-inset ring-zinc-200 dark:ring-zinc-800 hover:ring-brand-300'}`}>
                          <span className="text-2xl" aria-hidden="true">{emoji}</span>
                          <span className={`text-sm font-medium leading-snug ${isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-zinc-700 dark:text-zinc-200'}`}>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </FieldWrapper>
              </div>

              {/* ── NEW: Daily Transport Preference ── */}
              <FieldWrapper label="How do you prefer to get around daily? 🚶" hint="Helps us plan realistic transit between activities.">
                <div className="flex gap-3">
                  {DAILY_TRANSPORT_OPTIONS.map(({ value, emoji, label }) => {
                    const isSelected = dailyTransport === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setDailyTransport(value)}
                        className={`flex-1 flex flex-col items-center gap-2 rounded-2xl py-5 transition-all duration-200 ${
                          isSelected
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                            : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 ring-1 ring-inset ring-zinc-200 dark:ring-zinc-800 hover:ring-brand-300'
                        }`}
                      >
                        <span className="text-3xl">{emoji}</span>
                        <span className="text-sm font-semibold">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </FieldWrapper>
            </motion.div>
          )}

          {/* ═══ STEP 3: ACCOMMODATION & ANCHORS ═══ */}
          {step === 3 && (
            <motion.div
              key="step-3"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex flex-col gap-10"
            >
              {/* Accommodation toggle */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 px-6 py-5">
                <div>
                  <p className="text-base font-medium text-zinc-800 dark:text-zinc-100">
                    {derivedDuration === 1 ? 'Do you know your arrival point?' : 'Have you booked accommodation?'}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Used as your daily start/end point.</p>
                </div>
                <div className="flex rounded-xl bg-zinc-200/60 dark:bg-zinc-800 p-1 shrink-0 w-full sm:w-auto">
                  <button type="button" onClick={() => { setHasAccommodation(true); setErrors((prev) => ({ ...prev, accommodation: undefined })); }}
                    className={`flex-1 sm:flex-none px-8 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${hasAccommodation ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                  >Yes</button>
                  <button type="button" onClick={() => { setHasAccommodation(false); setAccommodation(''); setErrors((prev) => ({ ...prev, accommodation: undefined })); }}
                    className={`flex-1 sm:flex-none px-8 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${!hasAccommodation ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                  >No</button>
                </div>
              </div>

              <AnimatePresence>
                {hasAccommodation && (
                  <motion.div key="accommodation-input" variants={revealVariants} initial="hidden" animate="visible" exit="hidden" transition={{ duration: 0.3 }}>
                    <FieldWrapper label={derivedDuration === 1 ? 'Where are you arriving? 🚉' : 'Where are you staying? 🏨'} error={errors.accommodation} hint={derivedDuration === 1 ? 'Enter your train station, airport, or car park.' : 'Enter your hotel, apartment, or area.'}>
                      <PlacesAutocompleteInput id="accommodation" value={accommodation} onPlaceSelected={(address) => { setAccommodation(address); setErrors((prev) => ({ ...prev, accommodation: undefined })); }} onInputChange={(val) => { setAccommodation(val); setErrors((prev) => ({ ...prev, accommodation: undefined })); }} placeholder={derivedDuration === 1 ? 'e.g. Cambridge Railway Station…' : 'e.g. Hotel Arts Barcelona…'} types={derivedDuration === 1 ? ['transit_station', 'geocode'] : ['establishment', 'geocode']} error={errors.accommodation} />
                    </FieldWrapper>
                  </motion.div>
                )}
              </AnimatePresence>

              <FieldWrapper label="Anchor Points & Hard Constraints 📌" htmlFor="anchorPoints" hint="Pre-booked tours or non-negotiable activities.">
                <textarea id="anchorPoints" value={anchorPoints} onChange={(e) => setAnchorPoints(e.target.value)} placeholder={'e.g.\n• Sagrada Família booked: Day 2, 10:00–12:00\n• Must visit Camp Nou on Day 3'} rows={5} className="w-full resize-none rounded-2xl bg-zinc-50 dark:bg-zinc-900 px-5 py-4 text-base leading-relaxed text-zinc-900 dark:text-zinc-100 placeholder-zinc-300 dark:placeholder-zinc-700 ring-1 ring-inset ring-zinc-200 dark:ring-zinc-800 focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
                <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 px-4 py-3.5">
                  <span className="mt-0.5 flex-shrink-0 text-base" aria-hidden="true">⚠️</span>
                  <p className="text-sm leading-relaxed text-amber-700 dark:text-amber-400"><strong>Hard constraints:</strong> The AI will never schedule another activity during any blocked time windows you specify above.</p>
                </div>
              </FieldWrapper>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Navigation Buttons ── */}
      <div className="flex items-center justify-between gap-4 pt-8 mt-auto">
        {step > 1 ? (
          <button type="button" onClick={handleBack} className="inline-flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 px-8 py-4 text-base font-medium text-zinc-700 dark:text-zinc-200 transition-all duration-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-brand-500">
            ← Back
          </button>
        ) : <div />}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-brand-600 hover:bg-brand-700 text-white text-base sm:text-lg font-medium rounded-full transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2"><span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Starting…</span>
          ) : step === maxStep ? (
            'Start Planning 🍐'
          ) : (
            `Next: ${stepLabels[step]} →`
          )}
        </button>
      </div>
    </form>
  );
}