#!/usr/bin/env node
/* Star Orbit 回退生成器 v1（4球中低步数带专用）
 * 原理：随机生成已归位的终局 → 从终局反向走 k 步得初始态 → solveFast 验证真实 opt
 *       精确命中 opt=10~16 的关卡（随机采样法在此区间命中率为 0）
 * 用法：node tools/gen_back.js [球数=4] [每档采样=200] [seed=42]
 * 输出：/tmp/candidates_back_Nball.json + 控制台分带摘要
 */
'use strict';
const fs = require('fs');
const argv = process.argv.slice(2);
const NBALL = parseInt(argv[0] || '4', 10);
const SAMPLES = parseInt(argv[1] || '200', 10);
const SEED = parseInt(argv[2] || '42', 10);
const { SLOTS, WINDOW_SLOTS } = require('./orbit_core');
const { solve } = require('./orbit_core_fast');

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

const PALETTE4 = ['b', 'o', 'p', 'c'];
const palette = NBALL === 4 ? PALETTE4 : ['b', 'o', 'p', 'c'].slice(0, NBALL);

/* simStep 本地复刻（与 orbit_core 同语义）：转 ci 轨 dir 方向 */
function gatePartner(c, s) {
  if (c === 0) { if (s === 10) return 8; if (s === 2) return 4; return null; }
  if (s === 8) return 10; if (s === 4) return 2; return null;
}
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

/* 随机生成一个无碰撞的归位终局（4球各在自己目标上） */
function randSolved() {
  for (let t = 0; t < 200; t++) {
    const used = new Set();
    const balls = [], targets = [];
    let ok = true;
    for (let i = 0; i < NBALL; i++) {
      const c = ri(2), s = ri(SLOTS);
      if (WINDOW_SLOTS[c].includes(s)) { ok = false; break; } // 目标避开交点槽
      const key = c + ',' + s;
      if (used.has(key)) { ok = false; break; }
      used.add(key);
      const pos = [null, null]; pos[c] = s;
      balls.push({ color: palette[i], pos });
      targets.push({ ring: c, slot: s, color: palette[i] });
    }
    if (ok) return { balls, targets };
  }
  return null;
}

const results = [];
let tries = 0;
const TARGET_OPTS = [10, 11, 12, 13, 14, 15, 16];
const perBand = { 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0 };

for (let n = 0; n < SAMPLES && tries < SAMPLES * 10; n++) {
  const solved = randSolved();
  if (!solved) { n--; tries++; continue; }
  tries++;
  /* 反向走 k 步（k 加大：opt 会因走回头路缩水，k=16~24 才能稳定命中 opt 12~16） */
  const k = 16 + ri(9);
  let state = solved.balls.map(b => b.pos.slice());
  let valid = true;
  for (let step = 0; step < k; step++) {
    const ci = ri(2), dir = rnd() < 0.5 ? 1 : -1;
    const ns = simStep(state, ci, dir);
    if (hasDup(ns)) { step--; continue; } // 碰撞则重选本步
    state = ns;
    if (step > 60) { valid = false; break; } // 碰撞死循环保护
  }
  if (!valid) continue;
  /* state 为初始态；与终局相同色序 → 构造关卡 */
  const L = { name: '', hint: '', balls: solved.balls.map((b, i) => ({ color: b.color, pos: state[i] })), targets: solved.targets };
  const r = solve(L, 20);
  if (!r.solvable || r.optimal === 0) continue;
  if (r.optimal < 8 || r.optimal > 20) continue;
  if (r.firstBranch < 1 || r.firstBranch > 2) continue;
  if (r.count < 1 || r.count > 12) continue;
  results.push({ balls: L.balls, targets: L.targets, optimal: r.optimal, count: r.count, firstBranch: r.firstBranch, gates: r.gateEvents.length, reachable: r.reachable, sample: r.sample });
  if (perBand[r.optimal] !== undefined) perBand[r.optimal]++;
}

/* 质量过滤（与 gen_levels 相同标准） */
const q = results.filter(x => x.firstBranch >= 1 && x.firstBranch <= 2 && x.count >= 1 && x.count <= 12);
console.log(`球数 ${NBALL} 回退采样 ${SAMPLES} 产出候选 ${q.length}`);
const dist = {};
q.forEach(x => { dist[x.optimal] = (dist[x.optimal] || 0) + 1; });
console.log('opt分布', JSON.stringify(dist));
try { fs.writeFileSync(`/tmp/candidates_back_${NBALL}ball.json`, JSON.stringify(q, null, 1)); console.log(`已写入 /tmp/candidates_back_${NBALL}ball.json`); } catch (e) { console.log('落盘失败', e.message); }
