// Solana SPL mint header risk observations, NOT a token safety certificate.
// Layout: COption<Pubkey>(36), supply:u64(8), decimals:u8, initialized:u8,
// COption<Pubkey>(36), total 82 bytes. Token-2022 extensions beyond 82
// MUST be separately audited, especially transfer fees, hooks and freezes.
export const LEGACY_TOKEN_PROGRAM='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const TOKEN_2022_PROGRAM='TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const unknown=(reason)=>({schema:'solana_mint_header_risk.v1',
  paper_only:true,actionable:false,mint_program:'UNKNOWN',
  mint_authority:'UNKNOWN',freeze_authority:'UNKNOWN',
  initialized:null,decimals:null,supply_raw:null,
  extension_audit:'UNKNOWN',observed_risk:'UNKNOWN',
  contract_security:'UNKNOWN',sellability:'UNKNOWN',
  paper_entry_authorized:false,reason});
function option(b,at){
 const v=b.readUInt32LE(at);
 if(v===0)return 'REVOKED';
 if(v===1)return 'RETAINED';
 return null;
}
function bytes(x){
 if(typeof x!=='string'||x.length===0||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(x))
  return null;
 const b=Buffer.from(x,'base64');
 return b.toString('base64')===x?b:null;
}
export function analyzeSolanaMintHeader(account){
 if(!account||typeof account!=='object'||account.executable!==false||
  !Array.isArray(account.data)||account.data.length!==2||
  account.data[1]!=='base64')return unknown('MINT_ACCOUNT_DATA_NOT_AVAILABLE');
 const legacy=account.owner===LEGACY_TOKEN_PROGRAM;
 const token2022=account.owner===TOKEN_2022_PROGRAM;
 if(!legacy&&!token2022)return unknown('UNRECOGNIZED_TOKEN_PROGRAM');
 const program=legacy?'SPL_TOKEN_LEGACY':'TOKEN_2022';
 const data=bytes(account.data[0]);
 if(!data||data.length!==82)return unknown('INCOMPLETE_MINT_HEADER');
 const mintAuthority=option(data,0),freezeAuthority=option(data,46);
 const init=data[45]===1;
 if(!mintAuthority||!freezeAuthority||![0,1].includes(data[45])||
  !Number.isInteger(account.space)||account.space<82||
  (legacy&&account.space!==82))return unknown('INVALID_MINT_LAYOUT');
 const supply=data.readBigUInt64LE(36),decimals=data[44];
 const extensionAudit=legacy?'NOT_APPLICABLE':'REQUIRED';
 const highRisk=mintAuthority==='RETAINED'||freezeAuthority==='RETAINED'||
  !init||supply===0n||extensionAudit==='REQUIRED';
 return {schema:'solana_mint_header_risk.v1',paper_only:true,actionable:false,
  mint_program:program,mint_authority:mintAuthority,freeze_authority:freezeAuthority,
  initialized:init,decimals,supply_raw:supply.toString(),
  extension_audit:extensionAudit,observed_risk:highRisk?'CAUTION':'HEADER_ONLY_NO_KNOWN_AUTHORITY',
  contract_security:'UNKNOWN',sellability:'UNKNOWN',
  paper_entry_authorized:false,
  reason:highRisk?'MINT_RIGHTS_OR_EXTENSIONS_NEED_REVIEW':
   'MINT_FREEZE_ABSENT_BUT_OTHER_RISKS_UNKNOWN'};
}
