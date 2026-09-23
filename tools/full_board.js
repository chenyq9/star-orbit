#!/usr/bin/env node
/* Star Orbit 满盘验证器 v1（四章 L31-40 专用）
 * 12球满盘状态空间 ~26^12，BFS 不可行。本文件用 IDA*（迭代加深+下界启发）：
 *   - h(n) = 对每个未归位球，其到达目标的环内距离最小值之和 / 2（一次旋转动多球，乐观除2）
 *   - 生成法：回退法（与 gen_back 同思路，N 球泛化）
 * 用法：
 *   node tools/full_board.js probe            # 12球满盘连通性/可动性统计（当前规则堵门数据）
 *   node tools/full_board.js gen 6 200 42    # 6球满盘候选（球数/采样/种子）
 *   node tools/full_board.js idastar <json>   # 对关卡 JSON 跑 IDA* 求最优解
 */
'use strict';
const fs = require('fs');
const { SLOTS, WINDOW_SLOTS, gatePartner, simStep, hasDup, stateKey, isWin } = require('./orbit_core');

/* ---------- 满盘布局：circle.html 原始形态 ---------- */
/* 左环10球槽位 [0,1,3,4,5,6,7,8,9,11]（避开交点10,2） 右环10球 [0,1,2,3,5,6,7,9,10,11]（避开8,4）
 * 交点球2颗 [10,8] [2,4] —— 共22球=双环24槽的满盘（circle.html 实读） */
function circleLayout() {
  const balls = [];
  [0, 1, 3, 4, 5, 6, 7, 8, 9, 11].forEach(s => balls.push({ color: 'b', pos: [s, null] }));
  [0, 1, 2, 3, 5, 6, 7, 9, 10, 11].forEach(s => balls.push({ color: 'o', pos: [null, s] }));
  balls.push({ color: 'p', pos: [10, 8] });
  balls.push({ color: 'p', pos: [2, 4] });
  return balls;
}

