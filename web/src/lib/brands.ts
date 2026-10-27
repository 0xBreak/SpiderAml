// Venue brand marks. Exchange/DEX names come as free text from CoinGecko
// tickers (e.g. "Uniswap V3 (Ethereum)", "Coinbase Exchange"), so lookup is
// by normalized name with a letter-avatar fallback for unknown venues.
//
// Assets (all vendored under /public/brand/venues, no external requests):
// - *.svg: Simple Icons (CC0) — Binance, KuCoin, OKX (white variant for the dark theme).
// - *.png/*.jpg: official venue logos via CoinGecko's image CDN, nominative use.
// Trademarks belong to their owners; icons only identify the venue.

const VENUE_ICON: Record<string, string> = {
  binance: "/brand/venues/binance.svg",
  "binance us": "/brand/venues/binance-us.png",
  coinbase: "/brand/venues/coinbase.png",
  kraken: "/brand/venues/kraken.jpg",
  okx: "/brand/venues/okx.svg",
  mexc: "/brand/venues/mexc.jpg",
  bitstamp: "/brand/venues/bitstamp.jpg",
  "bitstamp by robinhood": "/brand/venues/bitstamp.jpg",
  bitget: "/brand/venues/bitget.jpg",
  "crypto com": "/brand/venues/crypto-com.jpg",
  gate: "/brand/venues/gate.png",
  "gate io": "/brand/venues/gate.png",
  bybit: "/brand/venues/bybit.png",
  kucoin: "/brand/venues/kucoin.svg",
  gemini: "/brand/venues/gemini.png",
  upbit: "/brand/venues/upbit.png",
  bitfinex: "/brand/venues/bitfinex.png",
  uniswap: "/brand/venues/uniswap.png",
  pancakeswap: "/brand/venues/pancakeswap.jpg",
  curve: "/brand/venues/curve.png",
  balancer: "/brand/venues/balancer.png",
  aerodrome: "/brand/venues/aerodrome.png",
  quickswap: "/brand/venues/quickswap.png",
  camelot: "/brand/venues/camelot.jpg",
  sushi: "/brand/venues/sushiswap.png",
  sushiswap: "/brand/venues/sushiswap.png",
};

/** "Uniswap V3 (Ethereum)" → "uniswap", "Coinbase Exchange" → "coinbase". */
export function normalizeVenue(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\bv\d+(\.\d+)*$/i, "")
    .replace(/\bexchange$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Local icon path for a venue name, or null when no brand mark is vendored. */
export function venueIconSrc(name: string): string | null {
  // Exact hit first ("binance us" keeps its own logo), then drop trailing
  // words ("PancakeSwap Infinity CLMM" → "pancakeswap").
  const words = normalizeVenue(name).split(" ").filter(Boolean);
  for (let n = words.length; n > 0; n--) {
    const hit = VENUE_ICON[words.slice(0, n).join(" ")];
    if (hit) return hit;
  }
  return null;
}
