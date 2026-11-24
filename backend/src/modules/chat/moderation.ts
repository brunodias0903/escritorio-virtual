/**
 * Moderação de chat:
 * - Censura de palavrões, abreviações ofensivas e termos abusivos (blacklist)
 * - Bloqueio imediato de discurso de ódio / discriminação grave
 * - Sistema progressivo de avisos e restrição temporária (mute) por reincidência
 * - Filtro anti-spam (rajadas, repetição/flood e excesso de links)
 */

const SEVERE_HATE_TERMS = [
  'macaco',
  'crioulo',
  'preto imundo',
  'viadinho',
  'bichinha',
  'traveco',
  'sapatao',
  'aleijado',
  'retardado',
  'mongoloide',
  'nazista',
  'hitler',
  'suicida',
  'se mata',
  'vai se matar',
];

const PROFANITY_TERMS = [
  'fdp',
  'pqp',
  'vsf',
  'vtnc',
  'tnc',
  'krl',
  'crl',
  'caralho',
  'porra',
  'puta',
  'putaria',
  'filho da puta',
  'arrombado',
  'desgracado',
  'cuzao',
  'merda',
  'bosta',
  'cacete',
  'foda',
  'foder',
  'fodase',
  'foda-se',
  'otario',
  'babaca',
  'imbecil',
  'idiota',
  'vagabundo',
  'vagabunda',
  'piranha',
  'corno',
  'escroto',
  'escrota',
  'lixo humano',
];

const LEET_MAP: Record<string, string> = {
  '@': 'a',
  '4': 'a',
  '3': 'e',
  '1': 'i',
  '!': 'i',
  '0': 'o',
  $: 's',
  '5': 's',
  '7': 't',
};

/** Normaliza acentos, caixa, leetspeak e letras repetidas (ex.: "pooooorra" -> "pora"). */
export const normalizeForModeration = (text: string): string => {
  const noAccents = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const deLeet = noAccents.replace(/[@431!0$57]/g, (ch) => LEET_MAP[ch] ?? ch);
  return deLeet.replace(/(.)\1{2,}/g, '$1$1');
};

const escapeRegex = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Constrói regex tolerante a acentos/repetições para censura preservando o resto do texto. */
const buildWordRegex = (term: string): RegExp => {
  const pattern = term
    .split('')
    .map((ch) => (ch === ' ' ? '\\s+' : `${escapeRegex(ch)}+`))
    .join('');
  return new RegExp(`(?<![a-z0-9])${pattern}(?![a-z0-9])`, 'gi');
};

const HATE_PATTERNS = SEVERE_HATE_TERMS.map((t) => ({
  term: t,
  re: buildWordRegex(t),
}));

const PROFANITY_PATTERNS = PROFANITY_TERMS.map((t) => ({
  term: t,
  re: buildWordRegex(t),
}));

export type TextModerationResult = {
  text: string;
  censored: boolean;
  severeHate: boolean;
};

/** Analisa e censura termos da blacklist, diferenciando palavrões de discurso de ódio grave. */
export const moderateText = (rawText: string): TextModerationResult => {
  const normalized = normalizeForModeration(rawText);

  for (const { re } of HATE_PATTERNS) {
    re.lastIndex = 0;
    if (re.test(normalized)) {
      return { text: rawText, censored: true, severeHate: true };
    }
  }

  let censored = false;
  let output = rawText;

  // Censura palavra a palavra comparando a forma normalizada de cada token
  const tokens = rawText.split(/(\s+)/);
  const mapped = tokens.map((token) => {
    if (!token.trim()) return token;
    const normToken = normalizeForModeration(token).replace(
      /^[^a-z0-9]+|[^a-z0-9]+$/g,
      '',
    );
    if (!normToken) return token;
    const matched = PROFANITY_PATTERNS.some(({ re }) => {
      re.lastIndex = 0;
      return re.test(normToken);
    });
    if (matched) {
      censored = true;
      return '***';
    }
    return token;
  });

  if (censored) {
    output = mapped.join('');
  } else {
    // Checa expressões compostas (ex.: "filho da puta", "foda-se")
    for (const { re } of PROFANITY_PATTERNS) {
      re.lastIndex = 0;
      if (re.test(normalized)) {
        censored = true;
        output = rawText.replace(re, '***');
        if (output === rawText) output = '***';
        break;
      }
    }
  }

  return { text: output, censored, severeHate: false };
};