/* ---------- 通用回退生成（N球满盘） ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* 满盘关生成：从目标布局回退 k 步得初始态（每步避开碰撞） */
function genFullBoard(NBALL, SAMPLES, SEED) {
  const rnd = mulberry32(SEED);
  const ri = n => Math.floor(rnd() * n);
  const results = [];
  let stuckCount = 0;
  for (let n = 0; n < SAMPLES; n++) {
    /* 目标：NBALL 球满盘布局（随机选球位子集；环身份色 b左/o右/p交点） */
    const leftFree = [0, 1, 3, 4, 5, 6, 7, 8, 9, 11];
    const rightFree = [0, 1, 2, 3, 5, 6, 7, 9, 10, 11];
    /* 随机取 NBALL-2 个左球位、同数量右球位，交点球2颗恒占（满盘带锚点） */
    const nb = Math.max(2, Math.floor((NBALL - 2) / 2));
    const nr = NBALL - 2 - nb;
    const shuffle = a => a.map(x => [rnd(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
    const Ls = shuffle(leftFree).slice(0, nb);
    const Rs = shuffle(rightFree).slice(0, nr);
    const goal = [];
    Ls.forEach(s => goal.push({ color: 'b', pos: [s, null] }));
    Rs.forEach(s => goal.push({ color: 'o', pos: [null, s] }));
    goal.push({ color: 'p', pos: [10, 8] });
    goal.push({ color: 'p', pos: [2, 4] });
    /* 回退 k 步（k 按 NBALL 调） */
    const k = 8 + ri(NBALL >= 10 ? 14 : 10);
    let state = goal.map(b => b.pos.slice());
    let valid = true;
    for (let step = 0; step < k; step++) {
      const ci = ri(2), dir = rnd() < 0.5 ? 1 : -1;
      const ns = simStep(state, ci, dir);
      if (hasDup(ns)) { step--; continue; }
      state = ns;
      if (step > 200) { valid = false; break; }
    }
    if (!valid) { stuckCount++; continue; }
    /* 同色多球：isWin 语义=任一同色球匹配该目标（已按颜色匹配，天然支持） */
    const targets = goal.map((b, i) => ({ ring: b.pos[0] !== null ? 0 : 1, slot: b.pos[0] !== null ? b.pos[0] : b.pos[1], color: b.color }));
    results.push({ balls: goal.map((b, i) => ({ color: b.color, pos: state[i] })), targets, k });
  }
  return { results, stuckCount };
}

/* ---------- IDA* 求解器 ---------- */
/* 启发下界：每球环内距离min之和/2（一次旋转可同时动多球，乐观）
 * 球距离：若球与目标同环=环内角距；异环=经交点的最短路径（左10↔右8、左2↔右4）
 */
function ballDist(pos, target) {
  const ringDist = (a, b) => { const d = Math.abs(a - b) % 12; return Math.min(d, 12 - d); };
  const [l, r] = pos;
  const tr = target.ring, ts = target.slot;
  if (tr === 0) {
    if (l !== null) return ringDist(l, ts);
    /* 球在右环，目标在左环：经两个交点取最短 (r→8→10→ts) 或 (r→4→2→ts) */
    return Math.min(ringDist(r, 8) + 1 + ringDist(10, ts), ringDist(r, 4) + 1 + ringDist(2, ts));
  } else {
    if (r !== null) return ringDist(r, ts);
    return Math.min(ringDist(l, 10) + 1 + ringDist(8, ts), ringDist(l, 2) + 1 + ringDist(4, ts));
  }
}
function heuristic(state, targets, colors) {
  let sum = 0;
  for (let ti = 0; ti < targets.length; ti++) {
    const t = targets[ti];
    let best = Infinity;
    for (let i = 0; i < state.length; i++) {
      if (colors[i] !== t.color) continue;
      const d = ballDist(state[i], t);
      if (d < best) best = d;
    }
    sum += best;
  }
  return Math.ceil(sum / 2);
}
function idastar(level, maxDepth = 40) {
  const colors = level.balls.map(b => b.color);
  const start = level.balls.map(b => b.pos.slice());
  const targets = level.targets;
  if (isWin(start, colors, targets)) return { solvable: true, optimal: 0, sample: [] };
  let path = null;
  let nodes = 0;
  function dfs(state, g, bound, prevMove, stack) {
    const h = heuristic(state, targets, colors);
    const f = g + h;
    if (f > bound) return f;
    if (h === 0 && isWin(state, colors, targets)) { path = stack.slice(); return -1; }
    let minNext = Infinity;
    for (const ci of [0, 1]) for (const dir of [1, -1]) {
      const mv = (ci === 0 ? 'L' : 'R') + (dir === 1 ? '+' : '-');
      if (prevMove && mv === prevMove[0]) continue; /* 剪枝：撤销上一步直接跳过 */
      const ns = simStep(state, ci, dir);
      if (hasDup(ns)) continue;
      nodes++;
      stack.push(mv);
      const t = dfs(ns, g + 1, bound, [mv, dir], stack);
      if (t === -1) return -1;
      stack.pop();
      if (t < minNext) minNext = t;
    }
    return minNext;
  }
  let bound = heuristic(start, targets, colors);
  while (bound <= maxDepth) {
    path = null;
    const t = dfs(start, 0, bound, null, []);
    if (t === -1) return { solvable: true, optimal: path.length, sample: path, nodes };
    if (t === Infinity) return { solvable: false, optimal: null, nodes };
    bound = t;
  }
  return { solvable: false, optimal: null, note: '超深', nodes };
}

/* ---------- probe：满盘堵门统计（当前规则） ---------- */
function probe() {
  const balls = circleLayout();
  const state = balls.map(b => b.pos.slice());
  let blocked = 0, free = 0;
  for (const ci of [0, 1]) for (const dir of [1, -1]) {
    const ns = simStep(state, ci, dir);
    if (hasDup(ns)) { blocked++; console.log(`方向 ${ci === 0 ? 'L' : 'R'}${dir === 1 ? '+' : '-'}: 堵门❌`); }
    else { free++; console.log(`方向 ${ci === 0 ? 'L' : 'R'}${dir === 1 ? '+' : '-'}: 可动✓`); }
  }
  console.log(`\ncircle.html 满盘22球（当前规则）：可动 ${free}/4，堵门 ${blocked}/4`);
  if (blocked === 4) console.log('⚠️  全堵——满盘下当前规则死局，印证 DESIGN_SPEC 堵门决策必要性');
  else console.log('部分可动——堵门是"局部死路"而非全局死局，可作谜题深度来源（待规则决策）');
  /* 去掉交点球的18球近满盘对照 */
  const state18 = state.filter((_, i) => balls[i].color !== 'p');
  let b18 = 0;
  for (const ci of [0, 1]) for (const dir of [1, -1]) { const ns = simStep(state18, ci, dir); if (hasDup(ns)) b18++; }
  console.log(`对照18球（去交点球）：堵门 ${b18}/4`);
  /* 12球 */
  const state12 = state.filter((_, i) => i < 12);
  let b12 = 0;
  for (const ci of [0, 1]) for (const dir of [1, -1]) { const ns = simStep(state12, ci, dir); if (hasDup(ns)) b12++; }
  console.log(`对照12球（前12个）：堵门 ${b12}/4`);
}

/* ---------- CLI ---------- */
module.exports = { circleLayout, genFullBoard, idastar, heuristic, ballDist };
const cmd = process.argv[2];
if (cmd === 'probe') {
  probe();
} else if (cmd === 'gen') {
  const NBALL = parseInt(process.argv[3] || '6', 10);
  const SAMPLES = parseInt(process.argv[4] || '200', 10);
  const SEED = parseInt(process.argv[5] || '42', 10);
  const { results, stuckCount } = genFullBoard(NBALL, SAMPLES, SEED);
  console.log(`满盘${NBALL}球 采样${SAMPLES} 产出${results.length} 回退死循环${stuckCount}`);
  fs.writeFileSync(`/tmp/candidates_full_${NBALL}.json`, JSON.stringify(results, null, 1));
  console.log(`→ /tmp/candidates_full_${NBALL}.json`);
} else if (cmd === 'idastar') {
  const lv = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  const t0 = Date.now();
  const r = idastar(lv, parseInt(process.argv[4] || '40', 10));
  console.log(JSON.stringify({ ...r, ms: Date.now() - t0 }, null, 1));
} else {
  console.log('用法: probe | gen <球数> <采样> <种子> | idastar <json文件> <深度上限>');
}