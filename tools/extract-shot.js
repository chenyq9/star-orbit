#!/usr/bin/env node
/* 从 browser evaluate 落盘文件中提取 Result 段的 base64，拼装成 PNG
   用法: node extract-shot.js <响应文件...> <输出.png> */
const fs = require('fs');
const files = process.argv.slice(2, -1);
const out = process.argv[process.argv.length - 1];
let b64 = '';
for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  const m = txt.match(/### Result\n([\s\S]*?)\n*$/);
  if (!m) { console.error('no Result in', f); process.exit(1); }
  let chunk = m[1].trim();
  // 去掉可能的引号包裹
  chunk = chunk.replace(/^"|"$/g, '');
  b64 += chunk;
}
fs.writeFileSync(out, Buffer.from(b64, 'base64'));
const stat = fs.statSync(out);
console.log('written', out, stat.size, 'bytes, valid PNG:', (Buffer.from(b64,'base64').slice(1,4).toString()==='PNG'));
