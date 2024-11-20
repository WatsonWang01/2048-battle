class Game2048 {
    constructor(gridId, scoreId, bestScoreId, playerId) {
        this.grid = [];
        this.score = 0;
        this.bestScore = localStorage.getItem(bestScoreId) || 0;
        this.size = 4;
        this.gridId = gridId;
        this.scoreId = scoreId;
        this.bestScoreId = bestScoreId;
        this.playerId = playerId;
        this.gameOver = false;
        this.hasWon = false;
        this.init();
    }

    init() {
        this.grid = Array.from({ length: this.size }, () => 
            Array.from({ length: this.size }, () => 0)
        );
        this.score = 0;
        this.gameOver = false;
        this.hasWon = false;
        this.addRandomTile();
        this.addRandomTile();
        this.render();
        this.updateScoreDisplay();
    }

    addRandomTile() {
        const emptyCells = [];
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] === 0) {
                    emptyCells.push({ r, c });
                }
            }
        }

        if (emptyCells.length > 0) {
            const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
        }
    }

    render() {
        const gridElement = document.getElementById(this.gridId);
        gridElement.innerHTML = '';

        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const tileValue = this.grid[r][c];
                const tileElement = document.createElement('div');
                tileElement.classList.add('tile');
                
                if (tileValue !== 0) {
                    tileElement.textContent = tileValue;
                    tileElement.classList.add(`tile-${tileValue}`);
                    if (tileValue === 2048) {
                        this.hasWon = true;
                        window.battleGame.playerWon(this.gridId);
                    }
                }

                gridElement.appendChild(tileElement);
            }
        }
    }

    updateScoreDisplay() {
        document.getElementById(this.scoreId).textContent = this.score;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem(this.bestScoreId, this.bestScore);
            document.getElementById(this.bestScoreId).textContent = this.bestScore;
        }
    }

    checkGameOver() {
        // 检查是否有空格
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] === 0) return false;
            }
        }

        // 检查是否有可以合并的相邻格子
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (
                    (r < this.size - 1 && this.grid[r][c] === this.grid[r + 1][c]) ||
                    (c < this.size - 1 && this.grid[r][c] === this.grid[r][c + 1])
                ) {
                    return false;
                }
            }
        }

        // 如果没有可能的移动，游戏结束
        this.gameOver = true;
        return true;
    }

    move(direction) {
        if (this.gameOver) return false;
        
        let moved = false;
        const prevGrid = JSON.stringify(this.grid);

        switch(direction) {
            case 'ArrowLeft':
                moved = this.moveInDirection(0);
                break;
            case 'ArrowRight':
                moved = this.moveInDirection(2);
                break;
            case 'ArrowUp':
                moved = this.moveInDirection(1);
                break;
            case 'ArrowDown':
                moved = this.moveInDirection(3);
                break;
        }

        // 检查网格是否发生变化
        moved = moved || (prevGrid !== JSON.stringify(this.grid));

        if (moved) {
            this.addRandomTile();
            this.render();
            this.updateScoreDisplay();
            
            // 检查游戏是否结束
            if (this.checkGameOver()) {
                window.battleGame.checkGameOver();
            }
        }

        return moved;
    }

    moveInDirection(rotations) {
        // 旋转网格到所需方向
        for (let i = 0; i < rotations; i++) {
            this.rotateGrid();
        }

        const moved = this.moveLeft();

        // 旋转回原始方向
        for (let i = 0; i < (4 - rotations) % 4; i++) {
            this.rotateGrid();
        }

        return moved;
    }

    rotateGrid() {
        const newGrid = [];
        for (let i = 0; i < this.size; i++) {
            newGrid.push([]);
            for (let j = 0; j < this.size; j++) {
                newGrid[i][j] = this.grid[this.size - 1 - j][i];
            }
        }
        this.grid = newGrid;
    }

    moveLeft() {
        let moved = false;
        
        for (let r = 0; r < this.size; r++) {
            const row = this.grid[r].filter(cell => cell !== 0);
            const newRow = [];
            let i = 0;
            
            while (i < row.length) {
                if (i + 1 < row.length && row[i] === row[i + 1]) {
                    // 合并相同的数字
                    const mergedValue = row[i] * 2;
                    newRow.push(mergedValue);
                    this.score += mergedValue;
                    i += 2;
                    moved = true;
                    
                    if (mergedValue === 2048) {
                        this.hasWon = true;
                        window.battleGame.playerWon(this.gridId);
                    }
                } else {
                    newRow.push(row[i]);
                    i++;
                }
            }
            
            // 填充剩余的空格
            while (newRow.length < this.size) {
                newRow.push(0);
            }
            
            // 检查行是否发生变化
            if (JSON.stringify(this.grid[r]) !== JSON.stringify(newRow)) {
                moved = true;
            }
            
            this.grid[r] = newRow;
        }
        
        return moved;
    }
}

