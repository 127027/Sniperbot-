// Each CHAIN alternates page 1 and the next unresolved page. Do not derive
// page parity from global GITHUB_RUN_NUMBER: six chains preserve its parity.
export function chooseNextDiscoveryPage(checkpoint){
 if(!checkpoint)return {page:1,reason:'FIRST_CHAIN_VISIT',gap_known:false};
 const prev=Number(checkpoint.page);
 const outstanding=Number(checkpoint.next_page_to_consider);
 if(!Number.isInteger(prev)||prev<1||!Number.isInteger(outstanding)||outstanding<1)
  return {page:1,reason:'INVALID_CHECKPOINT_SAFE_FIRST_PAGE',gap_known:true};
 if(prev===1&&outstanding>1){
   return {page:outstanding,reason:'RESUME_BACKLOG_PAGE',gap_known:true};
 }
 return {page:1,reason:'REFRESH_NEW_POOLS_FIRST_PAGE',gap_known:outstanding>1};
}
