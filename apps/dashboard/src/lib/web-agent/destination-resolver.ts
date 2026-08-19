import type { WebAgentPageContext } from './page-context';

type Destination = WebAgentPageContext['navigation'][number];

export type DestinationResolution =
  | { kind: 'resolved'; destination: Destination; score: number; match: MatchKind }
  | { kind: 'ambiguous'; candidates: Destination[] }
  | {
      kind: 'none';
      reason?: 'no_destinations' | 'no_query' | 'below_threshold';
      topScore?: number;
      closestLabel?: string;
    };

type MatchKind = 'title' | 'alias' | 'path' | 'fuzzy';

const fillerWords = new Set([
  'a',
  'about',
  'an',
  'and',
  'app',
  'are',
  'at',
  'back',
  'be',
  'bring',
  'can',
  'could',
  'download',
  'did',
  'do',
  'does',
  'explain',
  'for',
  'from',
  'go',
  'get',
  'head',
  'help',
  'hi',
  'how',
  'i',
  'in',
  'inside',
  'install',
  'into',
  'is',
  'it',
  'its',
  'lead',
  'let',
  'like',
  'me',
  'mobile',
  'move',
  'much',
  'my',
  'navigate',
  'need',
  'now',
  'of',
  'on',
  'open',
  'our',
  'page',
  'pages',
  'place',
  'pleace',
  'please',
  'plz',
  'redirect',
  'redirects',
  'redirecting',
  'route',
  'routes',
  'routing',
  'screen',
  'screens',
  'send',
  'show',
  'somewhere',
  'switch',
  'tab',
  'tabs',
  'take',
  'tell',
  'the',
  'this',
  'there',
  'through',
  'to',
  'up',
  'us',
  'visit',
  'want',
  'was',
  'were',
  'what',
  'where',
  'would',
  'you',
  'your',
]);

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function meaningfulTokens(value: string): string[] {
  return normalize(value)
    .split(' ')
    .filter((token) => token.length >= 2 && !fillerWords.has(token));
}

function canonicalToken(value: string): string {
  const norm = value.toLowerCase();
  if (
    norm === 'againt' ||
    norm === 'aganit' ||
    norm === 'agabt' ||
    norm === 'agant' ||
    norm === 'agent' ||
    norm === 'agents'
  ) {
    return 'agent';
  }
  if (norm === 'fellet' || norm === 'fleat' || norm === 'fllet' || norm === 'fleet' || norm === 'fleets') {
    return 'fleet';
  }
  if (norm === 'marchant' || norm === 'merchent' || norm === 'merchant' || norm === 'merchants') {
    return 'merchant';
  }
  if (norm === 'supr' || norm === 'super') {
    return 'super';
  }
  if (norm === 'admn' || norm === 'admin' || norm === 'admins') {
    return 'admin';
  }
  if (norm === 'conection' || norm === 'conections' || norm === 'connection' || norm === 'connections') {
    return 'connection';
  }
  if (
    norm === 'inbox' ||
    norm === 'conversation' ||
    norm === 'conversations' ||
    norm === 'message' ||
    norm === 'messages'
  ) {
    return 'inbox';
  }
  if (norm === 'setting' || norm === 'settings') {
    return 'setting';
  }
  return value.length > 4 && value.endsWith('s') && !value.endsWith('ss')
    ? value.slice(0, -1)
    : value;
}

function editDistance(left: string, right: string): number {
  const rows = Array.from({ length: left.length + 1 }, () =>
    Array.from({ length: right.length + 1 }, () => 0),
  );
  for (let row = 0; row <= left.length; row += 1) rows[row]![0] = row;
  for (let column = 0; column <= right.length; column += 1) rows[0]![column] = column;
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const substitution = left[row - 1] === right[column - 1] ? 0 : 1;
      rows[row]![column] = Math.min(
        rows[row - 1]![column]! + 1,
        rows[row]![column - 1]! + 1,
        rows[row - 1]![column - 1]! + substitution,
      );
      if (
        row > 1 &&
        column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      ) {
        rows[row]![column] = Math.min(
          rows[row]![column]!,
          rows[row - 2]![column - 2]! + substitution,
        );
      }
    }
  }
  return rows[left.length]![right.length]!;
}

function navigationSubject(message: string): string {
  const patterns = [
    /\b(?:go|send)(?:\s+me)?(?:\s+back)?\s+to\s+(.+)/i,
    /\b(?:take|bring)\s+me(?:\s+back)?\s+to\s+(.+)/i,
    /\b(?:navigate|head|switch|redirect|route)(?:\s+me)?\s+(?:back\s+)?to\s+(.+)/i,
    /\bvisit(?:\s+the)?\s+(.+)/i,
    /\bopen(?:\s+the)?\s+(.+)/i,
    /\b(?:redirect|take|lead|move|switch)\s+(?:this\s+)?(?:me\s+)?(?:to\s+)?(.+)/i,
  ];
  const subject = patterns.map((pattern) => message.match(pattern)?.[1]).find(Boolean) ?? message;
  return subject.split(/\b(?:and|then|so that|because)\b/i, 1)[0] ?? subject;
}

