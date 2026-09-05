import fs from 'fs'; import path from 'path';
const root = process.argv[2];
const files = [];
(function walk(d){ for (const e of fs.readdirSync(d,{withFileTypes:true})) { const p=path.join(d,e.name); if(e.isDirectory()){ if(e.name!=='__tests__') walk(p);} else if(p.endsWith('.js') && !p.endsWith('.test.js')) files.push(p);} })(root);
const rows = [];
for (const f of files) {
  const src = fs.readFileSync(f,'utf8');
  let i = 0;
  while ((i = src.indexOf('computed(', i)) !== -1) {
    // skip identifiers like `useComputed(` or property `.computed(`
    const prev = src[i-1]; if (prev && /[\w$.]/.test(prev)) { i += 9; continue; }
    let depth = 0, j = i + 8, start = j;
    for (; j < src.length; j++) { const c = src[j]; if (c==='(') depth++; else if (c===')') { depth--; if (depth===0) break; } }
    const body = src.slice(start+1, j);
    // name: look back for `const name = ` or `name: `
    const before = src.slice(Math.max(0,i-80), i);
    const m = before.match(/(?:const|let)\s+([\w$]+)\s*=\s*$/) || before.match(/([\w$]+)\s*:\s*$/);
    const name = m ? m[1] : '?';
    const lines = body.split('\n').length;
    const writable = /^\s*\{[\s\S]*\bset\b/.test(body);
    const heavy = /\.(map|filter|sort|reduce|forEach|slice\(|splice|concat|flat)\(|\bfor\s*\(|\bwhile\s*\(|new Array|Object\.(keys|values|entries)/.test(body);
    rows.push({ file: path.relative(root,f), name, lines, writable, heavy, body: body.replace(/\s+/g,' ').slice(0,140) });
    i = j;
  }
}
const total = rows.length;
const w = rows.filter(r=>r.writable).length;
const h = rows.filter(r=>!r.writable && r.heavy).length;
const trivial = rows.filter(r=>!r.writable && !r.heavy);
const oneLiner = trivial.filter(r=>r.lines<=2).length;
console.log({ total, writable: w, heavy: h, trivialPlain: trivial.length, trivialOneLiner: oneLiner });
fs.writeFileSync(process.argv[3], JSON.stringify(rows,null,1));
// show heavy ones
console.log('\n--- heavy sample ---');
for (const r of rows.filter(r=>!r.writable&&r.heavy).slice(0,40)) console.log(r.file.padEnd(48), r.name.padEnd(22), r.lines+'L', r.body.slice(0,70));
