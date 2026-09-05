---
venue: README zh section
purpose: post
lang: zh
source: introducing-ivue; measured-not-promised
status: draft-for-review
---

## 中文简介

ivue 是一个 **1.1 kB 的 Vue 3 响应式类层**：普通 TypeScript class 变成响应式模型，实例仍是普通对象。状态由返回 `ref()`/`shallowRef()` 的 getter 提供；派生值使用普通 getter，通过 tracked read 获得响应式；方法保持稳定绑定。模型可以脱离组件运行。

| 项目 | 已测结果 |
| --- | --- |
| gzip 大小 | 1.1 kB |
| 依赖 | 0 |
| 测试覆盖率 | 100% |
| 实例创建 | 比对照方案快 55–253 倍 |
| 大规模模型 | 20,000,000 个单元格，约 4.7 bytes/格 |
| 实际应用 | Invar：约 108,000 行终端 IDE 源码，1 个 `computed()` |

### 最小示例

```ts
import { Reactive } from 'ivue'
import { ref } from 'vue'

class $Counter {
  get count() {
    return ref(0)
  }
  get double() {
    return this.count.value * 2
  }
  increment() {
    this.count.value++
  }
}

export const Counter = Reactive($Counter)
```

`Reactive()` 改造 prototype 一次。状态在第一次访问时创建并缓存；普通 getter 不会自动变成 `computed()`。完整文档与浏览器基准测试：

- https://ivue.dev
- https://ivue.dev/guide/getting-started
- https://ivue.dev/guide/benchmarks
- https://github.com/infinite-system/ivue

