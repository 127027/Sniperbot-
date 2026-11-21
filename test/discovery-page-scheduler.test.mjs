import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseNextDiscoveryPage} from '../src/discovery-page-scheduler.mjs';
test('two visits to same chain despite six-chain even parity will alternate page1/page2',()=>{
 const first=chooseNextDiscoveryPage(null);
 const second=chooseNextDiscoveryPage({page:first.page,next_page_to_consider:2});
 const third=chooseNextDiscoveryPage({page:second.page,next_page_to_consider:3});
 const fourth=chooseNextDiscoveryPage({page:third.page,next_page_to_consider:3});
 assert.deepEqual([first.page,second.page,third.page,fourth.page],[1,2,1,3]);
});
test('missing/invalid pagination status fails back to page1 without claiming coverage',()=>{
 assert.equal(chooseNextDiscoveryPage({page:null,next_page_to_consider:42}).page,1);
 assert.equal(chooseNextDiscoveryPage({page:7,next_page_to_consider:8}).page,1);
});
