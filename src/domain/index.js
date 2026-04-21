const SUDOKU_SIZE = 9;
const BOX_SIZE = 3;

/**
 输入grid应为9x9的二维数组，值为0-9，0表示空单元格
 */

//深拷贝
function deepCloneGrid(grid) {
    return grid.map(row => [...row]);
}

export function createSudoku(input) {
    const grid = deepCloneGrid(input);

    function getGrid() {
        return deepCloneGrid(grid);
    }

    function guess(move) {
        const { row, col, value } = move;
        if (row >= 0 && row < SUDOKU_SIZE && col >= 0 && col < SUDOKU_SIZE) {
            // 0 表示清空单元格，1-9 为有效输入
            if ((Number.isInteger(value) && value >= 0 && value <= 9) || value === null) {
                grid[row][col] = value === null ? 0 : value;
            }
        }
    }

    function clone() {
        return createSudoku(grid);
    }

    function toJSON() {
        return { grid: deepCloneGrid(grid) }; //返回对象
    } 

    function toString() {
        let result = '';
        for (let i = 0; i < SUDOKU_SIZE; i++) {
            //分隔出每个3x3的方块
            if (i > 0 && i % BOX_SIZE === 0) result += '\n';

            for (let j = 0; j < SUDOKU_SIZE; j++) {
                if (j > 0 && j % BOX_SIZE === 0) result += ' ';
                // 0 表示空单元格
                result += grid[i][j] + ' ';
            }
            result += '\n';
        }
        return result;
    }

    return {
        getGrid,
        guess,
        clone,
        toJSON,
        toString
    };
}

export function createGame(params) {
    //使用state管理，在反序列化时可以用undo回到初始状态
    const state = {
        initialSudoku: params.sudoku.clone(),
        history: [],
        historyIndex: 0
    };

    function getSudoku() {
        const current = state.historyIndex > 0
            ? state.history[state.historyIndex - 1].sudoku
            : state.initialSudoku;
        return current.clone();
    }

    function guess(move) {
        const current = state.historyIndex > 0
            ? state.history[state.historyIndex - 1].sudoku
            : state.initialSudoku;
        
        state.history.splice(state.historyIndex);
        //保存当前状态的副本，防止外部绕过历史直接修改Sudoku对象导致undo/redo失真
        state.history.push({ sudoku: current.clone() }); 
        state.historyIndex = state.history.length;
        
        state.history[state.historyIndex - 1].sudoku.guess(move);
    }

    function undo() {
        if (state.historyIndex > 0) {
            state.historyIndex--;
        }
    }

    function redo() {
        if (state.historyIndex < state.history.length) {
            state.historyIndex++;
        }
    }

    function canUndo() {
        return state.historyIndex > 0;
    }

    function canRedo() {
        return state.historyIndex < state.history.length;
    }

    //序列化游戏状态，包含初始数独和历史记录
    function toJSON() {
        return {
            initialSudoku: state.initialSudoku.toJSON(),
            history: state.history.map(h => h.sudoku.toJSON()),
            historyIndex: state.historyIndex
        };
    }

    //反序列化游戏状态，重建数独对象和历史记录
    function loadFromJSON(json) {
        state.initialSudoku = createSudoku(json.initialSudoku.grid);
        state.history.length = 0;
        json.history.forEach(h => {
            state.history.push({
                sudoku: createSudoku(h.grid)
            });
        });
        state.historyIndex = json.historyIndex;
    }

    function getInitialSudoku() {
        return state.initialSudoku;
    }

    return {
        getSudoku,
        getInitialSudoku,
        guess,
        undo,
        redo,
        canUndo,
        canRedo,
        toJSON,
        loadFromJSON
    };
}

export function createSudokuFromJSON(json) {
    return createSudoku(json.grid);
}


export function createGameFromJSON(json) {
    const game = createGame({ sudoku: createSudoku(json.initialSudoku.grid) });
    game.loadFromJSON(json);
    return game;
}
