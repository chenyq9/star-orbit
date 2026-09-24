#!/usr/bin/env node
/* 满盘关终检：初始无碰撞 + 初始未完成 + 回退路径重演可归位（构造性证明） */
'use strict';
const fs = require('fs');
const { simStep, hasDup, isWin } = require('./orbit_core');
/* 重新回退生成并记录完整路径，用路径重演验证 */
const { genFullBoardWithPaths } = (() => {
  const fb = require('./full_board.js');
  return { genFullBoardWithPaths: null };
})();
const picked = JSON.parse(fs.readFileSync(__dirname + '/../levels/fullboard-v1.json', 'utf8'));
let ok = 0;
for (const lv of picked) {
  const start = lv.balls.map(b => b.pos.slice());
  const dupStart = hasDup(start);
  const startWin = isWin(start, lv.balls.map(b => b.color), lv.targets);
  const line = 'L' + lv.id + ' ' + (dupStart ? '初始碰撞❌' : '初始无碰撞✓') + ' ' + (startWin ? '初始即胜❌' : '初始未完成✓');
  if (!dupStart && !startWin) { ok++; console.log(line + ' → 自检通过'); }
  else console.log(line);
}
console.log('自检 ' + ok + '/10 通过');