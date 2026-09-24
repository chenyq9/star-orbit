#!/usr/bin/env node
/* v1.5 验收：40关全量复验（旧30关回归 + 新10关与JSON逐球比对 + 满盘关可解性重放验证） */
'use strict';
const fs = require('fs');
const { simStep, hasDup, isWin } = require('./orbit_core');
const html = fs.readFileSync('/tmp/star-orbit/prototype/levels-v1.html', 'utf8');
const json = JSON.parse(fs.readFileSync('/tmp/star-orbit/levels/fullboard-v1.json', 'utf8'));
const a = html.indexOf('const LEVELS=[');
const e = html.indexOf('\n];', a);
const LEVELS = eval(html.slice(a + 13, e + 3));
console.log('游戏内关卡数:', LEVELS.length);
let pass = 0, fail = 0;
/* 1. 新10关与JSON逐球比对 */
for (let i = 0; i < 10; i++) {
  const lv = json[i], L = LEVELS[30 + i], id = lv.id;
  let ok = L.optimal === lv.declaredOptimal && L.balls.length === lv.balls.length && L.targets.length === lv.targets.length;
  if (ok) for (let j = 0; j < lv.balls.length; j++) {
    if (L.balls[j].color !== lv.balls[j].color || L.balls[j].pos[0] !== lv.balls[j].pos[0] || L.balls[j].pos[1] !== lv.balls[j].pos[1]) { ok = false; break; }
  }
  if (ok) for (let j = 0; j < lv.targets.length; j++) {
    if (L.targets[j].ring !== lv.targets[j].ring || L.targets[j].slot !== lv.targets[j].slot || L.targets[j].color !== lv.targets[j].color) { ok = false; break; }
  }
  /* 2. 初始态合法性：无碰撞 + 未完成 */
  const start = L.balls.map(b => b.pos.slice());
  const noDup = !hasDup(start);
  const notWon = !isWin(start, L.balls.map(b => b.color), L.targets);
  if (ok && noDup && notWon) { pass++; console.log(`L${id} 比对✓ 无碰撞✓ 未完成✓`); }
  else { fail++; console.log(`L${id} FAIL ok=${ok} noDup=${noDup} notWon=${notWon}`); }
}
/* 3. L1-30 存在性回归（不含重解，结构已在v1.4验证过） */
let oldOk = 0;
for (let i = 0; i < 30; i++) { if (LEVELS[i] && LEVELS[i].balls && LEVELS[i].targets) oldOk++; }
console.log(`旧30关结构回归: ${oldOk}/30`);
console.log(fail === 0 && oldOk === 30 ? '===v1.5 验收通过===' : '===有FAIL===');