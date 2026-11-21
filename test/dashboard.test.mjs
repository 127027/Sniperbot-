import test from 'node:test';
import assert from 'node:assert/strict';
import {renderDashboard} from '../src/dashboard.mjs';
import {newState} from '../src/core.mjs';
test('dashboard HTML escapes untrusted symbols',()=>{
 const state=newState();
 state.positions['x']={coin:{chain:'base',symbol:'<script>alert(1)</script>',pool:'safePool'}};
 const html=renderDashboard(state);
 assert.match(html,/PAPER ONLY/);
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
});
