// R32 read-only provider contract. No wallet, signing, transaction or order execution.
export const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const WSOL = 'So11111111111111111111111111111111111111112';
const MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const raw = x => typeof x === 'string' && /^[1-9][0-9]{0,30}$/.test(x);
const stamp = () => new Date().toISOString();

async function getJson(url, fetcher) {
  const response = await fetcher(url, {
    method: 'GET', redirect: 'error',
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error('HTTP ' + response.status + ' ' + new URL(url).hostname);
  return response.json();
}

export async function fxReference(fetcher = fetch) {
  const url = 'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD';
  const j = await getJson(url, fetcher);
  if (j.base !== 'EUR' || typeof j.rates?.USD !== 'number' ||
      !Number.isFinite(j.rates.USD) || j.rates.USD <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(j.date ?? '')) throw new Error('INVALID_FX');
  const day = Date.parse(j.date + 'T00:00:00Z');
  if (!Number.isFinite(day) || day > Date.now() || Date.now() - day > 7 * 86400000)
    throw new Error('STALE_OR_FUTURE_FX');
  return { usd_per_eur: j.rates.USD, reference_date: j.date, retrieved_at: stamp(),
    source: url, status: 'DAILY_REFERENCE_NOT_LIVE_FX' };
}

export async function routeQuote(input, output, amount, fetcher = fetch) {
  if (!MINT.test(input) || !MINT.test(output) || input === output || !raw(amount))
    throw new Error('INVALID_ROUTE_REQUEST');
  const url = 'https://api.jup.ag/swap/v2/order?' +
    new URLSearchParams({inputMint: input, outputMint: output, amount});
  const started_at = stamp();
  const j = await getJson(url, fetcher);
  if (j.error || j.errorCode || j.errorMessage || j.transaction ||
      j.inputMint !== input || j.outputMint !== output || j.inAmount !== amount ||
      !raw(j.outAmount) || !Array.isArray(j.routePlan) || !j.routePlan.length)
    throw new Error('NO_VALID_QUOTE_ONLY_ROUTE');
  if (j.expireAt != null && (!Number.isFinite(Date.parse(j.expireAt)) ||
      Date.parse(j.expireAt) <= Date.now())) throw new Error('EXPIRED_ROUTE');
  return {input_mint: input, output_mint: output, in_raw: amount, out_raw: j.outAmount,
    router: j.router ?? null, quote_id: j.quoteId ?? j.requestId ?? null,
    expires_at: j.expireAt ?? null, started_at, retrieved_at: stamp(),
    provider_quote_time: null, status: 'QUOTED_NOT_EXECUTED', source: url};
}

// Caller must schedule requests within provider limits. USDC units, NOT EUR.
// No PASS risk/sellability or trading authorization is emitted by this adapter.
export async function roundTrip(mint, usdcRaw, fetcher = fetch, wait = ms => new Promise(r => setTimeout(r, ms))) {
  const buy = await routeQuote(USDC, mint, usdcRaw, fetcher);
  await wait(2200);
  const sell = await routeQuote(mint, USDC, buy.out_raw, fetcher);
  return {chain: 'solana', address: mint, mode: 'PAPER_ONLY', buy, sell,
    quoted_roundtrip_delta_usdc_raw: (BigInt(usdcRaw) - BigInt(sell.out_raw)).toString(),
    route_evidence: 'BIDIRECTIONAL_QUOTED', risk: 'UNKNOWN', sellability: 'UNKNOWN',
    status: 'QUOTE_EVIDENCE_ONLY', limitations: 'No wallet-specific simulation, network/rent fees, EUR execution or guaranteed fills.'};
}
