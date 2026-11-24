import { describe, expect, it } from 'vitest';
import { suggestedFeedbackBranch } from './workspace';

describe('suggestedFeedbackBranch', () => {
  it('gera branch curta em inglês com tag Jira', () => {
    expect(
      suggestedFeedbackBranch({
        id: 'abc12345',
        ticketKey: 'EV-12',
        kind: 'bug',
        title: 'Erro na Barra Lateral!',
      }),
    ).toBe('bugfix/ev-12-error-sidebar');

    expect(
      suggestedFeedbackBranch({
        id: '1',
        ticketKey: 'EV-1',
        kind: 'suggestion',
        title: 'Clicar esc para sair do modo tela cheia',
      }),
    ).toBe('feat/ev-1-esc-exit-screen');

    expect(
      suggestedFeedbackBranch({
        id: 'xyz999',
        kind: 'suggestion',
        title: '   ',
      }),
    ).toBe('feat/ev-xyz999');

    expect(
      suggestedFeedbackBranch({
        id: '1',
        ticketKey: 'EV-3',
        kind: 'complaint',
        title: 'Lentidão',
      }),
    ).toBe('fix/ev-3-slowness');

    expect(
      suggestedFeedbackBranch({
        id: '2',
        ticketKey: 'EV-4',
        kind: 'question',
        title: 'Dúvida',
      }),
    ).toBe('chore/ev-4-question');
  });
});
