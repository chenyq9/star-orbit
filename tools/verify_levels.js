#!/usr/bin/env node
/* Star Orbit 关卡验证器 v1.1（BFS）
 * 规则核心抽到 orbit_core.js（唯一事实来源），本文件只做：校准基准 + 外部关卡表验证。
 * 用法：
 *   node tools/verify_levels.js                       # 校准 levels-v1 六关（期望 3/4/8/2/9/10）
 *   node tools/verify_levels.js tools/levels-v2.json  # 验证外部关卡定义
 * 输出维度：可解性 / 最优步 / 最短解条数 / 首步分支 / 窗口事件(样例解) / 可达状态数
 */
'use strict';
const fs = require('fs');
const { solve } = require('./orbit_core');

/* ---- 与游戏文件同源的内置关卡表（校准基准） ---- */
const BASE_LEVELS = [
  { name: 'L1·启程', hint: '', optimal: 3, balls: [{ color: 'b', pos: [0, null] }], targets: [{ ring: 0, slot: 3, color: 'b' }] },
  { name: 'L2·引力窗口', hint: '', optimal: 4, balls: [{ color: 'b', pos: [5, null] }], targets: [{ ring: 1, slot: 5, color: 'b' }] },
  { name: 'L3·双星协奏', hint: '', optimal: 8, balls: [{ color: 'b', pos: [0, null] }, { color: 'o', pos: [null, 0] }], targets: [{ ring: 1, slot: 0, color: 'b' }, { ring: 0, slot: 0, color: 'o' }] },
  { name: 'L4·弧的抉择', hint: '', optimal: 2, balls: [{ color: 'b', pos: [4, null] }], targets: [{ ring: 1, slot: 4, color: 'b' }] },
  { name: 'L5·交叉航线', hint: '', optimal: 9, balls: [{ color: 'b', pos: [3, null] }, { color: 'o', pos: [null, 9] }], targets: [{ ring: 1, slot: 9, color: 'b' }, { ring: 0, slot: 3, color: 'o' }] },
  { name: 'L6·轨道合流', hint: '', optimal: 10, balls: [{ color: 'b', pos: [6, null] }, { color: 'o', pos: [null, 0] }], targets: [{ ring: 1, slot: 6, color: 'b' }, { ring: 0, slot: 0, color: 'o' }] },
];

function run(levels, label) {
  console.log('===== ' + label + ' =====');
  for (const L of levels) {
    const r = solve(L);
    const check = (L.optimal !== undefined && r.solvable) ? (r.optimal === L.optimal ? '✓最优吻合' : '✗声明' + L.optimal + '≠实际' + r.optimal) : '';
    if (!r.solvable) {
      console.log(`${L.name}  ✗ 无解${r.note || ''}  可达状态 ${r.reachable}  ${check}`);
      continue;
    }
    console.log(`${L.name}  可解  最优 ${r.optimal} 步  最短解 ${r.count} 条  首步分支 ${r.firstBranch}(${r.firsts.join('/') || '-'})  窗口 ${r.gateEvents.length} 次  可达 ${r.reachable} 态  ${check}`);
    if (r.sample.length) console.log(`    样例解: ${r.sample.join(' ')}`);
  }
  console.log();
}

const args = process.argv.slice(2);
run(BASE_LEVELS, '校准：levels-v1 六关（期望最优 3/4/8/2/9/10）');
if (args[0]) {
  const lv = JSON.parse(fs.readFileSync(args[0], 'utf8'));
  run(lv.levels, '外部关卡：' + args[0]);
}