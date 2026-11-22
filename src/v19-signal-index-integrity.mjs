// R29 Cleanroom: GitHub PAPER inbox entries must never silently disappear
// when the index is full. Research-only pure planner, no API or signal writes.
const ORDER_PATH=/^signals\/orders\/([A-Za-z0-9_-]{8,80})\.json$/;
const SHA=/^[a-f0-9]{40}$/;

export function planAppendPaperOrderIndex({index,orderPath,orderSha,maxIndexSize=400}={}){
 if(!Number.isInteger(maxIndexSize)||maxIndexSize<1||maxIndexSize>500
  ||index?.schema!==1||index?.mode!=='PAPER'||!Array.isArray(index.orders)
  ||index.orders.length>500||!ORDER_PATH.test(orderPath||'')
  ||!SHA.test(orderSha||''))
  throw Error('INVALID_SIGNAL_INDEX_OR_NEW_ORDER');
 const seen=new Set();
 for(const item of index.orders){
  const match=typeof item?.path==='string'?item.path.match(ORDER_PATH):null;
  if(!match||!SHA.test(item.sha||'')||seen.has(match[1]))
   throw Error('INVALID_OR_DUPLICATED_EXISTING_SIGNAL_INDEX');
  seen.add(match[1]);
 }
 const id=orderPath.match(ORDER_PATH)[1];
 const old=index.orders.find(x=>x.path===orderPath);
 if(old){
  if(old.sha!==orderSha)throw Error('ORDER_ID_REUSED');
  return {alreadyIndexed:true,index,order_count:index.orders.length,
   existing_orders_preserved:true,order_accepted:true};
 }
 // A different path with the same order ID cannot be listed at the same time.
 if(seen.has(id))throw Error('ORDER_ID_REUSED');
 if(index.orders.length>=maxIndexSize)
  throw Error('SIGNAL_INDEX_AT_CAPACITY_NO_EVICTION_ALLOWED');
 const next={...index,orders:[...index.orders,{path:orderPath,sha:orderSha}]};
 return {alreadyIndexed:false,index:next,order_count:next.orders.length,
  existing_orders_preserved:true,order_accepted:true};
}
