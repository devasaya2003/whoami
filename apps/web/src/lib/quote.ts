export type TechQuote = {
	text: string;
	author: string;
};

type GeekQuoteResponse = {
	quote?: unknown;
	author?: unknown;
};

const QUOTE_URL = "https://geek-quote-api.vercel.app/v1/quote";

/** Random geek/tech quote. Returns null on failure so callers can fall back. */
export async function fetchTechQuote(): Promise<TechQuote | null> {
	try {
		const response = await fetch(QUOTE_URL, {
			headers: { Accept: "application/json" },
			signal: AbortSignal.timeout(2500),
		});
		if (!response.ok) return null;

		const data = (await response.json()) as GeekQuoteResponse;
		const text = typeof data.quote === "string" ? data.quote.trim() : "";
		if (!text) return null;

		const author =
			typeof data.author === "string" && data.author.trim()
				? data.author.trim()
				: "Unknown";

		return { text, author };
	} catch {
		return null;
	}
}

export function formatTechQuote(quote: TechQuote): string {
	return `“${quote.text}” — ${quote.author}`;
}
