import { NextResponse } from "next/server";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const NEG_TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 500;

type CacheEntry = { url: string | null; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function cacheGet(key: string): CacheEntry | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, hit);
  return hit;
}

function cacheSet(key: string, url: string | null) {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, {
    url,
    expiresAt: Date.now() + (url ? CACHE_TTL_MS : NEG_TTL_MS),
  });
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const PH_GQL_ENDPOINT = "https://api.producthunt.com/v2/api/graphql";

async function phQuery<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  const token = process.env.PH_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(PH_GQL_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: T };
    return json.data ?? null;
  } catch {
    return null;
  }
}

async function resolveByPhApi(name: string): Promise<string | null> {
  const candidates = slugCandidates(name);
  if (candidates.length === 0) return null;
  const query = `query GetPost($slug: String!) { post(slug: $slug) { thumbnail { url } } }`;
  for (const slug of candidates) {
    const data = await phQuery<{ post?: { thumbnail?: { url?: string } } }>(query, { slug });
    const url = data?.post?.thumbnail?.url;
    if (url) return url;
  }
  return null;
}

function slugCandidates(name: string): string[] {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[.']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  if (!base) return [];
  const noSpaces = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const set = new Set<string>();
  set.add(base);
  if (noSpaces && noSpaces !== base) set.add(noSpaces);
  const stripped = base.replace(/-(ai|app|io|hq|labs)$/, "");
  if (stripped !== base) set.add(stripped);
  return [...set];
}

async function resolveProductHuntIcon(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    for (const match of html.matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    )) {
      const raw = match[1].trim();
      try {
        const parsed = JSON.parse(raw);
        const found = findProductImage(parsed);
        if (found) return found;
      } catch {
        // skip malformed json-ld
      }
    }

    const og = html.match(
      /<meta[^>]*property="og:image"[^>]*content="([^"]+)"[^>]*>/i,
    );
    if (og) return decodeHtmlEntities(og[1]);

    return null;
  } catch {
    return null;
  }
}

function findProductImage(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const v = findProductImage(item);
      if (v) return v;
    }
    return null;
  }
  const obj = node as Record<string, unknown>;
  const t = obj["@type"];
  const isProduct = Array.isArray(t)
    ? t.some((v) => typeof v === "string" && /product|application/i.test(v))
    : typeof t === "string" && /product|application/i.test(t);
  if (isProduct && typeof obj.image === "string") return obj.image;
  if (isProduct && Array.isArray(obj.image) && typeof obj.image[0] === "string") {
    return obj.image[0] as string;
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") {
      const inner = findProductImage(v);
      if (inner) return inner;
    }
  }
  return null;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function faviconUrl(website: string, size = 128): string | null {
  try {
    const withProto = website.startsWith("http") ? website : `https://${website}`;
    const host = new URL(withProto).hostname.replace(/^www\./, "");
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`;
  } catch {
    return null;
  }
}

function unwrapWayback(url: string): string {
  const m = url.match(/^https?:\/\/web\.archive\.org\/web\/\d+[^/]*\/(https?:\/\/.+)$/);
  return m ? m[1] : url;
}

async function resolveViaWayback(slug: string): Promise<string | null> {
  const url = `https://web.archive.org/web/2/https://www.producthunt.com/products/${slug}`;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    for (const match of html.matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    )) {
      try {
        const parsed = JSON.parse(match[1].trim());
        const img = findProductImage(parsed);
        if (img) return unwrapWayback(img);
      } catch {
        // skip
      }
    }
    const og = html.match(
      /<meta[^>]*property="og:image"[^>]*content="([^"]+)"[^>]*>/i,
    );
    if (og) return unwrapWayback(decodeHtmlEntities(og[1]));
    return null;
  } catch {
    return null;
  }
}

async function resolveByName(name: string): Promise<string | null> {
  for (const slug of slugCandidates(name)) {
    const icon = await resolveViaWayback(slug);
    if (icon) return icon;
  }
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ph = searchParams.get("ph");
  const web = searchParams.get("web");
  const name = searchParams.get("name");

  if (!ph && !web && !name) {
    return NextResponse.json({ error: "missing ph, web, or name param" }, { status: 400 });
  }

  const cacheKey = `${ph ?? ""}|${web ?? ""}|${name ?? ""}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    if (cached.url) return NextResponse.redirect(cached.url, 302);
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let resolved: string | null = null;

  if (name) {
    resolved = await resolveByPhApi(name);
  }
  if (!resolved && ph && /^https?:\/\/(www\.)?producthunt\.com\//i.test(ph)) {
    resolved = await resolveProductHuntIcon(ph);
  }
  if (!resolved && name) {
    resolved = await resolveByName(name);
  }
  if (!resolved && web) {
    resolved = faviconUrl(web);
  }

  cacheSet(cacheKey, resolved);

  if (resolved) return NextResponse.redirect(resolved, 302);
  return NextResponse.json({ error: "not found" }, { status: 404 });
}
