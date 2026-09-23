/* Star Orbit 快速求解核心（4球三章扩产用，2026-09-23 重写修复）
 * 与 tools/orbit_core.js 的 simStep/hasDup/isWin 语义同源：
 *   - 单球转移表不手写，由 orbit_core.simStep 对 28 个单球状态枚举推导
 *   - hasDup/isWin 语义与 orbit_core 完全一致（同轨道禁止两球、目标匹配）
 *   - 全部候选必须经 tools/verify_levels.js（orbit_core 原版 BFS）复核，此处只做粗筛
 * 用法：node tools/orbit_core_fast.js levels.json（校验字段）；node tools/gen_levels.js 直接调用 solveFast
 */
'use strict';
const { SLOTS, simStep } = require('./orbit_core');
const WINDOW_SLOTS = { 0: [10, 2], 1: [8, 4] }; // 与 orbit_core.js 同值，re-export 兼容 gen_levels

/* ---------- 单球状态空间（26 态：单挂24=12左+12右，双挂2=(10,8),(2,4)） ---------- */
const SC = []; // index → [l, r]（-1 表 null）
const SC_MAP = new Map();
for (let l = -1; l < SLOTS; l++) {
  for (let r = -1; r < SLOTS; r++) {
    const singleLeft = (l >= 0 && r === -1);
    const singleRight = (l === -1 && r >= 0);
    const dual = (l === 10 && r === 8) || (l === 2 && r === 4);
    if (singleLeft || singleRight || dual) {
      SC_MAP.set(l + ',' + r, SC.length);
      SC.push([l, r]);
    }
  }
}
if (SC.length !== 26) throw new Error('单球状态数应为26，实际' + SC.length);
const PER = SC.length;

/* ---------- 单球转移表：T[move][stateIdx] → stateIdx' ----------
 * 由 orbit_core.simStep 推导（同源保证）：对每个单球状态跑 simStep 取结果
 */
const TRANS = [0, 1, 2, 3].map(mv => {
  const ci = mv < 2 ? 0 : 1, dir = mv % 2 === 0 ? 1 : -1;
  const t = new Int32Array(PER);
  for (let i = 0; i < PER; i++) {
    const inp = [SC[i][0] === -1 ? null : SC[i][0], SC[i][1] === -1 ? null : SC[i][1]];
    const ns = simStep([inp], ci, dir)[0]; // 单球无碰撞
    const key = (ns[0] === null ? -1 : ns[0]) + ',' + (ns[1] === null ? -1 : ns[1]);
    const j = SC_MAP.get(key);
    if (j === undefined) throw new Error('转移表缺口:' + key);
    t[i] = j;
  }
  return t;
});

/* ---------- 快速求解（分层 BFS，四球） ----------
 * state = Uint8Array(N)：每球状态 idx。碰撞检查：同轨槽位不重复（实时 Set 查重）
 */
function solveFast(level, maxSteps = 20) {
  const N = level.balls.length;
  if (N > 4) throw new Error('solveFast 设计上限4球');
  const start = new Uint8Array(N);
  level.balls.forEach((b, i) => {
    const l = b.pos[0] === null ? -1 : b.pos[0];
    const r = b.pos[1] === null ? -1 : b.pos[1];
    const k = l + ',' + r;
    const j = SC_MAP.get(k);
    if (j === undefined) throw new Error('非法球位:' + k);
    start[i] = j;
  });
  // 目标压缩：每球 (ring, slot) 列表
  const goals = level.targets.map(t => ({ color: t.color, ring: t.ring, slot: t.slot }));
  const colors = level.balls.map(b => b.color);
  const keyOf = s => { let h = 0; for (let i = 0; i < N; i++) h = h * PER + s[i]; return h; };
  const isWinF = s => goals.every(g => {
    for (let i = 0; i < N; i++) {
      if (colors[i] !== g.color) continue;
      const [l, r] = SC[s[i]];
      const v = g.ring === 0 ? l : r;
      if (v === g.slot) return true;
    }
    return false;
  });
  const seen = new Set([keyOf(start)]);
  if (isWinF(start)) return { solvable: true, optimal: 0, count: 1, firstBranch: 0, firsts: [], sample: [], gateEvents: [], reachable: 1 };
  let layer = [{ s: start, path: [] }];
  const countMap = new Map([[keyOf(start), 1]]);
  for (let d = 1; d <= maxSteps; d++) {
    const nextMap = new Map();
    const winHits = [];
    for (const node of layer) {
      for (let mv = 0; mv < 4; mv++) {
        const ci = mv < 2 ? 0 : 1, dir = mv % 2 === 0 ? 1 : -1;
        // 应用转移 + 碰撞检查
        const ns = new Uint8Array(node.s);
        for (let i = 0; i < N; i++) ns[i] = TRANS[mv][node.s[i]];
        if (hasDupF(ns)) continue;
        const mvName = ['L+', 'L-', 'R+', 'R-'][mv];
        const path = node.path.concat(mvName);
        if (isWinF(ns)) { winHits.push({ count: countMap.get(keyOf(node.s)) || 1, first: path[0], path }); continue; }
        const k = keyOf(ns);
        if (seen.has(k)) continue;
        seen.add(k);
        const ex = nextMap.get(k);
        if (ex) ex.cnt += 1; else nextMap.set(k, { s: ns, path, cnt: 1 });
      }
    }
    if (winHits.length) {
      const count = winHits.reduce((a, h) => a + h.count, 0);
      const firstSet = new Set(winHits.map(h => h.first));
      const sample = winHits[0].path;
      return { solvable: true, optimal: d, count, firstBranch: firstSet.size, firsts: [...firstSet].sort(), sample, gateEvents: [], reachable: seen.size };
    }
    layer = [];
    for (const n of nextMap.values()) layer.push({ s: n.s, path: n.path });
    for (const [k, c] of nextMap) countMap.set(k, c.cnt);
    if (!layer.length) return { solvable: false, optimal: null, reachable: seen.size };
  }
  return { solvable: false, optimal: null, note: '超深', reachable: seen.size };
  function hasDupF(s) {
    const occ = [new Uint8Array(SLOTS), new Uint8Array(SLOTS)];
    for (let i = 0; i < N; i++) {
      const [l, r] = SC[s[i]];
      if (l >= 0) { if (occ[0][l]) return true; occ[0][l] = 1; }
      if (r >= 0) { if (occ[1][r]) return true; occ[1][r] = 1; }
    }
    return false;
  }
}
module.exports = { SLOTS, WINDOW_SLOTS, SC, SC_MAP, TRANS, solveFast, solve: solveFast };
