import { logger } from "../utils/logger";

export async function webSearch(input: Record<string, unknown>): Promise<string> {
  const { query, numResults } = input as { query: string; numResults?: number };
  if (!query) return "Error: No query provided";

  const count = numResults || 5;

  try {
    const response = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ChatAgents/1.0)",
        },
      }
    );

    if (!response.ok) {
      return `Search failed: HTTP ${response.status}`;
    }

    const html = await response.text();
    const results: Array<{ title: string; url: string; snippet: string }> = [];

    const resultRegex = /<a rel="nofollow" class="result__a" href="([^"]+)".*?>(.*?)<\/a>/g;
    const snippetRegex = /<a class="result__snippet"[^>]*>(.*?)<\/a>/g;

    let match: RegExpExecArray | null;
    while ((match = resultRegex.exec(html)) !== null && results.length < count) {
      const url = match[1] ?? "";
      const title = (match[2] ?? "").replace(/<[^>]+>/g, "");

      const snippetMatch = snippetRegex.exec(html);
      const snippet = snippetMatch ? (snippetMatch[1] ?? "").replace(/<[^>]+>/g, "") : "";

      results.push({ title, url, snippet });
    }

    if (results.length === 0) {
      return "No search results found.";
    }

    return JSON.stringify(results, null, 2);
  } catch (error) {
    logger.error("Web search failed", error as Error);
    return `Error performing web search: ${(error as Error).message}`;
  }
}