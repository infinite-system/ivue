// The kit's two paths, timed: `seam` (the render path — per role per render) and `derive` / `order`
// (the derive path — once per kit at load). ns per op, warm loop, median of five runs.
// Run from the repo root: npx vite-node examples/playground/src/kit/Kit.bench.js
import { Kit } from './Kit';
import { Static } from '../Static';

// a base the shape of the chat's message row: eight roles, six ordered, a bound list role
class $Row {
  static get $kit() {
    return {
      Gutter: { view: 'div' },
      Head: { view: 'header' },
      Stub: { view: 'div' },
      Parts: { view: 'div' },
      Await: { view: 'div' },
      Foot: { view: 'footer' },
      Text: { view: 'p', bind: ({ model, item }) => ({ part: item, chat: model.chat }) },
      Rule: { view: 'hr', bind: () => ({ class: 'rule' }) },
      order: ['Gutter', 'Head', 'Stub', 'Parts', 'Await', 'Foot']
    };
  }
}
const Row = { $Class: Static($Row), Class: Static($Row) };
const model = { chat: {}, cap: 3 };
const kit = Row.$Class.$kit;
const Layered = Kit.Class.derive(
  Kit.Class.derive(Row, { Text: { bind: ({ inherited }) => ({ ...inherited(), cap: 1 }) } }),
  { Text: { bind: ({ inherited, key }) => ({ ...inherited(), lang: `k${key}` }) } }
);
const patch = {
  order: { after: { Head: ['Badge'] } },
  Badge: { view: 'span', bind: () => ({ class: 'badge' }) },
  Head: { view: 'h2' },
  Foot: { bind: ({ inherited }) => ({ ...inherited(), class: 'lead' }) }
};
const cleanOrder = { without: ['Gutter'], after: { Head: ['Badge'] }, move: { Foot: { before: 'Parts' } } };
const cycleOrder = { move: { Head: { after: 'Foot' }, Foot: { after: 'Head' } } };
const order = (base, relations) => Kit.Class.order(base, relations);

function median(label, rounds, body) {
  const times = [];
  for (let run = 0; run < 5; run++) {
    for (let index = 0; index < Math.min(rounds, 100_000); index++) body(index); // warm
    const start = process.hrtime.bigint();
    for (let index = 0; index < rounds; index++) body(index);
    times.push(Number(process.hrtime.bigint() - start) / rounds);
  }
  times.sort((left, right) => left - right);
  console.log(`${label.padEnd(44)} ${times[2].toFixed(1).padStart(8)} ns/op  (${rounds.toLocaleString()} ops × 5, median)`);
}

const { seam } = Kit.Class;
let sink = 0;
median('seam — unbound role', 1_000_000, (index) => { sink += seam(model, kit.Head, undefined, index).kit ? 1 : 0; });
median('seam — bound role, one layer', 1_000_000, (index) => { sink += seam(model, kit.Text, 'abc', index).part ? 1 : 0; });
median('seam — bound role, two layers', 1_000_000, (index) => { sink += seam(model, Layered.$Class.$kit.Text, 'abc', index).lang ? 1 : 0; });
median('order — clean, three relations', 100_000, () => { sink += order(kit.order, cleanOrder).length; });
median('order — cycle refused', 100_000, () => { try { order(kit.order, cycleOrder); } catch { sink++; } });
median('derive — 3 entries + 1 relation, 8 roles', 20_000, () => { sink += Kit.Class.derive(Row, patch).$Class.$kit.order.length; });
console.log(`(sink ${sink})`);
