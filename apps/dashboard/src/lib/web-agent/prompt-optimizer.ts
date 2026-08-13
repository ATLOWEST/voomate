import type { WebAgentPageContext } from './page-context';

export interface PromptCompactionMetrics {
  beforeTokens: number;
  afterTokens: number;
  savedTokens: number;
}

export function approximateTokens(value: unknown): number {
  return Math.ceil(JSON.stringify(value).length / 4);
}

function truncate(value: string, length: number): string {
  return value.length <= length ? value : `${value.slice(0, length - 1).trimEnd()}…`;
}

export function compactPromptContext(args: {
  history: readonly { role: 'visitor' | 'agent'; content: string }[];
  knowledge: readonly { title: string; url: string | null; content: string }[];
  pageContext?: WebAgentPageContext;
}): {
  history: Array<{ role: 'visitor' | 'agent'; content: string }>;
  knowledge: Array<{ title: string; url: string | null; content: string }>;
  pageContext?: Partial<WebAgentPageContext>;
  metrics: PromptCompactionMetrics;
} {
  const beforeTokens = approximateTokens(args);
  const seen = new Set<string>();
  const knowledge = args.knowledge
    .filter((item) => {
      const key = item.content.trim().toLowerCase().slice(0, 180);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4)
    .map((item) => ({
      ...item,
      title: truncate(item.title, 160),
      content: truncate(item.content, 1_300),
    }));
  const history = args.history
    .slice(-8)
    .map((turn) => ({ ...turn, content: truncate(turn.content, 1_000) }));
  const pageContext = args.pageContext
    ? {
        url: args.pageContext.url,
        title: truncate(args.pageContext.title, 180),
        description: truncate(args.pageContext.description, 500),
        headings: args.pageContext.headings.slice(0, 5).map((heading) => truncate(heading, 160)),
        navigation: args.pageContext.navigation.slice(0, 10).map((item) => ({
          label: truncate(item.label, 100),
          url: item.url,
          description: item.description ? truncate(item.description, 180) : undefined,
          aliases: item.aliases?.slice(0, 5),
          facts: item.facts?.slice(0, 5).map((fact) => truncate(fact, 220)),
        })),
        surface: args.pageContext.surface,
        businessSummary: args.pageContext.businessSummary
          ? truncate(args.pageContext.businessSummary, 500)
          : undefined,
      }
    : undefined;
  const result = { history, knowledge, pageContext };
  const afterTokens = approximateTokens(result);
  return {
    ...result,
    metrics: { beforeTokens, afterTokens, savedTokens: beforeTokens - afterTokens },
  };
}
