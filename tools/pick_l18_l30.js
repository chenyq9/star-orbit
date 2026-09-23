#!/usr/bin/env node
/* Star Orbit 三章挑关器 v1（L18-L30 十三关）
 * 输入：/tmp/candidates_all4.json（合并去重候选池）
 * 规则：按 DESIGN_SPEC 三章带位难度曲线挑关，六维指纹约束（opt/cnt/fb 优先级），互不重复
 * 输出：/tmp/levels_l18_l30.json（终选13关）+ 控制台摘要
 */
'use strict';
const fs = require('fs');
const pool = require('/tmp/candidates_all4.json');

/* 三章分带需求（源自 DESIGN_SPEC §2 + 三章四球设计计划）：
 * L18 青球登场（opt回落~10，fb=1）
 * L19 巩固（opt 11，fb=1）
 * L20 巩固（opt 12，fb=1）
 * L21 巩固（opt 13，fb=1）
 * L22 巩固（opt 14，fb=1）
 * L23 四球小考（opt ~15，fb=2，cnt≤4）
 * L24 渐升（opt 15，fb=2）
 * L25 连锁洞见（opt 16，fb=2，gates≥2）
 * L26 迷宫带（opt 16-17，cnt≤3 窄解）
 * L27 迷宫带（opt 17，cnt≤2）
 * L28 渐升（opt 17，fb=1）
 * L29 回落休息（opt 12-13，fb=1）
 * L30 终局（opt 18-19，fb=2，cnt≤3）
 */
const REQS = [
  { id: 18, opt: [9, 11],  fb: [1, 1], cnt: [1, 6] },   // 青球登场回落
  { id: 19, opt: [11, 12], fb: [1, 1], cnt: [1, 8] },
  { id: 20, opt: [12, 13], fb: [1, 1], cnt: [1, 8] },
  { id: 21, opt: [13, 14], fb: [1, 2], cnt: [1, 8] },
  { id: 22, opt: [14, 15], fb: [1, 2], cnt: [1, 8] },
  { id: 23, opt: [15, 16], fb: [2, 2], cnt: [1, 4] },   // 小考
  { id: 24, opt: [15, 16], fb: [1, 2], cnt: [1, 8] },
  { id: 25, opt: [16, 17], fb: [1, 2], cnt: [1, 8] },
  { id: 26, opt: [16, 18], fb: [1, 2], cnt: [1, 3] },   // 迷宫窄解
  { id: 27, opt: [17, 18], fb: [1, 2], cnt: [1, 2] },    // 迷宫唯一解感
  { id: 28, opt: [17, 18], fb: [1, 2], cnt: [1, 8] },
  { id: 29, opt: [12, 13], fb: [1, 1], cnt: [1, 8] },    // 回落休息
  { id: 30, opt: [18, 20], fb: [2, 2], cnt: [1, 3] },   // 终局
];

const picked = [];
const used = new Set();
function keyOf(x) {
  return x.balls.map(b => b.pos.join(',')).join('|') + '#' + x.targets.map(t => t.ring + ',' + t.slot + t.color).join('|');
}
for (const req of REQS) {
  const band = pool.filter(x =>
    x.optimal >= req.opt[0] && x.optimal <= req.opt[1] &&
    x.firstBranch >= req.fb[0] && x.firstBranch <= req.fb[1] &&
    x.count >= req.cnt[0] && x.count <= req.cnt[1] &&
    !used.has(keyOf(x)));
  if (!band.length) {
    console.log(`L${req.id}: 无满足候选（opt ${req.opt[0]}-${req.opt[1]} fb ${req.fb[0]}-${req.fb[1]} cnt ${req.cnt[0]}-${req.cnt[1]}）——放宽重挑`);
    band.push(...pool.filter(x =>
      x.optimal >= req.opt[0] && x.optimal <= req.opt[1] &&
      !used.has(keyOf(x))));
  }
  if (!band.length) { console.log(`L${req.id}: 彻底无候选，需扩池`); continue; }
  /* 挑选策略：gates 高者优先（窗口利用多的更有谜味），次按 reach 中位（避开平凡关） */
  band.sort((a, b) => (b.gates - a.gates) || (Math.abs(a.reachable - 150000) - Math.abs(b.reachable - 150000)));
  const best = band[0];
  used.add(keyOf(best));
  picked.push({ id: req.id, ...best });
  console.log(`L${req.id}: opt=${best.optimal} cnt=${best.count} fb=${best.firstBranch} gates=${best.gates} reach=${best.reachable}`);
}

fs.writeFileSync('/tmp/levels_l18_l30.json', JSON.stringify(picked, null, 1));
console.log(`\n终选 ${picked.length}/13 关 → /tmp/levels_l18_l30.json`);
if (picked.length < 13) process.exit(1);