class BattleGame {
    constructor() {
        this.player1 = new Game2048('grid1', 'score1', 'best-score1', 'Player 1');
        this.player2 = new Game2048('grid2', 'score2', 'best-score2', 'Player 2');
        this.timeLeft = 180;
        this.gameActive = false;
        this.timerInterval = null;
        this.setupControls();
        this.setupNewGameButton();
        this.setupGameEndDialog();
        
        // 初始化计时器显示
        this.resetTimer();
        
        // 加载胜利音效
        this.victorySound = new Audio('data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAASAAAeMwAUFBQUFCIiIiIiIjAwMDAwPz8/Pz8/TU1NTU1NW1tbW1tbaGhoaGhoaHd3d3d3d4aGhoaGhpSUlJSUlKmpqampqbe3t7e3t8bGxsbGxtTU1NTU1OPj4+Pj4/Hz8/Pz8/8AAAAATGF2YzU4Ljc2AAAAAAAAAAAAAAAAJAQAAAAAAAAAAAAeM2LZx5MAAAAAAAAAAAAAAAAAAAAA//sQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuOTkuNVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+xBkBw/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARMQU1FMy45OS41VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7EGQbD/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABExBTUUzLjk5LjVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQZB8P8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuOTkuNVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7EGQlD/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABExBTUUzLjk5LjVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=');
        this.victorySound.volume = 0.5;
    }

    resetTimer() {
        // 重置计时器状态
        this.timeLeft = 180;
        
        // 停止现有的计时器
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // 更新显示
        const timerDisplay = document.getElementById('timer');
        if (timerDisplay) {
            timerDisplay.textContent = '03:00';
            timerDisplay.style.setProperty('--progress', '100%');
        }
    }

