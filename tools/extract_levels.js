#!/usr/bin/env node
/* extract_levels.js：从游戏 HTML 提取 LEVELS 数组 → verify_levels.js 可验证的 JSON。
 * 双保险：游戏内数据 == tools/levels-v2.json 的可解性/最优步。
 * 用法：node tools/extract_levels.js prototype/levels-v1.html > tools/game_levels_extracted.json
 */
'use strict';
const fs = require('fs');
const html = fs.readFileSync(process.argv[2] || 'prototype/levels-v1.html', 'utf8');
const m = html.match(/const LEVELS=\[([\s\S]*?)\n\];/);
if (!m) { console.error('LEVELS 数组未找到'); process.exit(1); }
const arr = eval('[' + m[1] + ']'); // eslint-disable-line no-eval
const out = {
  levels: arr.map(L => ({
    name: L.name, optimal: L.optimal,
    balls: L.balls.map(b => ({ color: b.color, pos: b.pos.slice() })),
    targets: L.targets
  }))
};
process.stdout.write(JSON.stringify(out, null, 2) + '\n');