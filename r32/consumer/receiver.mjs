import {readSnapshot} from '../protocol/snapshot.mjs';
import {applyBroadcast} from '../../r31/device-account.mjs';
export function scalableReceiver({read}){if(typeof read!=='function')throw Error('READ_REQUIRED');return {async process(account,{now}){const f=await read('r32/feed/latest.json');const latest=await readSnapshot(f.data,read);return applyBroadcast(account,{...latest,now},{allowV2:true})}}}
// read(path) MUST verify raw Git blob SHA and return {data,sha}; caller commits returned account atomically.
// Nothing in this adapter calls Dots or writes to GitHub.
