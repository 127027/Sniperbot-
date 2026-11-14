import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditReplayCoverage} from './r20-coverage.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
test('PEPE-targeted historical corpus reports data gaps, not verified empty market days',()=>{
 const d=JSON.parse(fs.readFileSync(path.join(here,'reports','diagnostic-dataset.json'),'utf8'));
 const x=auditReplayCoverage(d);
 assert.equal(x.ticks,62);
 assert.equal(x.counts.POOL,31);
 assert.equal(x.counts.SOCIAL,0);
 assert.equal(x.counts.MARKET,0);
 assert.equal(x.counts.SECURITY,0);
 assert.equal(x.independently_attested_days,0);
 assert.equal(x.fast_idle_skip_enabled,false);
 assert.equal(x.blind_readiness.eligible,false);
 assert.ok(x.warnings.includes('NO_EXECUTABLE_HISTORICAL_MARKET_EVENTS'));
 assert.ok(x.rows.every(r=>!r.idle_skip_permitted));
});
test('even no-event days without source coverage are not labeled as proven quiet days',()=>{
 const d=JSON.parse(fs.readFileSync(path.join(here,'reports','diagnostic-dataset.json'),'utf8'));
 const r=auditReplayCoverage(d);
 assert.ok(r.no_input_events>0);
 assert.ok(r.rows.some(x=>x.observed_events===0&&x.source_coverage_status==='UNVERIFIED'));
});
