/* Star Orbit 规则核心（唯一事实来源）
 * 与 prototype/levels-v1.html 的 simStep/hasDup/checkWin 逐行同源。
 * verify_levels.js 与 gen_levels.js 共同 require 本文件，保证验证/生成/游戏三方同语义。
 */
'use strict';
const SLOTS = 12;
const WINDOW_SLOTS = { 0: [10, 2], 1: [8, 4] }; // 交点槽（目标应避开）
function gatePartner(c, s) {
  if (c === 0) { if (s === 10) return 8; if (s === 2) return 4; return null; }
  if (s === 8) return 10; if (s === 4) return 2; return null;
}
/* state = array of [leftSlot|null, rightSlot|null] */
function simStep(state, ci, dir) {
  const sim = state.map(p => p.slice());
  for (const p of sim) { if (p[ci] !== null) p[ci] = (p[ci] + dir + SLOTS) % SLOTS; }
  for (const p of sim) {
    if (p[ci] === null) continue;
    const o = 1 - ci, g = gatePartner(ci, p[ci]);
    p[o] = (g !== null) ? g : null;
  }
  return sim;
}
function hasDup(state) {
  for (let c = 0; c < 2; c++) {
    const seen = new Set();
    for (const p of state) { if (p[c] === null) continue; if (seen.has(p[c])) return true; seen.add(p[c]); }
  }
  return false;
}
function stateKey(s) { return s.map(p => p[0] + ',' + p[1]).join('|'); }
function isWin(state, colors, targets) {
  return targets.every(t => state.some((p, i) => colors[i] === t.color && p[t.ring] === t.slot));
}
const MOVE_NAMES = { '0,1': 'L+', '0,-1': 'L-', '1,1': 'R+', '1,-1': 'R-' };

/* 分层 BFS：optimal 步 / 最短解条数 / 首步分支 / 样例解及其窗口事件（按球） */
function solve(level, maxSteps = 26) {
  const colors = level.balls.map(b => b.color);
  const start = level.balls.map(b => b.pos.slice());
  const targets = level.targets;
  if (isWin(start, colors, targets)) {
    return { solvable: true, optimal: 0, count: 1, firstBranch: 0, firsts: [], sample: [], gateEvents: [], reachable: 1 };
  }
  const seen = new Set([stateKey(start)]);
  let layer = [{ state: start, path: [], count: 1 }];
  for (let d = 1; d <= maxSteps; d++) {
    const winHits = [];
    const nextMap = new Map();
    for (const node of layer) {
      for (const ci of [0, 1]) for (const dir of [1, -1]) {
        const ns = simStep(node.state, ci, dir);
        if (hasDup(ns)) continue;
        const mv = MOVE_NAMES[ci + ',' + dir];
        const path = node.path.concat(mv);
        if (isWin(ns, colors, targets)) { winHits.push({ count: node.count, first: path[0], path }); continue; }
        const k = stateKey(ns);
        if (seen.has(k)) continue;
        seen.add(k);
        const ex = nextMap.get(k);
        if (ex) { ex.count += node.count; ex.paths.push(path); }
        else nextMap.set(k, { state: ns, count: node.count, paths: [path] });
      }
    }
    if (winHits.length) {
      const count = winHits.reduce((a, h) => a + h.count, 0);
      const firstSet = new Set(winHits.map(h => h.first));
      const sample = winHits[0].path;
      const gateEvents = gateTrace(start, sample);
      return { solvable: true, optimal: d, count, firstBranch: firstSet.size, firsts: [...firstSet].sort(), sample, gateEvents, reachable: seen.size };
    }
    const next = [];
    for (const n of nextMap.values()) next.push({ state: n.state, path: n.paths[0], count: n.count });
    if (!next.length) return { solvable: false, optimal: null, reachable: seen.size };
    layer = next;
  }
  return { solvable: false, optimal: null, note: '超深', reachable: seen.size };
}
/* 沿样例解回放，记录每球的窗口事件（enter=双挂发生, exit=脱离发生） */
function gateTrace(start, path) {
  const events = [];
  let cur = start.map(p => p.slice());
  path.forEach((mv, i) => {
    const ci = mv[0] === 'L' ? 0 : 1, dir = mv[1] === '+' ? 1 : -1;
    const ns = simStep(cur, ci, dir);
    ns.forEach((p, bi) => {
      const before = cur[bi];
      const wasDual = before[0] !== null && before[1] !== null;
      const isDual = p[0] !== null && p[1] !== null;
      if (!wasDual && isDual) events.push({ step: i + 1, ball: bi, type: 'enter', at: mv });
      if (wasDual && !isDual) events.push({ step: i + 1, ball: bi, type: 'exit', at: mv });
    });
    cur = ns;
  });
  return events;
}
module.exports = { SLOTS, WINDOW_SLOTS, gatePartner, simStep, hasDup, stateKey, isWin, solve, gateTrace, MOVE_NAMES };
