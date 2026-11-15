// Opt-in central ONE-model historical research adapter.
// No web tool, no browsing, no current market retrieval, no wallet and NO
// execution channel. The model still may know future outcomes from pretraining.
export async function researchR27WithOpenAI(frame,{
 fetcher=fetch,apiKey=process.env.R27_OPENAI_API_KEY,
 model='gpt-4.1-mini',maxOutputTokens=1800
}={}){
 if(frame?.schema!=='r27_ai_frame.v1'||!Array.isArray(frame.candidate_ids)||
  !Array.isArray(frame.evidence)||!frame.at_utc||
  typeof apiKey!=='string'||!/^sk-[A-Za-z0-9_-]{15,}$/.test(apiKey))
  throw Error('R27_NO_AUTHORIZED_MODEL_INPUT');
 if(!Number.isSafeInteger(maxOutputTokens)||maxOutputTokens<200||maxOutputTokens>3000)
  throw Error('R27_MODEL_BUDGET_INVALID');
 const schema={type:'object',additionalProperties:false,
  required:['summary','decisions'],properties:{
   summary:{type:'string'},decisions:{type:'array',items:{
    type:'object',additionalProperties:false,
    required:['candidate_id','action','score','evidence_ids','reason'],
    properties:{candidate_id:{type:'string'},
     action:{type:'string',enum:['BUY','SELL','HOLD','WATCH','NO_TRADE']},
     score:{type:'number'},evidence_ids:{type:'array',items:{type:'string'}},
     reason:{type:'string'}}}}}};
 const instructions=[
  'Du analysierst nur die im Nutzer-Eingabe-JSON vorhandenen zeitlich freigegebenen historischen Daten.',
  'Keine Websuche, keine Rekonstruktion von externen Posts, keine Erinnerungen an spätere Gewinner oder zukünftige Kurse.',
  'Neue Token nur aus candidate_ids; Nachrichten alleine identifizieren keinen handelbaren Coin.',
  'Jede Empfehlung braucht evidenz_ids, die exakt im Frame stehen. Ohne Beleg WATCH oder NO_TRADE.',
  'Ein Score ist eine unkalibrierte Bewertung, KEINE Gewinnwahrscheinlichkeit.',
  'Nie tatsächliche Transaktionen behaupten; BUY bedeutet nur Forschungsidee.',
  'Du darfst kein aktuelles Datum und keine späteren Markt- oder Pressedaten verwenden.',
  'Antworte ausschließlich im JSON-Schema.'
 ].join(' ');
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),90000);
 try{
  const request={model,store:false,tools:[],max_output_tokens:maxOutputTokens,
   instructions,input:JSON.stringify(frame),
   text:{format:{type:'json_schema',name:'r27_historical_sealed_research',strict:true,schema}}};
  if(Buffer.byteLength(JSON.stringify(request))>120000)
   throw Error('R27_MODEL_FRAME_TOO_LARGE');
  const response=await fetcher('https://api.openai.com/v1/responses',{
   method:'POST',headers:{authorization:'Bearer '+apiKey,'content-type':'application/json'},
   body:JSON.stringify(request),signal:controller.signal});
  if(!response?.ok)throw Error('R27_MODEL_HTTP_'+response?.status);
  const result=await response.json();
  if(result?.status!=='completed'||!Array.isArray(result.output))
   throw Error('R27_MODEL_NOT_COMPLETED');
  if(result.output.some(x=>x.type?.includes('web_search')||x.type?.includes('function_call')))
   throw Error('R27_UNAUTHORIZED_MODEL_TOOL_USE');
  const raw=result.output.flatMap(x=>x.type==='message'?x.content||[]:[])
   .filter(x=>x.type==='output_text').map(x=>x.text).join('');
  if(!raw||raw.length>16000)throw Error('R27_MODEL_EMPTY_OR_OVERSIZED');
  let data;try{data=JSON.parse(raw)}catch{throw Error('R27_MODEL_JSON_INVALID')}
  if(!data||Object.keys(data).sort().join(',')!=='decisions,summary')
   throw Error('R27_MODEL_SCHEMA_VIOLATION');
  return data;
 }finally{clearTimeout(timeout)}
}
