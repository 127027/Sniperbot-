// Full, READ-ONLY Solana legacy/v0 wire format audit. This parses instructions,
// fee payer, blockhash and address-table references (not just signature headers).
// It deliberately CANNOT approve a trade: ALT-loaded accounts and instruction
// semantics still require independent verification and risk-policy enforcement.
import {decodeBase58,encodeBase58} from './local-solana-vault.mjs';

const LIMIT=4096;
const MARK='solana_unsigned_wire_audit.v1';
function invalid(code){throw Error(code)}
function shortvec(raw,pos){
 let value=0,power=1;
 for(let i=0;i<3;i++){
  if(pos+i>=raw.length)invalid('TRUNCATED_SHORTVEC');
  const byte=raw[pos+i];
  value+=(byte&127)*power;
  if((byte&128)===0){
   if(i>0&&value<128**i)invalid('NONCANONICAL_SHORTVEC');
   if(value>2048)invalid('EXCESSIVE_SHORTVEC_LENGTH');
   return [value,pos+i+1];
  }
  power*=128;
 }
 invalid('SHORTVEC_TOO_LONG');
}
function reader(buf){
 let at=0;
 return {
  get at(){return at},
  u8(){if(at>=buf.length)invalid('TRUNCATED_SOLANA_MESSAGE');return buf[at++]},
  vec(){const [n,next]=shortvec(buf,at);at=next;return n},
  bytes(n){if(!Number.isInteger(n)||n<0||at+n>buf.length)invalid('TRUNCATED_SOLANA_MESSAGE');
   const out=buf.subarray(at,at+n);at+=n;return out},
  end(){if(at!==buf.length)invalid('TRAILING_SOLANA_MESSAGE_BYTES')}
 };
}
function b64(x){
 if(typeof x!=='string'||x.length<130||x.length>8192||
  !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(x))
  invalid('INVALID_TRANSACTION_BASE64');
 const bytes=Buffer.from(x,'base64');
 if(bytes.length>LIMIT||bytes.toString('base64')!==x)
  invalid('INVALID_TRANSACTION_BASE64');
 return bytes;
}
export function auditUnsignedSolanaWire({base64,wallet}={}){
 const own=decodeBase58(wallet);
 const raw=b64(base64),s=reader(raw);
 const nSignatures=s.vec();
 if(nSignatures<1||nSignatures>8)invalid('SIGNATURE_COUNT_OUT_OF_BOUNDS');
 const signatures=Array.from({length:nSignatures},()=>s.bytes(64));
 const message=reader(raw.subarray(s.at));
 const first=raw[s.at];
 const versioned=Boolean(first&128);
 if(versioned&&message.u8()!==0x80)invalid('UNSUPPORTED_SOLANA_MESSAGE_VERSION');
 const required=message.u8(),roSigned=message.u8(),roUnsigned=message.u8();
 if(required!==nSignatures||roSigned>required||required<1)
  invalid('INVALID_SIGNATURE_HEADER');
 const keyCount=message.vec();
 if(keyCount<required||keyCount>128||roUnsigned>keyCount-required)
  invalid('INVALID_ACCOUNT_HEADER');
 const keys=Array.from({length:keyCount},()=>message.bytes(32));
 const signers=keys.slice(0,required).filter(x=>x.equals(own));
 if(signers.length!==1)invalid('WALLET_NOT_REQUIRED_SIGNER');
 const signerSlot=keys.findIndex(x=>x.equals(own));
 if(signatures[signerSlot].some(byte=>byte!==0))
  invalid('WALLET_SIGNATURE_ALREADY_PRESENT');
 const blockhash=message.bytes(32);
 if(blockhash.every(x=>x===0))invalid('INVALID_RECENT_BLOCKHASH');
 const instructionCount=message.vec();
 if(instructionCount===0||instructionCount>64)invalid('INVALID_INSTRUCTION_COUNT');
 const instructions=[];
 for(let i=0;i<instructionCount;i++){
  const programIndex=message.u8();
  const nAccounts=message.vec();
  if(nAccounts>128)invalid('EXCESSIVE_INSTRUCTION_ACCOUNTS');
  const indices=Array.from(message.bytes(nAccounts));
  const dataLen=message.vec();
  if(dataLen>1232)invalid('EXCESSIVE_INSTRUCTION_DATA');
  message.bytes(dataLen);
  instructions.push({programIndex,indices});
 }
 const tables=[];
 if(versioned){
  const nTables=message.vec();
  if(nTables>16)invalid('TOO_MANY_ADDRESS_LOOKUP_TABLES');
  for(let i=0;i<nTables;i++){
   const key=message.bytes(32);
   const writableCount=message.vec(),writable=Array.from(message.bytes(writableCount));
   const readonlyCount=message.vec(),readonly=Array.from(message.bytes(readonlyCount));
   if(writableCount+readonlyCount>256||writableCount+readonlyCount===0||
      new Set([...writable,...readonly]).size!==writableCount+readonlyCount)
    invalid('INVALID_ADDRESS_TABLE_REFERENCES');
   tables.push({table_address:encodeBase58(key),writable_count:writableCount,
    readonly_count:readonlyCount,lookup_indexes:[...writable,...readonly]});
  }
 }
 message.end();
 const dynamicCount=tables.reduce((sum,t)=>sum+t.writable_count+t.readonly_count,0);
 const totalKeys=keyCount+dynamicCount;
 const programs=[];
 for(const ins of instructions){
  if(ins.programIndex>=totalKeys||ins.indices.some(i=>i>=totalKeys))
   invalid('OUT_OF_BOUNDS_INSTRUCTION_ACCOUNT');
  programs.push(ins.programIndex<keyCount?encodeBase58(keys[ins.programIndex]):'UNRESOLVED_ADDRESS_TABLE_PROGRAM');
 }
 const knownStatic=new Set(keys.map(encodeBase58));
 if(knownStatic.size!==keyCount)invalid('DUPLICATE_STATIC_ACCOUNT_KEYS');
 return {
  schema:MARK,message_version:versioned?'v0':'legacy',
  required_signatures:required,read_only_signed:roSigned,read_only_unsigned:roUnsigned,
  static_account_count:keyCount,loaded_account_count:dynamicCount,
  instruction_count:instructionCount,program_ids:[...new Set(programs)],
  fee_payer:encodeBase58(keys[0]),fee_payer_is_wallet:keys[0].equals(own),
  wallet_signer_index:signerSlot,
  recent_blockhash:encodeBase58(blockhash),recent_blockhash_freshness:'NOT_VERIFIED',
  address_table_references:tables.map(({lookup_indexes,...rest})=>rest),
  address_tables_resolved:false,instruction_semantics_audited:false,
  min_output_guarantee_verified:false,fees_verified:false,
  token_owner_and_recipient_verified:false,program_allowlist_verified:false,
  transaction_signed:false,transaction_sent:false,
  signing_permitted:false,execution_permitted:false,
  security_status:'BLOCKED_INDEPENDENT_INSTRUCTION_AND_ALT_AUDIT_REQUIRED'
 };
}
