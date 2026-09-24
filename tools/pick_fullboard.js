#!/usr/bin/env node
/* 满盘关卡生产器 v1（四章 L31-40 用）
 * 核心：回退法构造性保证可解（回退k步必有≤k步解，数学免验证）
 *       每关 opt 声明值 = 回退步数k（合法上界；精确opt待更强启发式/并行矩阵后再定，标注待验证）
 * 输出：fourball/fullboard-v1.json（10关：6→6→8→8→10→10→12→16→20→22 球阶梯，2026-09-24 22球完全体修正）
 * 用法：node tools/pick_fullboard.js
 */
'use strict';
const fs = require('fs');
const { genFullBoard } = require('./full_board.js');
const { simStep, hasDup, isWin } = require('./orbit_core');

/* 四章10关需求（DESIGN_SPEC §2.1 满盘章：L31-40，6→8→10→12阶梯） */
/* 每关挑法：生成一批 → 按盘面“错位度”（未归位球数+目标距离和）挑最不平凡的一关 */
const REQS = [
  { id: 31, n: 6,  k: 10 },  // 满盘登场（回落带，opt≈10）
  { id: 32, n: 6,  k: 12 },
  { id: 33, n: 8,  k: 12 },  // 八球带
  { id: 34, n: 8,  k: 14 },
  { id: 35, n: 10, k: 14 },  // 十球带
  { id: 36, n: 10, k: 16 },
  { id: 37, n: 12, k: 16 },  // 十二球带（用户字面指示关）
  { id: 38, n: 16, k: 18 },  // 修正2026-09-24：circle.html完全体阶梯（原12球终点是半盘错误）
  { id: 39, n: 20, k: 20 },
  { id: 40, n: 22, k: 22 },  // 四章终局：circle.html 完全体22球真满盘（10b+10o+2p）
];
function ringDist(a, b) { const d = Math.abs(a - b) % 12; return Math.min(d, 12 - d); }
function misplacement(lv) {
  /* 错位度：所有球到其目标的最小环内距离和（未考虑换轨，仅盘面错位感） */
  let sum = 0;
  for (const b of lv.balls) {
    const same = lv.targets.find(t => t.color === b.color);
    if (!same) continue;
    const v = b.pos[same.ring];
    if (v === null) { sum += 3; continue; } /* 异环粗略错位 */
    sum += ringDist(v, same.slot);
  }
  return sum;
}
const picked = [];
for (const req of REQS) {
  /* 每关生成50个候选（本地秒级——gen是回退法，无搜索），挑错位度最高的 */
  const { results } = genFullBoard(req.n, 50, 1000 + req.id, req.k);
  results.sort((a, b) => misplacement(b) - misplacement(a));
  const best = results[0];
  picked.push({ id: req.id, note: '回退上界,精确opt待云端验证', ...best, declaredOptimal: best.k, path: best.path });
  console.log(`L${req.id}: ${req.n}球 k=${req.k} 错位度=${misplacement(best)} balls=${best.balls.length}`);
}
fs.writeFileSync(__dirname + '/fullboard-v1.json', JSON.stringify(picked, null, 1));
console.log(`\n10关 → levels/fullboard-v1.json（四章满盘带，opt=回退上界声明）`);