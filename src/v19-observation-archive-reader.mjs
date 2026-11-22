// R29 V1.9: explicit suffix matching and narrowly audited recovery of one
// historical serialization bug. Never reinterpret arbitrary malformed JSON.
export function selectObservationArchivePaths({paths=[],kind='FORWARD',limit=200}={}){
 if(!Array.isArray(paths)||!['FORWARD','ACTIVITY'].includes(kind)
   ||!Number.isInteger(limit)||limit<1||limit>2000)
   throw Error('INVALID_ARCHIVE_PATH_PLAN');
 const suffix=kind==='ACTIVITY'?'-activity-pages.json':'.json';
 const selected=paths.filter(p=>typeof p==='string'
   &&p.startsWith('20')&&p.endsWith(suffix)
   &&!p.includes('..')&&!p.startsWith('/')).sort();
 return selected.slice(-limit);
}
export function parseResearchJsonWithLegacyTrailer(text,{sourcePath=null}={}){
 if(typeof text!=='string'||!text.trim())
   throw Error('INVALID_RESEARCH_JSON_TEXT');
 try{return {value:JSON.parse(text),legacy_trailer_recovered:false,
   source_path:sourcePath,raw_json_was_valid:true};}
 catch(original){
   // A previous V1.9 writer emitted the literal trailing ASCII 5C 6E
   // ('backslash' followed by 'n') instead of a real newline. Accept ONLY
   // this exact suffix, and only when the preceding bytes parse fully.
   if(text.length<2||text.charCodeAt(text.length-2)!==92
     ||text.charCodeAt(text.length-1)!==110)throw original;
   const value=JSON.parse(text.slice(0,-2));
   return {value,legacy_trailer_recovered:true,source_path:sourcePath,
     raw_json_was_valid:false,recovered_suffix_hex:'5c6e'};
 }
}
