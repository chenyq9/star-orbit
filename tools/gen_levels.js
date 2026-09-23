#!/usr/bin/env node
/* Star Orbit 关卡候选生成器 v1
 * 程序化采样 2/3 球初始×目标组合 → orbit_core.solve 量化 → 按维度筛选输出候选。
 * 用法：node tools/gen_levels.js [球数=2] [采样数=4000] [seed=42]
 * 输出：按最优步分带打印候选（含首步分支/解条数/窗口事件/可达态/样例解），供人工挑关。
 */
'use strict';
const argv = process.argv.slice(2);
const NBALL = parseInt(argv[0] || '2', 10);
const { SLOTS, WINDOW_SLOTS, solve } = require(NBALL >= 4 ? './orbit_core_fast' : './orbit_core');
const SAMPLES = parseInt(argv[1] || '4000', 10);
const SEED = parseInt(argv[2] || '42', 10);
const MINOPT = parseInt(argv[3] || '0', 10);
const MAXOPT = parseInt(argv[4] || '99', 10);

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(SEED);
const ri = n => Math.floor(rnd() * n);

/* 随机一个位置：随机环 + 槽（排除交点槽做初始位/目标位，避免目标画在窗口上） */
function randPos(used) {
  for (let t = 0; t < 100; t++) {
    const c = ri(2), s = ri(SLOTS);
    if (WINDOW_SLOTS[c].includes(s)) continue;
    const key = c + ',' + s;
    if (used.has(key)) continue;
    used.add(key);
    return { c, s };
  }
  return null;
}

const PALETTE2 = ['b', 'o'];
const PALETTE3 = ['b', 'o', 'p']; // p=紫（第三色，v2 引入）
const PALETTE4 = ['b', 'o', 'p', 'c']; // c=青（第四色，v3 引入）
const palette = NBALL === 2 ? PALETTE2 : NBALL === 3 ? PALETTE3 : PALETTE4;

const results = [];
for (let n = 0; n < SAMPLES; n++) {
  const used = new Set();
  const balls = [], ballState = [];
  let ok = true;
  for (let i = 0; i < NBALL; i++) {
    const p = randPos(used);
    if (!p) { ok = false; break; }
    balls.push({ color: palette[i], pos: [null, null] });
    balls[i].pos[p.c] = p.s;
  }
  if (!ok) continue;
  /* 目标：每球一个终点（同色多球时语义=任一匹配，isWin 已正确处理） */
  const targets = [];
  const tused = new Set();
  for (let i = 0; i < NBALL; i++) {
    const p = randPos(tused);
    if (!p) { ok = false; break; }
    targets.push({ ring: p.c, slot: p.s, color: palette[i] });
  }
  if (!ok) continue;
  /* 初始不可与目标重叠（已由 used 分离；但目标可与初始位在异轨同 slot——视觉允许） */
  const L = { name: '', hint: '', balls, targets };
  const r = solve(L, NBALL === 2 ? 15 : NBALL === 3 ? 14 : 20);
  if (!r.solvable || r.optimal === 0) continue;
  if (r.optimal < MINOPT || r.optimal > MAXOPT) continue;
  results.push({ balls, targets, optimal: r.optimal, count: r.count, firstBranch: r.firstBranch, gates: r.gateEvents.length, reachable: r.reachable, sample: r.sample });
}

/* 过滤质量标准（教学/挑战两档）：分支<=2、解条数 1..12 */
const q = results.filter(x => x.firstBranch >= 1 && x.firstBranch <= 2 && x.count >= 1 && x.count <= 12);
console.log(`球数 ${NBALL}  采样 ${SAMPLES}  可解 ${results.length}  过滤后候选 ${q.length}\n`);
/* 候选全量落盘（挑关/回溯复现用） */
try { require('fs').writeFileSync(`/tmp/candidates_${NBALL}ball.json`, JSON.stringify(q, null, 1)); console.log(`候选已写入 /tmp/candidates_${NBALL}ball.json\n`); } catch (e) { console.log('JSON落盘失败:' + e.message); }

/* 按最优步分带输出 */
const bands = NBALL === 2 ? [5, 7, 9, 11, 13, 15] : NBALL === 3 ? [9, 11, 13] : [8, 10, 12, 14, 16, 18];
for (let bi = 0; bi < bands.length - 1; bi++) {
  const lo = bands[bi], hi = bands[bi + 1] - 1;
  const band = q.filter(x => x.optimal >= lo && x.optimal <= hi)
    .sort((a, b) => (a.firstBranch - b.firstBranch) || (a.count - b.count));
  if (!band.length) continue;
  console.log(`---- 最优步 ${lo}~${hi}：${band.length} 个候选 ----`);
  for (const x of band.slice(0, 8)) {
    const bs = x.balls.map(b => (b.pos[0] !== null ? 'L' + b.pos[0] : 'R' + b.pos[1])).join(' ');
    const ts = x.targets.map(t => (t.ring === 0 ? 'L' : 'R') + t.slot + t.color).join(' ');
    console.log(`opt=${x.optimal} cnt=${x.count} fb=${x.firstBranch} gates=${x.gates} reach=${x.reachable} | init ${bs} | tgt ${ts} | ${x.sample.join(' ')}`);
  }
  console.log();
}
/* 最难档：分支=2 且解条数少（唯一解感） */
const hard = q.filter(x => x.optimal >= (NBALL === 2 ? 12 : 12) && x.firstBranch === 2 && x.count <= 6)
  .sort((a, b) => b.optimal - a.optimal);
if (hard.length) {
  console.log(`---- 高难精选（opt>=12, fb=2, cnt<=6）：${hard.length} 个 ----`);
  for (const x of hard.slice(0, 10)) {
    const bs = x.balls.map(b => (b.pos[0] !== null ? 'L' + b.pos[0] : 'R' + b.pos[1])).join(' ');
    const ts = x.targets.map(t => (t.ring === 0 ? 'L' : 'R') + t.slot + t.color).join(' ');
    console.log(`opt=${x.optimal} cnt=${x.count} fb=${x.firstBranch} gates=${x.gates} reach=${x.reachable} | init ${bs} | tgt ${ts} | ${x.sample.join(' ')}`);
  }
}