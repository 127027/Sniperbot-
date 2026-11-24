// Reserve event values are not identical to entire vault balances.
// Prove exact pair transitions and constant vault offsets; no fabricated tick quote.
import {createHash} from 'node:crypto';
const P='6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const TOKEN=new Set(['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb']);
const SOL='So11111111111111111111111111111111111111112',ZERO='11111111111111111111111111111111';
const key=x=>typeof x==='string'?x:x?.pubkey;
const num=x=>{if(typeof x!=='string'||!/^(0|[1-9]\d*)$/.test(x))throw Error('INVALID_RAW_AMOUNT');return BigInt(x);};
const safe=x=>{if(!Number.isSafeInteger(x)||x<0)throw Error('UNSAFE_LAMPORTS');return BigInt(x);};
const hash=x=>createHash('sha256').update(x).digest('hex');
export function correlateReserveState({raw,decoded}={}){
 if(hash(raw)!==decoded.source_sha256)throw Error('RAW_HASH_MISMATCH');
 const e=decoded.matched_event?.event,s=decoded.matched_instruction;
 if(!e||!s||decoded.decoded_event_count!==1||decoded.matched_instruction_count!==1||s.quote_mint!==SOL||![ZERO,SOL].includes(e.quote_mint)||e.user!==s.user||e.mint!==decoded.mint||e.is_buy!==(decoded.side==='BUY'))throw Error('INVALID_MATCHED_EVENT');
 const tx=JSON.parse(raw).result,m=tx.meta,msg=tx.transaction.message,ks=msg.accountKeys.map(key);
 if(m.err!==null||!tx.transaction.signatures.includes(decoded.signature)||String(tx.blockTime)!==e.timestamp||tx.blockTime!==Date.parse(decoded.block_time_utc)/1000)throw Error('TX_MISMATCH');
 const pi=ks.indexOf(s.pool),ti=ks.indexOf(s.token_account);
 if(pi<0||ti<0||ks[0]===s.pool||msg.accountKeys.some(x=>key(x)===s.pool&&x.signer===true))throw Error('POOL_NOT_IDENTIFIED');
 const pick=bs=>{const b=bs.filter(x=>x.accountIndex===ti&&x.mint===e.mint&&x.owner===s.pool);if(b.length!==1||!TOKEN.has(b[0].programId))throw Error('INVALID_POOL_TOKEN_ACCOUNT');return b[0];};
 const a=pick(m.preTokenBalances),b=pick(m.postTokenBalances);
 if(a.programId!==b.programId||a.uiTokenAmount.decimals!==b.uiTokenAmount.decimals||a.uiTokenAmount.decimals!==6)throw Error('TOKEN_META_MISMATCH');
 const ta=num(a.uiTokenAmount.amount),tb=num(b.uiTokenAmount.amount),sa=safe(m.preBalances[pi]),sb=safe(m.postBalances[pi]);
 const token=num(e.token_amount),sol=num(e.sol_amount),sign=e.is_buy?1n:-1n;
 const v3=['buy_v3','buy_exact_quote_in_v3','sell_v3'].includes(s.name);
 // Pinned TRADE_V3.md: protocol fee minus buyback and creator fee retained in vault.
 // Do not absorb unknown rent changes or extra flows into this equality.
 const retained=v3?num(e.fee)-num(e.buyback_fee)+num(e.creator_fee):0n;
 if(v3&&(e.ix_name!==s.name||e.fee_recipient!==ZERO||num(e.buyback_fee)>num(e.fee)))throw Error('V3_FEE_EVENT_MISMATCH');
 if(tb-ta!==-sign*token||sb-sa!==sign*sol+retained||num(e.quote_amount)!==sol||num(e.virtual_quote_reserves)!==num(e.virtual_sol_reserves)||num(e.real_quote_reserves)!==num(e.real_sol_reserves))throw Error('ACCOUNT_EVENT_DELTA_MISMATCH');
 const all=[...(msg.instructions||[]),...(m.innerInstructions||[]).flatMap(x=>x.instructions||[])];
 const transfers=all.filter(i=>i.programId===a.programId&&['transfer','transferChecked'].includes(i.parsed?.type)).filter(i=>{const p=i.parsed.info;return (e.is_buy?p.source===s.token_account&&p.destination!==s.token_account&&p.authority===s.pool:p.destination===s.token_account&&p.source!==s.token_account)&&(p.mint===undefined||p.mint===e.mint)&&num(p.tokenAmount?.amount??p.amount)===token;});
 if(transfers.length!==1||!all.some(i=>i.programId===P&&(i.accounts||[]).includes(s.pool)))throw Error('TOKEN_TRANSFER_NOT_CORROBORATED');
 const post={virtual_sol:num(e.virtual_sol_reserves),virtual_token:num(e.virtual_token_reserves),real_sol:num(e.real_sol_reserves),real_token:num(e.real_token_reserves)};
 const pre={virtual_sol:post.virtual_sol-sign*sol,virtual_token:post.virtual_token+sign*token,real_sol:post.real_sol-sign*sol,real_token:post.real_token+sign*token};
 if([...Object.values(pre),...Object.values(post)].some(n=>n<0n)||post.virtual_sol===0n||post.virtual_token===0n||tb<post.real_token||sb<post.real_sol)throw Error('INVALID_RESERVE_STATE');
 const map=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,v.toString()]));
 return {signature:decoded.signature,mint:decoded.mint,pool:s.pool,receipt_id:decoded.receipt_id,slot:tx.slot,block_time_utc:decoded.block_time_utc,side:decoded.side,source_sha256:decoded.source_sha256,pre:map(pre),post:map(post),vault:{token_pre:ta.toString(),token_post:tb.toString(),sol_pre:sa.toString(),sol_post:sb.toString(),token_offset:(tb-post.real_token).toString(),sol_offset:(sb-post.real_sol).toString(),token_pre_offset:(ta-pre.real_token).toString(),sol_pre_offset:(sa-pre.real_sol).toString(),retained_fee_lamports:retained.toString()},fees:{protocol_bps:e.fee_basis_points,creator_bps:e.creator_fee_basis_points,protocol_fee_lamports:e.fee,creator_fee_lamports:e.creator_fee,buyback_share_bps:e.buyback_fee_basis_points,network_fee_lamports:String(m.fee)},event_flow_verified:true,asof_tick_quote_verified:false,orders_authorized:0};
}
export function compareReserveContinuity(first,second){
 if(!first?.post||!second?.pre||!first?.vault||!second?.vault)return false;
 if(first.mint!==second.mint||first.pool!==second.pool||first.slot>second.slot||first.signature===second.signature||Date.parse(first.block_time_utc)>Date.parse(second.block_time_utc))return false;
 return ['virtual_sol','virtual_token','real_sol','real_token'].every(k=>first.post[k]===second.pre[k])&&first.vault.token_post===second.vault.token_pre&&first.vault.sol_post===second.vault.sol_pre&&first.vault.token_offset===(second.vault.token_pre_offset??second.vault.token_offset)&&first.vault.sol_offset===(second.vault.sol_pre_offset??second.vault.sol_offset);
}

