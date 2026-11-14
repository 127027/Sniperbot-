import test from 'node:test';
import assert from 'node:assert/strict';
import {lookupToken,tokenQuote} from './market.mjs';
const chain='base',addr='0x'+'1'.repeat(40),poolBig='0x'+'a'.repeat(40),
 poolSmall='0x'+'b'.repeat(40),poolFake='0x'+'c'.repeat(40);
const pairs=[
 {chainId:'base',baseToken:{address:addr,symbol:'SAME',name:'Same Ticker One'},
  priceUsd:'1',liquidity:{usd:100000},pairAddress:poolBig},
 {chainId:'base',baseToken:{address:addr,symbol:'SAME',name:'Same Ticker One'},
  priceUsd:'2',liquidity:{usd:5000},pairAddress:poolSmall},
 {chainId:'base',baseToken:{address:'0x'+'2'.repeat(40),symbol:'SAME',name:'Spoof'},
  priceUsd:'99',liquidity:{usd:10000000},pairAddress:poolFake}
];
const fetcher=async()=>new Response(JSON.stringify(pairs),{status:200});

test('Solana mint and pool addresses are case sensitive, EVM remains case insensitive',async()=>{
 const mint='So11111111111111111111111111111111111111112';
 const pool='So11111111111111111111111111111111111111113';
 const fake=async()=>new Response(JSON.stringify([{chainId:'solana',
  baseToken:{address:mint},pairAddress:pool,priceUsd:'1',liquidity:{usd:10000}}]));
 assert.equal(await tokenQuote('solana',mint.toLowerCase(),fake,pool),null);
 assert.equal(await tokenQuote('solana',mint,fake,pool.toLowerCase()),null);
 await assert.rejects(lookupToken('solana',mint.toLowerCase(),fake,pool),/Pool/);
 assert.equal((await tokenQuote('solana',mint,fake,pool)).priceUsd,1);
 assert.equal((await tokenQuote(chain,addr,fetcher,'0x'+'B'.repeat(40))).priceUsd,2);
});
test('independent paper mark uses exact signed pool, not silently switch to more liquid unrelated route',async()=>{
 const largest=await tokenQuote(chain,addr,fetcher);
 assert.equal(largest.priceUsd,1);
 const pinned=await tokenQuote(chain,addr,fetcher,poolSmall);
 assert.equal(pinned.priceUsd,2);
 assert.equal(pinned.pairAddress,poolSmall);
 assert.equal(await tokenQuote(chain,addr,fetcher,poolFake),null);
 const target=await lookupToken(chain,addr,fetcher,poolSmall);
 assert.equal(target.poolAddress,poolSmall);
 assert.equal(target.priceUsd,2);
 assert.equal(target.symbol,'SAME');
 await assert.rejects(lookupToken(chain,addr,fetcher,poolFake),/Pool/);
});