// --- Anti-spam & restrição progressiva por abuso verbal ----------------------

const BURST_WINDOW_MS = 10_000;
const BURST_MAX_MESSAGES = 5;
const DUPLICATE_WINDOW_MS = 30_000;
const DUPLICATE_MAX_COUNT = 3;
const SPAM_COOLDOWN_MS = 60_000;
const ABUSE_STRIKE_WINDOW_MS = 15 * 60_000;
const ABUSE_MUTE_THRESHOLD = 3;
const ABUSE_MUTE_MS = 5 * 60_000;
const MAX_URLS_PER_MESSAGE = 3;

type UserModerationState = {
  recentTimes: number[];
  recentTexts: Array<{ text: string; at: number }>;
  abuseStrikes: number[];
  mutedUntil: number;
  spamCooldownUntil: number;
};

export type ChatModerationDecision =
  | { allowed: true; text: string; warning?: string }
  | { allowed: false; code: string };

/**
 * Controla anti-spam e reincidência de abuso verbal por usuário em memória.
 */
export class ChatModerator {
  private readonly users = new Map<string, UserModerationState>();

  private stateOf(email: string): UserModerationState {
    let state = this.users.get(email);
    if (!state) {
      state = {
        recentTimes: [],
        recentTexts: [],
        abuseStrikes: [],
        mutedUntil: 0,
        spamCooldownUntil: 0,
      };
      this.users.set(email, state);
    }
    return state;
  }

  evaluate(
    email: string,
    rawText: string,
    now: number,
  ): ChatModerationDecision {
    const state = this.stateOf(email);

    if (state.mutedUntil > now) {
      return { allowed: false, code: 'chat_muted' };
    }
    if (state.spamCooldownUntil > now) {
      return { allowed: false, code: 'spam_blocked' };
    }

    // 1. Filtro anti-spam (flood de caracteres, excesso de links, rajada e repetição)
    if (/(.)\1{19,}/.test(rawText)) {
      return { allowed: false, code: 'spam_blocked' };
    }
    const urls = rawText.match(/https?:\/\/\S+/gi) ?? [];
    if (urls.length > MAX_URLS_PER_MESSAGE) {
      return { allowed: false, code: 'spam_blocked' };
    }

    state.recentTimes = state.recentTimes.filter(
      (t) => now - t < BURST_WINDOW_MS,
    );
    if (state.recentTimes.length >= BURST_MAX_MESSAGES) {
      state.spamCooldownUntil = now + SPAM_COOLDOWN_MS;
      return { allowed: false, code: 'spam_blocked' };
    }

    const normDup = rawText.trim().toLowerCase();
    state.recentTexts = state.recentTexts.filter(
      (entry) => now - entry.at < DUPLICATE_WINDOW_MS,
    );
    const sameCount = state.recentTexts.filter(
      (entry) => entry.text === normDup,
    ).length;
    if (sameCount >= DUPLICATE_MAX_COUNT - 1) {
      state.spamCooldownUntil = now + SPAM_COOLDOWN_MS;
      return { allowed: false, code: 'spam_blocked' };
    }

    // 2. Blacklist (discurso de ódio bloqueado imediatamente; palavrões censurados + strike)
    const mod = moderateText(rawText);
    if (mod.severeHate) {
      state.abuseStrikes = state.abuseStrikes.filter(
        (t) => now - t < ABUSE_STRIKE_WINDOW_MS,
      );
      state.abuseStrikes.push(now);
      if (state.abuseStrikes.length >= ABUSE_MUTE_THRESHOLD) {
        state.mutedUntil = now + ABUSE_MUTE_MS;
        return { allowed: false, code: 'chat_muted' };
      }
      return { allowed: false, code: 'hate_speech_blocked' };
    }

    state.recentTimes.push(now);
    state.recentTexts.push({ text: normDup, at: now });

    if (mod.censored) {
      state.abuseStrikes = state.abuseStrikes.filter(
        (t) => now - t < ABUSE_STRIKE_WINDOW_MS,
      );
      state.abuseStrikes.push(now);
      if (state.abuseStrikes.length >= ABUSE_MUTE_THRESHOLD) {
        state.mutedUntil = now + ABUSE_MUTE_MS;
        return { allowed: false, code: 'chat_muted' };
      }
      return {
        allowed: true,
        text: mod.text,
        warning: 'verbal_abuse_warning',
      };
    }

    return { allowed: true, text: rawText };
  }
}
