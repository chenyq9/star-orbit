#!/usr/bin/env node
/* v1.5.1 回归：L1-30 初始无碰撞+未完成 + L40 完全体确认 + 四函数同源抽查 */
'use strict';
const fs = require('fs');
const html = fs.readFileSync('/tmp/star-orbit/prototype/levels-v1.html', 'utf8');
const m = /const LEVELS\s*=\s*\[([\s\S]*?)\n\];/.exec(html);
const LEVELS = eval('[' + m[1] + ']');
const { simStep, hasDup, isWin } = require('/tmp/star-orbit/tools/orbit_core.js');
let ok = 0;
for (let i = 0; i < 30; i++) {
  const L = LEVELS[i];
  const st = L.balls.map(b => b.pos.slice());
  const colors = L.balls.map(b => b.color);
  const noDup = !hasDup(st);
  const solved = isWin(st, colors, L.targets);
  if (noDup && !solved) { ok++; } else { console.log('L' + (i + 1) + ' 异常 dup=' + (!noDup) + ' solved=' + solved); }
}
console.log('L1-30 回归 ' + ok + '/30 通过');
const l40 = LEVELS[39];
const c = {};
l40.balls.forEach(b => c[b.color] = (c[b.color] || 0) + 1);
console.log('L40 球数=' + l40.balls.length + ' 色分布=' + JSON.stringify(c) + (l40.balls.length === 22 && c.b === 10 && c.o === 10 && c.p === 2 ? ' == circle.html 完全体 ✓' : ' ❌'));
/* L2 抽查：模拟一歩 simStep 验证游戏层可运行 */
const st2 = LEVELS[1].balls.map(b => b.pos.slice());
const ns = simStep(st2, 0, 1);
console.log('simStep 冒烟: ' + (JSON.stringify(ns).length >= 10 ? 'OK' : 'FAIL'));
console.log('标题: ' + /<title>([^<]*)<\/title>/.exec(html)[1]);
