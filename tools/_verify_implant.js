#!/usr/bin/env node
/* 双保险第二层：从游戏 HTML 反向提取 LEVELS → 原版 BFS 复验 */
'use strict';
const fs = require('fs');
const html = fs.readFileSync('/tmp/star-orbit/prototype/levels-v1.html', 'utf8');
const m = html.match(/const LEVELS=\[([\s\S]*?)\n\];/);
if (!m) { console.log('LEVELS提取失败'); process.exit(1); }
const LEVELS = eval('[' + m[1] + ']');
console.log('游戏内关卡数:', LEVELS.length);
const { solve } = require('/tmp/star-orbit/tools/orbit_core.js');
let allOk = true;
for (let i = 0; i < LEVELS.length; i++) {
  const L = LEVELS[i];
  const r = solve({ balls: L.balls, targets: L.targets }, 22);
  const ok = r.solvable && r.optimal === L.optimal;
  if (i >= 17) console.log('第' + (i + 1) + '关', ok ? 'OK' : 'MISMATCH', '声明opt=' + L.optimal, '实测opt=' + (r.solvable ? r.optimal : '不可解'), 'cnt=' + r.count, 'fb=' + r.firstBranch);
  if (!ok) { allOk = false; if (i < 17) console.log('旧关回归失败 第' + (i + 1) + '关'); }
}
console.log(allOk ? '===全部' + LEVELS.length + '关复验通过（含旧关回归）===' : '===有MISMATCH===');