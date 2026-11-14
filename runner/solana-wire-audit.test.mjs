import test from 'node:test';
import assert from 'node:assert/strict';
import {auditUnsignedSolanaWire} from './solana-wire-audit.mjs';
import {decodeBase58} from './local-solana-vault.mjs';
const wallet='So11111111111111111111111111111111111111112';
const program='ComputeBudget111111111111111111111111111111';
const alt='11111111111111111111111111111111';
const vec=n=>n<128?Buffer.from([n]):Buffer.from([(n&127)|128,n>>7]);
function wire({signed=false,badSigner=false,lookup=false,unknownProgram=false,
 trailing=false,zeroBlockhash=false,extraInstructions=false}={}){
 const signer=decodeBase58(badSigner?program:wallet);
 const staticKeys=[signer,decodeBase58(program)];
 const msg=[Buffer.from([0x80,1,0,1]),vec(staticKeys.length),...staticKeys,
  Buffer.alloc(32,zeroBlockhash?0:42),
  vec(extraInstructions?2:1)];
 const instruction=Buffer.from([unknownProgram?2:1,1,0,1,0x37]);
 msg.push(instruction);
 if(extraInstructions)msg.push(instruction);
 if(lookup)msg.push(Buffer.from([1]),decodeBase58(alt),Buffer.from([1,0,1,1]));
 else msg.push(Buffer.from([0]));
 if(trailing)msg.push(Buffer.from([0xAB]));
 return Buffer.concat([vec(1),Buffer.alloc(64,signed?5:0),...msg]).toString('base64');
}
test('full unsigned Solana v0 wire parses instructions, fee payer, signer and blockhash but never approves',()=>{
 const result=auditUnsignedSolanaWire({base64:wire(),wallet});
 assert.equal(result.message_version,'v0');
 assert.equal(result.instruction_count,1);
 assert.deepEqual(result.program_ids,[program]);
 assert.equal(result.static_account_count,2);
 assert.equal(result.loaded_account_count,0);
 assert.equal(result.wallet_signer_index,0);
 assert.equal(result.fee_payer_is_wallet,true);
 assert.equal(result.address_tables_resolved,false);
 assert.equal(result.signing_permitted,false);
 assert.equal(result.execution_permitted,false);
 assert.equal(result.instruction_semantics_audited,false);
});
test('v0 lookup references are detected as unresolved and cannot become executable',()=>{
 const x=auditUnsignedSolanaWire({base64:wire({lookup:true,unknownProgram:true}),wallet});
 assert.equal(x.address_table_references.length,1);
 assert.equal(x.address_table_references[0].writable_count,1);
 assert.equal(x.address_table_references[0].readonly_count,1);
 assert.equal(x.program_ids[0],'UNRESOLVED_ADDRESS_TABLE_PROGRAM');
 assert.equal(x.program_allowlist_verified,false);
 assert.equal(x.signing_permitted,false);
});
test('forged signer, pre-signed wallet slot, malformed blockhash and trailing bytes reject',()=>{
 for(const input of [
  {signed:true},{badSigner:true},{zeroBlockhash:true},{trailing:true},
  {unknownProgram:true}
 ]){
  assert.throws(()=>auditUnsignedSolanaWire({base64:wire(input),wallet}));
 }
});
test('truncated and noncanonical shortvec lengths reject',()=>{
 let r=Buffer.from(wire(),'base64');
 assert.throws(()=>auditUnsignedSolanaWire({base64:r.subarray(0,r.length-3).toString('base64'),wallet}));
 r=Buffer.from(wire(),'base64');
 r[0]=0x81; // original one-byte length becomes noncanonical 2-byte
 assert.throws(()=>auditUnsignedSolanaWire({base64:r.toString('base64'),wallet}));
});
test('even multiple valid opaque instructions never authorize funds movement',()=>{
 const x=auditUnsignedSolanaWire({base64:wire({extraInstructions:true}),wallet});
 assert.equal(x.instruction_count,2);
 assert.equal(x.fees_verified,false);
 assert.equal(x.min_output_guarantee_verified,false);
 assert.equal(x.token_owner_and_recipient_verified,false);
 assert.equal(x.security_status,'BLOCKED_INDEPENDENT_INSTRUCTION_AND_ALT_AUDIT_REQUIRED');
});