// A creation+buy transaction has no pre-existing vault. Corroborate its POST
// state independently; never pretend the inferred intermediate state was a
// separately observed pre-state or grant the ordinary two-state execution gate.
export function correlateCreationBuyPostState({raw,decoded}={}){
 if(hash(raw)!==decoded.source_sha256)throw Error('RAW_HASH_MISMATCH');
 const e=decoded.matched_event?.event,s=decoded.matched_instruction,tx=JSON.parse(raw).result;
 if(!e||!s||decoded.decoded_event_count!==1||decoded.matched_instruction_count!==1||!e.is_buy||decoded.side!=='BUY'||e.mint!==decoded.mint||e.user!==s.user||s.quote_mint!==SOL||![ZERO,SOL].includes(e.quote_mint)||tx.meta.err!==null||!tx.transaction.signatures.includes(decoded.signature)||String(tx.blockTime)!==e.timestamp||tx.blockTime!==Date.parse(decoded.block_time_utc)/1000)throw Error('INVALID_CREATION_BUY_EVENT');
 const m=tx.meta,msg=tx.transaction.message,ks=msg.accountKeys.map(key),pi=ks.indexOf(s.pool),ti=ks.indexOf(s.token_account);
 if(pi<0||ti<0||m.preBalances[pi]!==0||m.preTokenBalances.some(b=>b.mint===e.mint))throw Error('NOT_NEW_CURVE');
 const all=[...(msg.instructions||[]),...(m.innerInstructions||[]).flatMap(x=>x.instructions||[])],post=m.postTokenBalances.filter(b=>b.mint===e.mint);
 const pool=post.filter(b=>b.accountIndex===ti&&b.owner===s.pool),buyer=post.filter(b=>b.owner===s.user&&b.accountIndex!==ti);
 if(post.length!==2||pool.length!==1||buyer.length!==1||!TOKEN.has(pool[0].programId)||buyer[0].programId!==pool[0].programId||post.some(b=>b.uiTokenAmount.decimals!==6))throw Error('CREATION_POST_BALANCE_MISMATCH');
 const tokenProgram=pool[0].programId,controls=all.filter(i=>i.programId===tokenProgram),find=(type,pred)=>controls.filter(i=>i.parsed?.type===type&&pred(i.parsed.info));
 const mintTo=find('mintTo',i=>i.mint===e.mint&&i.account===s.token_account);
 const init=find('initializeMint2',i=>i.mint===e.mint&&i.decimals===6);
 const transfer=find('transferChecked',i=>i.mint===e.mint&&i.source===s.token_account&&i.destination===ks[buyer[0].accountIndex]&&i.authority===s.pool);
 const created=all.filter(i=>i.programId===ZERO&&i.parsed?.type==='createAccount'&&i.parsed.info.newAccount===s.pool&&i.parsed.info.owner===P);
 if(mintTo.length!==1||init.length!==1||transfer.length!==1||created.length!==1)throw Error('CREATION_INSTRUCTIONS_NOT_CORROBORATED');
 const tb=num(pool[0].uiTokenAmount.amount),bb=num(buyer[0].uiTokenAmount.amount),token=num(e.token_amount),sol=num(e.sol_amount),sb=safe(m.postBalances[pi]);
 if(bb!==token||num(mintTo[0].parsed.info.amount)!==tb+bb||num(transfer[0].parsed.info.tokenAmount.amount)!==token||num(e.real_sol_reserves)!==sol||num(e.quote_amount)!==sol||num(e.virtual_quote_reserves)!==num(e.virtual_sol_reserves)||num(e.real_quote_reserves)!==sol||tb<num(e.real_token_reserves)||sb<sol)throw Error('CREATION_EVENT_AMOUNT_MISMATCH');
 const inbound=all.filter(i=>i.programId===ZERO&&i.parsed?.type==='transfer'&&i.parsed.info.destination===s.pool).reduce((n,i)=>n+safe(i.parsed.info.lamports),0n);
 const outbound=all.filter(i=>i.programId===ZERO&&i.parsed?.type==='transfer'&&i.parsed.info.source===s.pool).reduce((n,i)=>n+safe(i.parsed.info.lamports),0n);
 const rent=safe(created[0].parsed.info.lamports);
 if(inbound!==sol||outbound!==0n||sb!==rent+inbound)throw Error('CREATION_NATIVE_BALANCE_NOT_CORROBORATED');
 return {mint:e.mint,pool:s.pool,signature:decoded.signature,block_time_utc:decoded.block_time_utc,source_sha256:decoded.source_sha256,post:{virtual_sol:e.virtual_sol_reserves,virtual_token:e.virtual_token_reserves,real_sol:e.real_sol_reserves,real_token:e.real_token_reserves},vault:{token_post:String(tb),sol_post:String(sb),token_offset:String(tb-num(e.real_token_reserves)),sol_offset:String(sb-sol)},creation_buy_post_state_verified:true,event_flow_verified:false,asof_tick_quote_verified:false,orders_authorized:0};
}
