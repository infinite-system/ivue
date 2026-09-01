---
venue: juejin.cn
purpose: translation
lang: zh
source: introducing-ivue
status: draft-for-review
---

# 1.1 kB，让响应式类真正可用

如果你想用普通 class 保存状态、方法和继承关系，却不想为每个实例支付一组 proxy、闭包和 computed，ivue 给出了一条更短的路径。

ivue 是一个 1.1 kB 的 Vue 响应式类层。普通 TypeScript class 可以变成响应式模型，实例仍然是普通对象。它不要求组件拥有模型，也不要求把所有派生值都包装成 computed。

```ts
import { Reactive } from 'ivue'
import { ref } from 'vue'

class $Counter {
  get count() {
    return ref(0)
  }
  get double() {
    return this.count.value * 2 // plain getter — derives on read
  }
  increment() {
    this.count.value++
  }
}

export const Counter = Reactive($Counter)
```

`Reactive()` 只改造一次 prototype。返回 `ref()` 的 getter 会在第一次访问时创建并缓存状态；普通 getter 继续是普通 getter。它读取了响应式值，就会在当前 effect 中被 Vue 跟踪，不需要为每个派生值再分配一个 computed 节点。方法会延迟绑定到正确的 `this`，因此可以直接作为事件处理器传递。实例没有 proxy 包装。

数字来自可复现的测量：引擎大小为 **1.1 kB gzip**，依赖数为 **0**，测试覆盖率为 **100%**；实例创建速度比对照方案快 **55–253 倍**；按键观察的模型可以表示 **20,000,000 个单元格**，每个单元格约 4.7 bytes。一个实际案例是 Invar：AI agents 在 ivue 上构建了约 **94,000 行**终端 IDE 源码，整个代码库只有一个 `computed()`。

这里的重点不是“少写一个 API”。重点是先问：什么是不可删除的结构？如果派生值只是读取已有信号，它不需要自己的缓存节点。如果状态是按 key 稀疏出现，读取时创建信号，未被观察的写入不分配存储。如果模型要在组件、Worker 和测试之间共享，它就不应该属于某个组件。

ivue 建立在 Vue Composition API 之上。`ref()`、`watch()`、生命周期和 composable 仍然可在构造函数中使用。class 只是给这些机制补上可读、可继承、可测试的模型形状。

完整文档、源码和浏览器基准测试：**https://ivue.dev**

先在自己的模型上重复测试，再决定哪些派生值需要缓存。每个数字都应带着测量方法一起出现。

