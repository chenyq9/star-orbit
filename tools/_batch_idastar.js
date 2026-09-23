#!/usr/bin/env node
/* 满盘候选批跑 IDA*：验证每关可解性+实测opt（与回退k对照）
 * 运行环境：GitHub Actions（重计算准入制 §11.1——本地禁止裸跑 >2min 任务） */
'use strict';
const fs = require('fs');
const { idastar } = require('./full_board.js');
const q = JSON.parse(fs.readFileSync(process.argv[2] || '/tmp/candidates_full_6.json', 'utf8'));
const LIMIT = parseInt(process.argv[3] || '50', 10);
const PER_CASE_TIMEOUT_MS = 5 * 60 * 1000; /* 单关上限5分钟（云端90分钟job内自保） */
let ok = 0, fail = 0, times = [];
const tAll = Date.now();
for (let i = 0; i < Math.min(q.length, LIMIT); i++) {
  const lv = q[i];
  const t0 = Date.now();
  const r = idastar(lv, 45);
  const ms = Date.now() - t0;
  times.push(ms);
  if (r.solvable) { ok++; console.log(`#${i} opt=${r.optimal} (回退k=${lv.k}) ${ms}ms nodes=${r.nodes}`); }
  else { fail++; console.log(`#${i} 不可解 ${ms}ms`); }
}
times.sort((a, b) => a - b);
console.log(`\n可解 ${ok}/${Math.min(q.length, LIMIT)}，耗时中位 ${times[Math.floor(times.length / 2)]}ms，最大 ${times[times.length - 1]}ms，总 ${Date.now() - tAll}ms`);