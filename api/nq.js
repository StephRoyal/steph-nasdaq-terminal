export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/NQ%3DF?interval=1d&range=1d';
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    const data = await r.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const prev = meta?.previousClose || meta?.chartPreviousClose || meta?.regularMarketPreviousClose;
    const curr = meta?.regularMarketPrice || meta?.price;
    const pct = (prev && curr) ? ((curr - prev) / prev * 100) : 0;
    
    return new Response(JSON.stringify({ pct, curr, prev }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60'
      }
    });
  } catch(e) {
    return new Response(JSON.stringify({ pct: 0, error: e.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
