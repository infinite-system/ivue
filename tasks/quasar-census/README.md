# Quasar computed() census — the "order of magnitude" receipt

Measured 2026-09-05 against quasarframework/quasar HEAD 4dfd415
(2026-09-04), `ui/src` only, `*.test.js` and `__tests__` excluded.

```sh
git clone --depth 1 https://github.com/quasarframework/quasar.git ~/dev/quasar
node tasks/quasar-census/count-computed.mjs ~/dev/quasar/ui/src /tmp/computeds.json
```

| | count |
| --- | --- |
| component directories | 79 |
| component source files | 222 |
| `computed()` in components | 613 |
| `computed()` in shared composables | 44 |
| **total** | **667** |
| writable computeds | 1 (QPagination `model`) |
| bodies that iterate a collection (heuristic) | 49 |
| everything else (booleans, class strings, style objects, prop parsing) | 617 |
| of those, ≤ 5 lines | 346 |

## What an ivue port keeps as `computed()`

Hand-read of the 49 collection-scale bodies; kept only where a recompute
per read would walk USER data (rows, days, options, nodes):

- QDate: `days`, `daysModel`, `rangeModel`, `daysMap`, `rangeMap`,
  `selectionDaysMap`, `eventDaysMap`, `keyboardDays` (~8)
- QTable: `filteredSortedRows`, `computedRows`, `computedCols`,
  `computedColsMap`, `selectedKeys`, `allRowsSelected`, `someRowsSelected` (7)
- QTree: `structure`, `filterMatches`, meta (92L), meta (64L),
  `virtualRows`, `focusableKeys` (6)
- QSelect: `innerValue`, `optionScope`, `selectedScope`, `selectedString`,
  `innerOptionsValue` (5)
- use-slider: `markerTicks`, `markerLabelsList`, `markerLabelsMap` (3)
- QEditor: `buttons`, `keys` (2)
- QRating `stars`, QTime `positions`, QVirtualScroll `virtualScrollScope`,
  QTabs `tabStopName`, use-mask `tokens`, QBtnToggle `btnOptions`,
  QOptionGroup `innerOptions` (7)

≈ 38, plus a margin of ~10 for stable ref handles handed to third parties
→ **~50**. The writable one becomes a native accessor pair. The 34
`watch(someComputed, …)` sites become `watch(() => this.x)` on a getter.

**667 → ~50: 13–15×; 93 % of computeds become plain getters.**

## Per-instance receipts

- **QBtn carries 28 computeds per instance**: 6 in `QBtn.js`, 8 in
  `use-btn.js`, 14 in `use-router-link.js` — the router-link ones run
  on every button whether or not it links. Composition by function can
  only share behavior by RUNNING it; a base-class getter never read
  costs nothing.
- **Quasar already knows the cost**: `QIcon.js:267` — "no per-instance
  computeds: QIcon is mount-dominated" — hand-rolls a memo for its one
  hot component. Leaf tracking does that for all of them.

Heaviest files: use-slider 43, QDate 38, QSelect 28, QRange 24,
QDrawer 22, QScrollArea 19, QPagination 19, QTime 18, QTree 17,
use-router-link 14, QColor 14, use-field 13, QTable 13.
