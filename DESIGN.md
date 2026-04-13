# 领域对象接入 Svelte 设计文档

## A. 领域对象如何被消费

### 1. View 层直接消费的是什么？

**是gameStore**，而不是直接消费 `Game` 或 `Sudoku`。

```
UI 组件 → gameStore → Game → Sudoku → 底层数据
```

`createGameStore()` 函数
- 内部持有 `createGame()` 实例
- 对外暴露 Svelte store 和方法

### 2. View 层拿到的数据是什么？

View 层通过 `$gameStore.xxx` 消费以下响应式数据：

| 数据 | 来源 | 用途 |
|------|------|------|
| `grid` | `gameStore.grid` (writable) | 渲染 9x9 棋盘 |
| `invalidCells` | `derived(grid, ...)` | 高亮冲突单元格 |
| `won` | `derived([grid, invalidCells], ...)` | 判断获胜 |
| `canUndo` | `gameStore.canUndo` (writable) | 撤销按钮可用状态 |
| `canRedo` | `gameStore.canRedo` (writable) | 重做按钮可用状态 |

### 3. 用户操作如何进入领域对象？

**点击数字按钮 → 调用 guess() → 进入 Game**

```
Keyboard.svelte:
  gameStore.guess({ x: $cursor.x, y: $cursor.y }, num)
        ↓
  game.guess({ row, col, value })
        ↓
  创建新 Sudoku 快照，保存到历史
        ↓
  updateStore() → grid.set(sudoku.getGrid())
        ↓
  Svelte 自动更新 UI
```

**点击 Undo 按钮**
```
Actions.svelte:
  gameStore.undo()
        ↓
  game.undo()  → historyIndex--
        ↓
  updateStore() → grid.set(sudoku.getGrid())
```

### 4. 领域对象变化后，Svelte 为什么会更新？

**手动调用了 store 的 set() 方法**

```javascript
function updateStore() {
  if (!game) return;
  const sudoku = game.getSudoku();
  grid.set(sudoku.getGrid());  // ← set()触发 Svelte 响应式更新
  canUndo.set(game.canUndo());
  canRedo.set(game.canRedo());
}
```

每次用户操作后，调用 `updateStore()`：
1. 从 `Game` 获取当前的 `Sudoku`
2. 调用 `sudoku.getGrid()` 获取新的二维数组
3. **调用 `grid.set(...)` 触发 Svelte store 更新**
4. 所有订阅了 `$gameStore.grid` 的组件自动刷新

---

## B. 响应式机制说明

### 1. 你依赖的是 store、$:、重新赋值，还是其他机制？

**依赖 Svelte store 的 `writable` 和 `derived`**，配合**手动调用 set() 方法**。

### 2. 你的方案中哪些数据是响应式暴露给 UI 的？

**暴露给 UI：**
- `grid` - 当前棋盘（writable store）
- `invalidCells` - 冲突单元格（derived）
- `won` - 是否获胜（derived）
- `canUndo` / `canRedo` - 按钮状态（writable）

**留在领域对象内部：**
- `Game` 实例本身
- `history` 历史数组
- `historyIndex` 指针

### 3. 为什么不能直接 mutate 对象？

**如果直接 mutate 会导致UI不会更新。**

```javascript
// 错误做法：直接修改内部对象
game.getSudoku().guess({ row: 0, col: 0, value: 5 });
// 这时 $gameStore.grid 不会更新，因为没有调用 grid.set()
```

**原因：**
- Svelte store 只在调用 `set()` 或 `update()` 时才触发更新
- 直接修改 JavaScript 对象内部属性，store 不知道数据变了
- 组件不会重新渲染

**正确做法：**
```javascript
// 正确做法：调用领域对象后，手动同步调用set()
game.guess({ row: 0, col: 0, value: 5 });
updateStore();  // 触发 grid.set() → UI 更新
```

---

## C. 改进说明

### 1. 相比 HW1，你改进了什么？
**改进点：**
1. 修正反序列化逻辑。HW1中`Game.toJSON()` 保存的是当前局面和一组历史快照，但没有保存真正的开局基准局面；`createGameFromJSON()` 又把当前局面当作构造时的 `sudoku`，反序列化无法回到开局。改进后使用initialSudoku保存开局状态。
2. 修改状态建模。HW1中history既承担历史又承担当前状态。改进后使用state对象统一管理。
3. 防止外部绕过历史系统。HW1中调用方只要执行 `game.getSudoku().guess(move)`，就能修改当前局面但不记录 `history`，Undo/Redo 会失真。改进方法是让`getSudoku()`返回克隆，这样就无法修改`game`内部`Sudoku`对象。
4. 数独业务约束。修改`guess()`使得能够验证输入值value必须是0-9，其中0表示空单元格。
5. 用Svelte store暴露响应式状态。gameStore.js内部持有createGame()实例，同时使用Svelte的derived，writable，set实现响应式机制。
6. 修改UI组件消费store。创建 gameStore.js - Store Adapter
- Board/index.svelte - 使用 $gameStore.grid 和 $gameStore.invalidCells
- Keyboard.svelte - 调用 gameStore.guess()
- Actions.svelte - Undo/Redo 按钮绑定 gameStore.undo() / gameStore.redo()
- Welcome.svelte - 调用 gameStore.startNew() / gameStore.startCustom()

### 2. 为什么 HW1 中的做法不足以支撑真实接入？

HW1只有 `src/domain/index.js`：
- 定义了 `createSudoku()` 和 `createGame()`
- 领域对象在测试中可用

**问题：**
- Svelte 组件仍然使用旧`userGrid` store
- UI 没有调用领域对象的方法
- 领域对象"存在"但"未被使用"

### 3. 你的新设计有哪些 trade-off？

**优点：**
1. 清晰的分层：领域逻辑在 domain，UI 消费在 store
2. 响应式自动联动：修改后 UI 自动刷新
3. Undo/Redo 由领域对象管理，不是散落在组件中

**trade-off：**
1. 每次操作都要调用 `updateStore()` - 有额外性能开销，但可接受
2. 需要复制二维数组（`getGrid()` 返回新数组）- 内存开销，但保证不可变性
3. 需要维护 store 和领域对象的同步 - 额外的代码复杂度



