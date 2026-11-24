import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ACCESSIBILITY_PREFS,
  type AccessibilityNeed,
} from '@/shared/domain';

import {
  recommendedPrefsForNeeds,
  useAccessibilityStore,
} from './accessibilityStore';

describe('accessibilityStore', () => {
  it('recomenda recursos adequados para cada necessidade de acessibilidade', () => {
    const needs: AccessibilityNeed[] = ['visual', 'hearing', 'neurodivergent'];
    const rec = recommendedPrefsForNeeds(needs, DEFAULT_ACCESSIBILITY_PREFS);
    expect(rec.highContrast).toBe(true);
    expect(rec.largeText).toBe(true);
    expect(rec.visualAlerts).toBe(true);
    expect(rec.reducedMotion).toBe(true);
    expect(rec.dyslexiaFont).toBe(true);
  });

  it('atualiza e reseta preferências no store', () => {
    useAccessibilityStore.getState().setPrefs({ highContrast: true });
    expect(useAccessibilityStore.getState().prefs.highContrast).toBe(true);
    useAccessibilityStore.getState().reset();
    expect(useAccessibilityStore.getState().prefs).toEqual(
      DEFAULT_ACCESSIBILITY_PREFS,
    );
  });
});