function pathTerms(destination: Destination): string[] {
  try {
    return new URL(destination.url).pathname.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return [];
  }
}

function scoreTerm(
  queryPhrase: string,
  queryTokens: string[],
  term: string,
  source: Exclude<MatchKind, 'fuzzy'>,
): { score: number; match: MatchKind } {
  const normalizedTerm = normalize(term);
  const termTokens = meaningfulTokens(term);
  if (!normalizedTerm || termTokens.length === 0) return { score: 0, match: source };
  const sourceBonus = source === 'title' ? 4 : source === 'alias' ? 3 : 1;
  if (queryPhrase === normalizedTerm) {
    return { score: source === 'title' ? 100 : source === 'alias' ? 96 : 92, match: source };
  }
  let score = 0;
  let fuzzy = false;
  for (const queryToken of queryTokens) {
    let best = 0;
    for (const termToken of termTokens) {
      if (queryToken === termToken) {
        best = Math.max(best, source === 'path' ? 10 : 14 + sourceBonus);
        continue;
      }
      if (canonicalToken(queryToken) === canonicalToken(termToken)) {
        best = Math.max(best, source === 'path' ? 9 : 12 + sourceBonus);
        continue;
      }
      if (queryToken.length < 3 || termToken.length < 3) continue;
      const distance = editDistance(canonicalToken(queryToken), canonicalToken(termToken));
      const longest = Math.max(queryToken.length, termToken.length);
      const allowed = longest >= 7 ? 2 : 1;
      if (distance <= allowed) {
        best = Math.max(best, (source === 'path' ? 8 : 10 + sourceBonus) - (distance - 1) * 2);
        fuzzy = true;
      }
    }
    score += best;
  }
  return { score, match: fuzzy ? 'fuzzy' : source };
}

/**
 * Resolves only against host-advertised destinations. Fuzzy matching repairs bounded human typos;
 * close candidates fail as ambiguous instead of allowing the model or browser to guess a route.
 */
export function resolveDestination(
  message: string,
  pageContext: WebAgentPageContext | undefined,
  mode: 'navigation' | 'information',
): DestinationResolution {
  if (!pageContext?.navigation.length) return { kind: 'none', reason: 'no_destinations' };
  const subject = mode === 'navigation' ? navigationSubject(message) : message;
  const queryTokens = meaningfulTokens(subject);
  const queryPhrase = queryTokens.join(' ');
  if (!queryPhrase) return { kind: 'none', reason: 'no_query' };

  let currentPortal = '';
  try {
    if (pageContext?.url) {
      const path = new URL(pageContext.url).pathname;
      if (path.startsWith('/admin')) currentPortal = '/admin';
      else if (path.startsWith('/store')) currentPortal = '/store';
      else if (path.startsWith('/app')) currentPortal = '/app';
    }
  } catch {}

  const scored = pageContext.navigation
    .map((destination) => {
      const terms: Array<{ value: string; source: Exclude<MatchKind, 'fuzzy'> }> = [
        { value: destination.label, source: 'title' },
        ...(destination.aliases ?? []).map((value) => ({ value, source: 'alias' as const })),
        ...pathTerms(destination).map((value) => ({ value, source: 'path' as const })),
      ];
      const matches = terms.map(({ value, source }) =>
        scoreTerm(queryPhrase, queryTokens, value, source),
      );
      const best = matches.sort((left, right) => right.score - left.score)[0] ?? {
        score: 0,
        match: 'title' as const,
      };

      let bonus = 0;
      try {
        const destPath = new URL(destination.url).pathname;
        if (currentPortal && destPath.startsWith(currentPortal)) {
          bonus = 15;
        }
      } catch {}

      return { destination, score: best.score + (best.score > 0 ? bonus : 0), match: best.match };
    })
    .sort(
      (left, right) =>
        right.score - left.score || left.destination.label.localeCompare(right.destination.label),
    );
  const ranked = scored.filter(({ score }) => score >= 10);

  const best = ranked[0];
  if (!best) {
    return {
      kind: 'none',
      reason: 'below_threshold',
      ...(scored[0]
        ? { topScore: scored[0].score, closestLabel: scored[0].destination.label }
        : {}),
    };
  }
  const runnerUp = ranked[1];
  if (runnerUp && best.score - runnerUp.score < 5) {
    return {
      kind: 'ambiguous',
      candidates: ranked
        .filter(({ score }) => best.score - score < 5)
        .map(({ destination }) => destination),
    };
  }
  return {
    kind: 'resolved',
    destination: best.destination,
    score: best.score,
    match: best.match,
  };
}
