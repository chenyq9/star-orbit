#!/usr/bin/env node
/* 主AI验收：L31-40 重产重植入（22球阶梯修正版）四层独立验证
 * 与子AI自检独立实现（不信任交付方自检）
 * 用法: node _verify_l3840.js <fourball目录> */
'use strict';
const fs = require('fs');
const path = require('path');
const dir = process.argv[2] || '/sdcard/Download/Operit/fourball';
const core = require(path.join(dir, 'orbit_core.js'));
const { simStep, hasDup, isWin } = core;
const before = fs.readFileSync('/tmp/star-orbit/prototype/levels-v1.html', 'utf8');
const after = fs.readFileSync(path.join(dir, 'levels-v1.html'), 'utf8');
const json = JSON.parse(fs.readFileSync(path.join(dir, 'fullboard-v1.json'), 'utf8'));
let fails = 0;
const chk = (name, ok, detail) => { console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' | ' + detail : '')); if (!ok) fails++; };

/* 层1：JSON 结构 */
const expectN = [6, 6, 8, 8, 10, 10, 12, 16, 20, 22];
chk('JSON 10关', json.length === 10, '实际' + json.length);
json.forEach((lv, i) => {
  const c = {}; lv.balls.forEach(b => c[b.color] = (c[b.color] || 0) + 1);
  chk(`L${lv.id} 球数=${expectN[i]}`, lv.balls.length === expectN[i], '实际' + lv.balls.length);
  chk(`L${lv.id} 色分布 b=${c.b} o=${c.o} p=${c.p}`, c.b === c.o && c.p === 2);
  chk(`L${lv.id} declaredOptimal=${lv.declaredOptimal} k=${lv.k} 一致`, lv.declaredOptimal === lv.k);
});

/* 层2：path 逆序重演归位（构造性可解证明，主AI独立重演） */
json.forEach(lv => {
  let s = lv.balls.map(b => b.pos.slice());
  const path = lv.path || [];
  for (let i = path.length - 1; i >= 0; i--) {
    const [ci, dr] = path[i];
    s = simStep(s, ci, -dr);
  }
  const colors = lv.balls.map(b => b.color);
  chk(`L${lv.id} path重演归位 isWin`, isWin(s, colors, lv.targets), 'path长' + path.length);
  chk(`L${lv.id} path长=${lv.k}`, path.length === lv.k);
  chk(`L${lv.id} 初始无碰撞`, !hasDup(lv.balls.map(b => b.pos.slice())));
  chk(`L${lv.id} 初始未完成`, !isWin(lv.balls.map(b => b.pos.slice()), colors, lv.targets));
});

/* 层3：HTML L1-30 字节不变 */
const cut = s => s.indexOf("  {name:'第31关");
chk('HTML L1-30前缀字节不变', before.slice(0, cut(before)) === after.slice(0, cut(after)));

/* 层4：HTML L31-40 与 JSON 逐字段一致（从 HTML 反向提取） */
const m = /const LEVELS\s*=\s*\[([\s\S]*?)\];/.exec(after);
if (!m) { chk('HTML LEVELS 提取', false); }
else {
  const LEVELS = eval('[' + m[1] + ']');
  chk('HTML 总关卡数40', LEVELS.length === 40, '实际' + LEVELS.length);
  LEVELS.slice(30, 40).forEach((L, i) => {
    const lv = json[i];
    const bOk = L.balls.length === lv.balls.length && L.balls.every((b, j) => b.color === lv.balls[j].color && b.pos[0] === lv.balls[j].pos[0] && b.pos[1] === lv.balls[j].pos[1]);
    const tOk = L.targets.length === lv.targets.length && L.targets.every((t, j) => t.ring === lv.targets[j].ring && t.slot === lv.targets[j].slot && t.color === lv.targets[j].color);
    chk(`HTML L${lv.id} balls一致`, bOk);
    chk(`HTML L${lv.id} targets一致`, tOk);
    chk(`HTML L${lv.id} optimal=${L.optimal} 与声明k一致`, L.optimal === lv.declaredOptimal);
  });
}
console.log(fails === 0 ? '=== 验收全部通过 ===' : `=== 验收失败 ${fails} 项 ===`);
process.exit(fails ? 1 : 0);
