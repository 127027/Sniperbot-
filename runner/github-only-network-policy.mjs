// R29 V6.9 -- supervised Windows production network boundary.
// Exact user requirement: BOT <-> GITHUB <-> GPT. No market, safety,
// Solana, paid AI, telemetry, news, RSS or other external API connection.
// GitHub REST is the one deliberately retained remote transport.
// Local loopback is needed by the dashboard and authenticated GPT courier.
// The supervisor sets SNIPER_NETWORK_POLICY=GITHUB_ONLY before ANY child boots.
// This prevents accidental fetch/http/https/WebSocket calls through legacy
// modules. Offline unit fixtures run without this env opt-in and stay intact.
// This is a transport gate, NOT a claim that unapproved market quotes exist.

import http from 'node:http';
import https from 'node:https';

export const GITHUB_ONLY_POLICY='GITHUB_ONLY';
const LOOPBACK=new Set(['127.0.0.1','localhost','[::1]']);
const GITHUB=new Set(['api.github.com']);
const blocked=()=>{
 const e=new Error('R29_EXTERNAL_API_BLOCKED_GITHUB_ONLY');
 e.code='R29_EXTERNAL_API_BLOCKED_GITHUB_ONLY';
 return e;
};
function parseEndpoint(input,scheme='https:'){
 try{
  if(input instanceof URL)return input;
  if(typeof input==='string')return new URL(input);
  if(input&&typeof input==='object'&&typeof input.url==='string')
   return new URL(input.url);
  if(input&&typeof input==='object'){
   const host=String(input.hostname||input.host||'localhost');
   if(!/^\[?[A-Za-z0-9:.\-]+\]?$/.test(host))return null;
   const port=input.port===undefined?'':':'+String(input.port);
   const pathname=String(input.path||'/');
   return new URL(scheme+'//'+host+port+pathname);
  }
 }catch{}
 return null;
}
export function isAllowedGithubOnlyEndpoint(input,{scheme='https:'}={}){
 const u=parseEndpoint(input,scheme);
 if(!u||u.username||u.password)return false;
 if(u.protocol==='https:'&&u.port===''&&GITHUB.has(u.hostname))return true;
 if(u.protocol==='http:'&&LOOPBACK.has(u.hostname)&&
    /^\d{1,5}$/.test(u.port)&&Number(u.port)>0&&Number(u.port)<=65535)return true;
 return false;
}
function requestUrl(args,scheme){
 const first=args[0],second=args[1];
 if(typeof first==='string'||first instanceof URL){
  if(second&&typeof second==='object'&&!Array.isArray(second)){
   // Host options overriding a URL must be validated with the override.
   const base=parseEndpoint(first);
   if(!base)return null;
   const host=second.hostname||second.host||base.hostname;
   const port=second.port||base.port;
   return parseEndpoint({hostname:host,port,path:base.pathname+base.search},scheme);
  }
  return first;
 }
 return parseEndpoint(first,scheme);
}
function restrictNodeRequests(module,scheme){
 for(const name of ['request','get']){
  const original=module[name];
  module[name]=function(...args){
   const url=requestUrl(args,scheme);
   if(!isAllowedGithubOnlyEndpoint(url,{scheme}))throw blocked();
   return original.apply(this,args);
  };
 }
}
if(process.env.SNIPER_NETWORK_POLICY===GITHUB_ONLY_POLICY){
 const originalFetch=globalThis.fetch.bind(globalThis);
 globalThis.fetch=function githubOnlyFetch(input,init){
  if(!isAllowedGithubOnlyEndpoint(input))return Promise.reject(blocked());
  return originalFetch(input,init);
 };
 if(typeof globalThis.WebSocket==='function'){
  // No WebSockets are needed for GitHub REST and the local HTTP dashboard.
  globalThis.WebSocket=class GithubOnlyNoWebSocket{
   constructor(){throw blocked()}
  };
 }
 restrictNodeRequests(http,'http:');
 restrictNodeRequests(https,'https:');
}
