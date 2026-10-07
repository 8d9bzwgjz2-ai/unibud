export type ExternalContentSource =
  | "social"
  | "web"
  | "campus"
  | "creator";

export type BrowsingRequest = {
  requestId: string;
  source: ExternalContentSource;
  query?: string;
  limit?: number;
};

export type DiscoveredContent = {
  id: string;
  source: ExternalContentSource;
  title?: string;
  text?: string;
  mediaUrl?: string;
  sourceUrl: string;
  publishedAt?: string;
  authorName?: string;
};

export type BrowsingResult = {
  ok: boolean;
  items: DiscoveredContent[];
  source: ExternalContentSource;
  error?: string;
};

/**
 * Boundary for real browsing/integration providers.
 * It intentionally has no default fake implementation: a provider must be
 * connected before UNIBUD can claim that external content was discovered.
 */
export interface BrowsingProvider {
  discover(request: BrowsingRequest): Promise<BrowsingResult>;
}

export function emptyBrowsingResult(
  source: ExternalContentSource,
  error = "No browsing provider is connected.",
): BrowsingResult {
  return { ok: false, items: [], source, error };
}

export function normalizeDiscoveredContent(
  source: ExternalContentSource,
  items: DiscoveredContent[],
): DiscoveredContent[] {
  return items
    .filter((item) => item.id.trim() && item.sourceUrl.trim())
    .map((item) => ({ ...item, source }))
    .slice(0, 50);
}
