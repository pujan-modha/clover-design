export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  markdown?: string;
}

export interface SearchAdapter {
  search(query: string, options?: { limit?: number; includeRaw?: boolean }): Promise<{
    results: SearchResult[];
    note?: string;
  }>;
}

/** DuckDuckGo Lite scraper (no API key required) */
export class DuckDuckGoAdapter implements SearchAdapter {
  async search(query: string, options?: { limit?: number }) {
    try {
      const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; DesignForge/1.0)" },
      });
      const html = await res.text();

      const results: SearchResult[] = [];
      const linkRegex = /<a[^>]*class="result-link"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
      let match;
      while ((match = linkRegex.exec(html)) !== null && results.length < (options?.limit ?? 5)) {
        const url = match[1];
        const title = match[2].replace(/<[^>]*>/g, "").trim();
        results.push({ title, url, snippet: "" });
      }

      return { results, note: `Found ${results.length} results via DuckDuckGo` };
    } catch (err) {
      return { results: [], note: `DuckDuckGo search failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
}

/** Tavily search adapter (requires API key) */
export class TavilyAdapter implements SearchAdapter {
  constructor(private apiKey: string) {}

  async search(query: string, options?: { limit?: number; includeRaw?: boolean }) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: this.apiKey,
          query,
          max_results: options?.limit ?? 5,
          search_depth: "basic",
          include_answer: false,
          include_raw_content: options?.includeRaw ?? false,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { results: [], note: `Tavily error: ${data.error || res.statusText}` };
      }

      const results: SearchResult[] = (data.results ?? []).map((r: any) => ({
        title: r.title || "Untitled",
        url: r.url,
        snippet: r.content || "",
        markdown: r.raw_content,
      }));

      return { results, note: `Found ${results.length} results via Tavily` };
    } catch (err) {
      return { results: [], note: `Tavily search failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
}

/** Brave search adapter (requires API key) */
export class BraveAdapter implements SearchAdapter {
  constructor(private apiKey: string) {}

  async search(query: string, options?: { limit?: number }) {
    try {
      const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${options?.limit ?? 5}`, {
        headers: {
          "Accept": "application/json",
          "X-Subscription-Token": this.apiKey,
        },
      });
      const data = await res.json();

      if (!res.ok) {
        return { results: [], note: `Brave error: ${data.error || res.statusText}` };
      }

      const results: SearchResult[] = (data.web?.results ?? []).map((r: any) => ({
        title: r.title || "Untitled",
        url: r.url,
        snippet: r.description || "",
      }));

      return { results, note: `Found ${results.length} results via Brave` };
    } catch (err) {
      return { results: [], note: `Brave search failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
}

/** Firecrawl search adapter (requires API key) */
export class FirecrawlAdapter implements SearchAdapter {
  constructor(private apiKey: string) {}

  async search(query: string, options?: { limit?: number; includeRaw?: boolean }) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          query,
          limit: options?.limit ?? 5,
          formats: options?.includeRaw ? ["markdown"] : ["snippet"],
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        return { results: [], note: `Firecrawl error: ${data.error || res.statusText}` };
      }

      const results: SearchResult[] = (data.data ?? []).map((r: any) => ({
        title: r.title || "Untitled",
        url: r.url,
        snippet: r.description || r.snippet || "",
        markdown: r.markdown,
      }));

      return { results, note: `Found ${results.length} results via Firecrawl` };
    } catch (err) {
      return { results: [], note: `Firecrawl search failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
}

/** Search provider manager that tries multiple adapters */
export class SearchProvider {
  private adapters: SearchAdapter[];

  constructor(config: {
    tavilyKey?: string;
    braveKey?: string;
    firecrawlKey?: string;
    fallback?: boolean;
  } = {}) {
    this.adapters = [];
    if (config.tavilyKey) this.adapters.push(new TavilyAdapter(config.tavilyKey));
    if (config.braveKey) this.adapters.push(new BraveAdapter(config.braveKey));
    if (config.firecrawlKey) this.adapters.push(new FirecrawlAdapter(config.firecrawlKey));
    if (config.fallback !== false) this.adapters.push(new DuckDuckGoAdapter());
  }

  async search(query: string, options?: { limit?: number; includeRaw?: boolean }) {
    for (const adapter of this.adapters) {
      const result = await adapter.search(query, options);
      if (result.results.length > 0) return result;
    }
    return { results: [], note: "No results found from any search provider." };
  }
}