    startTimer() {
        // 确保先重置计时器
        this.resetTimer();
        
        // 启动新的计时器
        this.timerInterval = setInterval(() => {
            if (this.timeLeft > 0 && this.gameActive) {
                this.timeLeft--;
                this.updateTimerDisplay();
                
                if (this.timeLeft <= 0) {
                    this.checkGameOver();
                }
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const display = document.getElementById('timer');
        if (display) {
            display.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            const progressPercent = (this.timeLeft / 180) * 100;
            display.style.setProperty('--progress', `${progressPercent}%`);
        }
    }

    startNewGame() {
        // 重置游戏状态
        this.player1.init();
        this.player2.init();
        
        // 重置并启动计时器
        this.gameActive = true;
        this.startTimer();
        
        // 激活游戏网格
        document.querySelectorAll('.grid').forEach(grid => {
            grid.classList.add('active');
        });
    }

    setupGameEndDialog() {
        this.gameEndDialog = document.querySelector('.game-end-dialog');
        this.victoryAnimation = document.querySelector('.victory-animation');
        
        // 设置对话框按钮
        const playAgainBtn = document.getElementById('play-again-btn');
        const exitGameBtn = document.getElementById('exit-btn');
        
        playAgainBtn.addEventListener('click', () => {
            this.hideGameEndDialog();
            this.startNewGame();
        });
        
        exitGameBtn.addEventListener('click', () => {
            this.hideGameEndDialog();
            
            // 重置游戏状态
            this.player1.init();
            this.player2.init();
            this.player1.render();
            this.player2.render();
            document.getElementById('winner-display').textContent = '';
            
            // 重置计时器到初始状态
            this.gameActive = false;
            this.resetTimer();
            
            // 移除所有胜利动画
            document.querySelectorAll('.victory-animation').forEach(el => {
                el.style.display = 'none';
            });
            
            // 确保游戏网格处于未开始状态
            document.querySelectorAll('.grid').forEach(grid => {
                grid.classList.remove('active');
            });
        });
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (!this.gameActive) return;
            
            switch (e.key.toLowerCase()) {
                // 玩家1控制键 (WASD)
                case 'w': this.player1.move('ArrowUp'); break;
                case 's': this.player1.move('ArrowDown'); break;
                case 'a': this.player1.move('ArrowLeft'); break;
                case 'd': this.player1.move('ArrowRight'); break;
                
                // 玩家2控制键 (方向键)
                case 'arrowup': 
                    e.preventDefault();
                    this.player2.move('ArrowUp'); 
                    break;
                case 'arrowdown': 
                    e.preventDefault();
                    this.player2.move('ArrowDown'); 
                    break;
                case 'arrowleft': 
                    e.preventDefault();
                    this.player2.move('ArrowLeft'); 
                    break;
                case 'arrowright': 
                    e.preventDefault();
                    this.player2.move('ArrowRight'); 
                    break;
            }
        });
    }

    setupNewGameButton() {
        const newGameBtn = document.getElementById('new-game-btn');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                this.startNewGame();
            });
        }
    }

    checkGameOver() {
        let player1CanMove = !this.player1.checkGameOver();
        let player2CanMove = !this.player2.checkGameOver();
        
        // 如果有一方达到2048，直接获胜
        if (this.player1.hasWon) {
            this.playerWon('grid1');
            return;
        }
        if (this.player2.hasWon) {
            this.playerWon('grid2');
            return;
        }

        // 如果时间到了，比较分数
        if (this.timeLeft <= 0) {
            if (this.player1.score > this.player2.score) {
                this.playerWon('grid1');
            } else if (this.player2.score > this.player1.score) {
                this.playerWon('grid2');
            } else {
                this.showGameEndDialog(null, null); // 平局
            }
            return;
        }

        // 如果双方都无法移动，比较分数
        if (!player1CanMove && !player2CanMove) {
            if (this.player1.score > this.player2.score) {
                this.playerWon('grid1');
            } else if (this.player2.score > this.player1.score) {
                this.playerWon('grid2');
            } else {
                this.showGameEndDialog(null, null); // 平局
            }
            return;
        }

        // 如果只有一方无法移动，继续游戏
        // 让另一方继续玩直到：达到2048，或时间结束，或也无法移动
    }

    playerWon(gridId) {
        // 停止游戏和计时器，但保持当前时间显示
        this.gameActive = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        const winner = gridId === 'grid1' ? this.player1 : this.player2;
        const loser = gridId === 'grid1' ? this.player2 : this.player1;
        
        // 显示胜利动画
        this.showVictoryAnimation();
        
        // 更新显示
        const winnerDisplay = document.getElementById('winner-display');
        if (winnerDisplay) {
            winnerDisplay.textContent = `${winner.playerId} Wins!`;
        }
        
        // 显示游戏结束对话框
        setTimeout(() => {
            this.showGameEndDialog(winner, loser);
        }, 1000);
    }

    showGameEndDialog(winner, loser) {
        if (!this.gameEndDialog) return;
        
        this.gameEndDialog.classList.add('active');
        
        const winnerTitle = this.gameEndDialog.querySelector('.winner-title');
        const finalScore = this.gameEndDialog.querySelector('.final-score');
        const timeTaken = this.gameEndDialog.querySelector('.time-taken');
        const bestScore = this.gameEndDialog.querySelector('.best-score');
        const battleSummary = this.gameEndDialog.querySelector('.battle-summary');
        
        if (winnerTitle) winnerTitle.textContent = `🏆 ${winner.playerId} Wins!`;
        if (finalScore) finalScore.textContent = winner.score;
        if (timeTaken) timeTaken.textContent = this.formatTime(180 - this.timeLeft);
        if (bestScore) bestScore.textContent = winner.bestScore;
        
        if (battleSummary) {
            battleSummary.innerHTML = `
                <h3>Battle Summary</h3>
                <p class="winner-message">
                    ${winner.playerId} won with ${winner.score} points!<br>
                    ${loser.playerId} scored ${loser.score} points<br>
                    Victory margin: ${winner.score - loser.score} points
                </p>
            `;
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    showVictoryAnimation() {
        if (this.victoryAnimation) {
            this.victoryAnimation.classList.add('active');
            if (this.victorySound) {
                this.victorySound.currentTime = 0;
                this.victorySound.play().catch(() => {});
            }
            
            // 创建五彩纸屑效果
            const confettiContainer = this.victoryAnimation.querySelector('.confetti');
            if (confettiContainer) {
                for (let i = 0; i < 50; i++) {
                    this.createConfetti(confettiContainer);
                }
            }
        }
    }

    createConfetti(container) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.animationDelay = Math.random() * 3 + 's';
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 50%, 50%)`;
        container.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 3000);
    }

    hideGameEndDialog() {
        if (this.gameEndDialog) {
            this.gameEndDialog.classList.remove('active');
        }
        if (this.victoryAnimation) {
            this.victoryAnimation.classList.remove('active');
            // 移除所有五彩纸屑
            const confetti = this.victoryAnimation.querySelector('.confetti');
            if (confetti) {
                while (confetti.firstChild) {
                    confetti.removeChild(confetti.firstChild);
                }
            }
        }
    }
}

// 当页面加载时初始化战斗游戏
document.addEventListener('DOMContentLoaded', () => {
    window.battleGame = new BattleGame();
    window.battleGame.startNewGame();
});