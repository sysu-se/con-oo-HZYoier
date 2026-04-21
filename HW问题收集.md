## HW 问题收集

### 已解决

1. writable方法有啥用?
   1. **上下文**：Coding Agent 回答：“在 Svelte 中，writable 是一个用于创建可写 store 的函数，它返回一个包含 subscribe、set 和 update 方法的对象，用于管理响应式状态。” 
   2. **解决手段**：直接询问CA + 查看网页资料
2. 解释一下svelte的$store语法糖。
   1. **上下文**：CA 回答：
   - `$store` 会在组件初始化时自动订阅 store，并在组件销毁时自动取消订阅。
   - 当 store 的值改变时，组件会自动重新渲染。
   - 这只适用于组件内部，不能在模块级脚本中使用。
   - 对于 derived store，`$derivedStore` 会自动计算依赖项。
   2. **解决手段**：直接询问CA

### 未解决

暂无