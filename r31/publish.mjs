import {readFile} from 'node:fs/promises';
import {publishBroadcast} from './publisher.mjs';
if(process.argv.length!==3)throw Error('Usage: node r31/publish.mjs <validated-signal-input.json>');
const input=JSON.parse(await readFile(process.argv[2],'utf8'));
if(!input||Object.keys(input).sort().join(',')!=='decisions,expires_at_utc,published_at_utc,target_utc')throw Error('INVALID_INPUT_FIELDS');
const result=await publishBroadcast({input,token:process.env.R31_GITHUB_PUBLISH_TOKEN});
console.log(JSON.stringify(result,null,2));
