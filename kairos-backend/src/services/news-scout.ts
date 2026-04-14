/**
 * News Scout — crypto headlines from major RSS feeds.
 */

export interface NewsArticle {
    title: string;
    link: string;
    description: string;
    pubDate: string;
    source: string;
    sourceKey?: string;
    category?: string;
    timeAgo: string;
}

export interface NewsResponse {
    articles: NewsArticle[];
    totalCount: number;
    sources: string[];
    fetchedAt: string;
}

export interface TrendingResult {
    timestamp: string;
    trade_count: number;
    base_volume: string;
    counter_volume: string;
    avg: string;
    high: string;
    low: string;
    open: string;
    close: string;
}

const RSS_FEEDS: { url: string; source: string }[] = [
    { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk" },
    { url: "https://cointelegraph.com/rss", source: "Cointelegraph" },
    { url: "https://decrypt.co/feed", source: "Decrypt" },
    { url: "https://bitcoinmagazine.com/.rss/full/rss", source: "Bitcoin Magazine" },
    { url: "https://blockworks.co/feed", source: "Blockworks" },
    { url: "https://beincrypto.com/feed/", source: "BeInCrypto" },
];

function stripHtml(s: string): string {
    return s
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function extractTag(block: string, tag: string): string {
    const cdata = new RegExp(
        `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
        "i"
    );
    const mC = block.match(cdata);
    if (mC) return stripHtml(mC[1]);

    const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
    const mP = block.match(plain);
    if (mP) return stripHtml(mP[1]);
    return "";
}

function parseRssItems(xml: string, defaultSource: string): NewsArticle[] {
    const out: NewsArticle[] = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/gi;
    let m: RegExpExecArray | null;
    while ((m = itemRe.exec(xml)) !== null) {
        const block = m[1];
        const title = extractTag(block, "title");
        const link =
            extractTag(block, "link") ||
            extractTag(block, "guid") ||
            extractTag(block, "atom:link");
        let pubDate = extractTag(block, "pubDate") || extractTag(block, "dc:date");
        if (!title || !link) continue;

        if (!pubDate) pubDate = new Date().toISOString();
        const d = new Date(pubDate);
        const time = Number.isNaN(d.getTime()) ? new Date() : d;

        const description =
            extractTag(block, "description") ||
            extractTag(block, "content:encoded") ||
            "";

        out.push({
            title,
            link: link.trim(),
            description: description.slice(0, 400),
            pubDate: time.toISOString(),
            source: defaultSource,
            timeAgo: formatTimeAgo(time),
        });
    }
    return out;
}

async function fetchRssFeed(url: string, source: string, timeoutMs = 12000): Promise<NewsArticle[]> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            signal: ctrl.signal,
            headers: {
                "User-Agent": "KairosNewsBot/1.0 (+https://github.com/kairos)",
                Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
            },
        });
        if (!res.ok) {
            console.warn(`[News Scout] RSS ${source} HTTP ${res.status}`);
            return [];
        }
        const xml = await res.text();
        return parseRssItems(xml, source);
    } catch (e) {
        console.warn(`[News Scout] RSS ${source} failed:`, (e as Error)?.message || e);
        return [];
    } finally {
        clearTimeout(t);
    }
}

async function fetchHeadlinesFromRss(maxItems: number): Promise<NewsArticle[]> {
    const batches = await Promise.all(RSS_FEEDS.map((f) => fetchRssFeed(f.url, f.source)));
    const merged = batches.flat();
    const seen = new Set<string>();
    const deduped: NewsArticle[] = [];
    for (const a of merged) {
        const key = a.link.split("?")[0].toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(a);
    }
    deduped.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    return deduped.slice(0, maxItems);
}

function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
}

function matchesQuery(text: string, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const words = q.split(/\s+/).filter(Boolean);
    const hay = text.toLowerCase();
    return words.every((w) => hay.includes(w));
}

function matchesAnyPattern(text: string, patterns: RegExp[]): boolean {
    return patterns.some((re) => re.test(text));
}

/**
 * Latest crypto headlines (RSS).
 */
export async function getLatestNews(limit: number = 10): Promise<NewsResponse | null> {
    console.log(`[News Scout] Fetching crypto headlines (RSS, limit ${limit})…`);
    const articles = await fetchHeadlinesFromRss(Math.max(limit * 3, 24));
    if (articles.length === 0) {
        console.error("[News Scout] No RSS headlines available");
        return null;
    }
    const slice = articles.slice(0, limit);
    const sources = [...new Set(slice.map((a) => a.source))];
    return {
        articles: slice,
        totalCount: slice.length,
        sources,
        fetchedAt: new Date().toISOString(),
    };
}

/**
 * Headline search: keyword filter on RSS pool.
 */
export async function searchNews(query: string, limit: number = 10): Promise<NewsResponse | null> {
    const trimmed = query.trim();
    const pool = await fetchHeadlinesFromRss(60);
    const filtered = pool.filter((a) =>
        matchesQuery(`${a.title} ${a.description}`, trimmed)
    );
    const articles = (filtered.length > 0 ? filtered : pool).slice(0, limit);
    if (articles.length === 0) return null;

    return {
        articles,
        totalCount: articles.length,
        sources: [...new Set(articles.map((a) => a.source))],
        fetchedAt: new Date().toISOString(),
    };
}

const DEFI_PATTERNS = [
    /\bdefi\b/i,
    /\bdex\b/i,
    /\bstaking\b/i,
    /\byield\b/i,
    /\blending\b/i,
    /\bliquidity\b/i,
    /\baave\b/i,
    /\bcurve\b/i,
    /\buniswap\b/i,
    /\bvault\b/i,
    /\bblend\b/i,
];

/**
 * DeFi-oriented headlines (keyword filter on RSS pool).
 */
export async function getDefiNews(limit: number = 10): Promise<NewsResponse | null> {
    const pool = await fetchHeadlinesFromRss(80);
    const defi = pool.filter((a) => matchesAnyPattern(`${a.title} ${a.description}`, DEFI_PATTERNS));
    const articles = (defi.length > 0 ? defi : pool).slice(0, limit);
    if (articles.length === 0) return getLatestNews(limit);

    return {
        articles,
        totalCount: articles.length,
        sources: [...new Set(articles.map((a) => a.source))],
        fetchedAt: new Date().toISOString(),
    };
}

const BTC_PATTERNS = [/\bbitcoin\b/i, /\bbtc\b/i, /\bhalving\b/i, /\bspot etf\b/i];

/**
 * Bitcoin-focused headlines (keyword filter; falls back to general headlines).
 */
export async function getBitcoinNews(limit: number = 5): Promise<NewsResponse | null> {
    const pool = await fetchHeadlinesFromRss(60);
    const btc = pool.filter((a) => matchesAnyPattern(`${a.title} ${a.description}`, BTC_PATTERNS));
    const articles = (btc.length > 0 ? btc : pool).slice(0, limit);
    if (articles.length === 0) return getLatestNews(limit);

    return {
        articles,
        totalCount: articles.length,
        sources: [...new Set(articles.map((a) => a.source))],
        fetchedAt: new Date().toISOString(),
    };
}

const BREAKING_PATTERNS = [
    /\bbreaking\b/i,
    /\burgent\b/i,
    /\bcrash\b/i,
    /\bsurge\b/i,
    /\brally\b/i,
    /\bhack\b/i,
    /\bexploit\b/i,
    /\blawsuit\b/i,
    /\bsec\b/i,
    /\bapproved\b/i,
    /\breject/i,
];

/** Recent high-signal headlines (keyword bump, else newest). */
export async function getBreakingNews(): Promise<NewsResponse | null> {
    const pool = await fetchHeadlinesFromRss(40);
    const urgent = pool.filter((a) =>
        matchesAnyPattern(`${a.title} ${a.description}`, BREAKING_PATTERNS)
    );
    const pick = (urgent.length >= 3 ? urgent : pool).slice(0, 5);
    if (pick.length === 0) return getLatestNews(5);

    return {
        articles: pick,
        totalCount: pick.length,
        sources: [...new Set(pick.map((a) => a.source))],
        fetchedAt: new Date().toISOString(),
    };
}

/**
 * Trending topics.
 */
export async function getTrendingTopics(): Promise<TrendingResult | null> {
    return null;
}

export function formatNewsResponse(news: NewsResponse): string {
    const lines: string[] = [];
    lines.push("### Headlines");
    lines.push("");

    for (const article of news.articles.slice(0, 10)) {
        lines.push(`• **${article.title}** _(${article.source} · ${article.timeAgo})_`);
        if (article.description) lines.push(`  ${article.description.slice(0, 220)}${article.description.length > 220 ? "…" : ""}`);
        lines.push(`  🔗 ${article.link}`);
        lines.push("");
    }

    lines.push(`_Updated ${new Date(news.fetchedAt).toLocaleString()}_`);
    return lines.join("\n");
}

export function formatTrendingTopics(trending: TrendingResult | null): string {
    if (!trending) return "No trending topics available right now.";
    return `📈 Trending activity detected (last hour)\n• Trades: ${trending.trade_count}\n• Average: ${trending.avg}`;
}
