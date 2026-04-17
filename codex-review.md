# con-oo-HZYoier - Review

## Review 结论

方向是对的：代码已经尝试用 `createGame/createSudoku + gameStore` 把领域对象接到界面上，但目前接入没有闭环。领域模型没有真正承载数独规则，Svelte 适配层也没有按 store 惯例落地，并且仍与旧 store 并存，导致关键流程存在设计性缺陷和明显的接线错误。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | fair |
| Sudoku Business | poor |
| OOD | poor |

## 缺点

### 1. `gameStore` 不是合法的 Svelte store，却被组件当作 `$gameStore` 使用

- 严重程度：core
- 位置：src/node_modules/@sudoku/stores/gameStore.js:154-166
- 原因：`createGameStore()` 返回的是“包含多个子 store 和方法的普通对象”，并没有 `subscribe()`；但 [src/components/Board/index.svelte:40-51]、[src/components/Controls/ActionBar/Actions.svelte:33-45] 等处都在使用 `$gameStore.grid`、`$gameStore.canUndo`。这不符合 Svelte store 约定，说明适配层接口与消费方式不匹配，Svelte 接入在架构层面就是断裂的。

### 2. 主流程直接调用了未导入的 `pauseGame` / `resumeGame`

- 严重程度：core
- 位置：src/App.svelte:12-31
- 原因：文件只默认导入了 `game`，却在胜利订阅和 welcome modal 中直接使用 `pauseGame()`、`resumeGame`。按当前源码，这两个标识符在该文件内未定义，会直接破坏游戏结束和开场流程，属于接入层的硬错误。

### 3. 领域对象没有建模“题面 givens / 可编辑格 / 校验规则”，核心数独规则仍留在适配层

- 严重程度：core
- 位置：src/domain/index.js:13-28
- 原因：`Sudoku` 只持有一个当前 `grid`，`guess()` 可以改写任意非零格，且对象本身没有任何校验接口；相反，冲突检测和胜利判断被放到了 [src/node_modules/@sudoku/stores/gameStore.js:45-88]。这使领域模型无法表达数独最关键的业务规则，也让 UI 无法从领域对象区分原始题面和玩家输入。

### 4. 新开局流程没有把领域对象变成唯一事实来源

- 严重程度：core
- 位置：src/node_modules/@sudoku/stores/gameStore.js:107-123
- 原因：`startNew/startCustom` 只更新了内部 `game` 和 `grid/canUndo/canRedo`，但没有同步旧流程依赖的 `difficulty`、`cursor`、`hints`、`location.hash` 等状态；因此 [src/components/Header/Dropdown.svelte:79] 仍显示旧难度，[src/node_modules/@sudoku/stores/keyboard.js:6-10] 仍依据旧 `grid` 判断能否编辑，[src/components/Modal/Types/Share.svelte:11-17] 仍从旧 `grid` 生成分享码。说明“真实游戏流程”仍有大块没有接到 domain。

### 5. 输入可编辑性仍依据旧 `grid`，会放大领域模型缺失造成的业务错误

- 严重程度：major
- 位置：src/node_modules/@sudoku/stores/keyboard.js:1-10
- 原因：键盘禁用逻辑仍订阅旧的 `grid` store，而不是当前 `gameStore`/`Game` 的局面。`gameStore.startNew()` 并不会更新这个旧 `grid`，所以输入权限判断与真实棋盘脱节；再结合 `Sudoku.guess()` 不保护 givens，原始题面格子很容易被改写。

### 6. 棋盘渲染仍沿用旧 `userGrid` 语义，导致用户数和冲突高亮判断失真

- 严重程度：major
- 位置：src/components/Board/index.svelte:48-51
- 原因：`userNumber={$gameStore.grid[y][x] === 0}` 和 `conflictingNumber={$gameStore.grid[y][x] === 0 && ...}` 都把“当前值是否为空”误当成“是否为玩家输入”。这样一来，玩家填入的非零数字不会被标成用户数，冲突格也几乎不会高亮。根因是 domain/store 没有保留题面 givens 与当前解答的区分。

### 7. 分享功能仍依赖旧棋盘状态，无法代表当前领域对象中的局面

- 严重程度：major
- 位置：src/components/Modal/Types/Share.svelte:5-17
- 原因：该组件从 `@sudoku/stores/grid` 读取 `$grid` 并生成 `sencode`，但真实开局和输入已经转到 `gameStore`。因此分享出来的题面并不可靠地对应当前正在玩的局，说明领域对象没有贯穿到完整的 Svelte 游戏流程。

### 8. 反序列化接口缺少结构校验，鲁棒性较弱

- 严重程度：minor
- 位置：src/domain/index.js:120-129
- 原因：`loadFromJSON()` 直接信任 `initialSudoku.grid`、`history` 和 `historyIndex`，没有检查 grid 尺寸、数字范围或 historyIndex 是否越界。作为领域层边界，这会让无效快照直接进入内部状态。

### 9. 手动订阅 `won` 没有释放，写法不符合常见 Svelte 组件惯例

- 严重程度：minor
- 位置：src/App.svelte:12-17
- 原因：顶层直接 `gameStore.won.subscribe(...)`，但没有在 `onDestroy` 中取消订阅。虽然 `App` 生命周期通常较长，但从 Svelte 约定和资源管理上看，这仍是不完整的接入写法。

## 优点

### 1. `Game` 的 undo/redo 主体语义是自洽的

- 位置：src/domain/index.js:78-89
- 原因：`guess()` 在写入新一步前会用 `splice(state.historyIndex)` 截断 redo 分支，再基于当前局面克隆出新快照；配合 `undo()/redo()` 的 `historyIndex` 设计，历史线性演进的基本规则是清楚的。

### 2. 领域对象对内部状态做了防御性复制

- 位置：src/domain/index.js:16-18
- 原因：`getGrid()`、`clone()`、`toJSON()` 都返回深拷贝或新对象，没有把内部二维数组直接暴露给外部，这一点有助于维持对象封装并避免 UI 侧绕过领域接口直接篡改状态。

### 3. 引入 Store Adapter 的方向符合本次作业要求

- 位置：src/node_modules/@sudoku/stores/gameStore.js:95-151
- 原因：`gameStore` 试图把 `Game` 包装为面向 Svelte 的接口，并让开局、输入、撤销、重做都从适配层进入；同时 [src/components/Controls/Keyboard.svelte:10-25]、[src/components/Controls/ActionBar/Actions.svelte:13-19]、[src/components/Modal/Types/Welcome.svelte:18-27] 里的事件处理基本保持轻量，没有把核心规则继续散落在组件中。

## 补充说明

- 本次结论仅基于静态阅读 `src/domain/index.js` 及其关联的 Svelte 接入代码，未运行测试，也未启动应用做交互验证。
- 关于 `$gameStore.xxx` 接口不符合 Svelte store 约定、`pauseGame/resumeGame` 未定义、旧 `grid/difficulty` 仍在参与流程等判断，来自源码静态分析，未做实际编译验证。
- 本次审查按要求只关注 `src/domain/*` 及其直接相关的 Svelte 接入点；未扩展评价无关目录或运行时行为。
