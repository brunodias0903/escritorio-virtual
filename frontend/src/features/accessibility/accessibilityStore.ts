import { create } from 'zustand';

import {
  AccessibilityPrefsSchema,
  DEFAULT_ACCESSIBILITY_PREFS,
  type AccessibilityNeed,
  type AccessibilityPrefs,
} from '@/shared/domain';

const STORAGE_KEY = 'voffice:a11y:v1';

export function applyAccessibilityAttributes(prefs: AccessibilityPrefs): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.highContrast = prefs.highContrast ? 'true' : 'false';
  root.dataset.reducedMotion = prefs.reducedMotion ? 'true' : 'false';
  root.dataset.largeText = prefs.largeText ? 'true' : 'false';
  root.dataset.dyslexiaFont = prefs.dyslexiaFont ? 'true' : 'false';
  root.dataset.colorblind = prefs.colorblindMode;
}

/** Recomenda recursos de acessibilidade com base nas necessidades privadas informadas. */
export function recommendedPrefsForNeeds(
  needs: readonly AccessibilityNeed[],
  base: AccessibilityPrefs = DEFAULT_ACCESSIBILITY_PREFS,
): AccessibilityPrefs {
  const next = { ...base };
  if (needs.includes('visual')) {
    next.highContrast = true;
    next.largeText = true;
  }
  if (needs.includes('colorblind') && next.colorblindMode === 'none') {
    next.colorblindMode = 'deuteranopia';
    next.highContrast = true;
  }
  if (needs.includes('hearing')) {
    next.visualAlerts = true;
  }
  if (needs.includes('neurodivergent')) {
    next.reducedMotion = true;
    next.dyslexiaFont = true;
  }
  return next;
}

function readInitial(): AccessibilityPrefs {
  if (typeof window === 'undefined') return DEFAULT_ACCESSIBILITY_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ACCESSIBILITY_PREFS;
    const parsed = AccessibilityPrefsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_ACCESSIBILITY_PREFS;
  } catch {
    return DEFAULT_ACCESSIBILITY_PREFS;
  }
}

type AccessibilityState = {
  prefs: AccessibilityPrefs;
  setPrefs: (patch: Partial<AccessibilityPrefs>) => void;
  hydrate: (prefs: AccessibilityPrefs) => void;
  reset: () => void;
};

export const useAccessibilityStore = create<AccessibilityState>((set, get) => {
  const initial = readInitial();
  applyAccessibilityAttributes(initial);

  const persist = (next: AccessibilityPrefs) => {
    applyAccessibilityAttributes(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignora
    }
    set({ prefs: next });
  };

  return {
    prefs: initial,
    setPrefs: (patch) => persist({ ...get().prefs, ...patch }),
    hydrate: (prefs) => persist(prefs),
    reset: () => persist({ ...DEFAULT_ACCESSIBILITY_PREFS }),
  };
});
