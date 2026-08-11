/**
 * Game State Manager
 * Handles game state, scoring, and level progression
 */

window.SpaceInvaders = window.SpaceInvaders || {};

SpaceInvaders.GameState = class GameState {
    constructor() {
        const CONFIG = SpaceInvaders.CONFIG;
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.lives = CONFIG.PLAYER.START_LIVES;
        this.level = 1;
        this.state = 'menu'; // menu, playing, paused, levelComplete, gameOver
        this.levelCompleteTimer = 0;
        this.gameOverTimer = 0;
    }
    
    loadHighScore() {
        const CONFIG = SpaceInvaders.CONFIG;
        const stored = localStorage.getItem(CONFIG.STORAGE.HIGH_SCORE);
        return stored ? parseInt(stored, 10) : 0;
    }
    
    saveHighScore() {
        const CONFIG = SpaceInvaders.CONFIG;
        localStorage.setItem(CONFIG.STORAGE.HIGH_SCORE, this.highScore.toString());
    }
    
    addScore(points) {
        this.score += points;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }
    }
    
    setLives(lives) {
        this.lives = lives;
    }
    
    nextLevel() {
        this.level++;
    }

    /** True when the current level is a boss encounter instead of an alien grid. */
    isBossLevel() {
        const CONFIG = SpaceInvaders.CONFIG;
        return CONFIG.BOSS.ENABLED && this.level % CONFIG.BOSS.LEVEL_INTERVAL === 0;
    }

    /** How many bosses have been faced by this level, counting the current one (1-based). */
    bossAppearance() {
        const CONFIG = SpaceInvaders.CONFIG;
        return Math.floor(this.level / CONFIG.BOSS.LEVEL_INTERVAL);
    }
    
    reset() {
        const CONFIG = SpaceInvaders.CONFIG;
        this.score = 0;
        this.lives = CONFIG.PLAYER.START_LIVES;
        this.level = 1;
        this.state = 'playing';
        this.levelCompleteTimer = 0;
        this.gameOverTimer = 0;
    }
    
    startGame() {
        this.reset();
    }
    
    pauseGame() {
        if (this.state === 'playing') {
            this.state = 'paused';
        }
    }
    
    resumeGame() {
        if (this.state === 'paused') {
            this.state = 'playing';
        }
    }
    
    togglePause() {
        if (this.state === 'playing') {
            this.pauseGame();
        } else if (this.state === 'paused') {
            this.resumeGame();
        }
    }
    
    completeLevel() {
        const CONFIG = SpaceInvaders.CONFIG;
        this.state = 'levelComplete';
        this.levelCompleteTimer = CONFIG.GAME.LEVEL_COMPLETE_DELAY;
    }
    
    gameOver() {
        const CONFIG = SpaceInvaders.CONFIG;
        this.state = 'gameOver';
        this.gameOverTimer = CONFIG.GAME.GAME_OVER_DELAY;
    }
    
    isNewHighScore() {
        return this.score >= this.highScore && this.score > 0;
    }
    
    update(deltaTime) {
        const CONFIG = SpaceInvaders.CONFIG;
        if (this.state === 'levelComplete') {
            this.levelCompleteTimer -= deltaTime * 1000;
            if (this.levelCompleteTimer <= 0) {
                this.nextLevel();
                this.state = 'playing';
                return 'nextLevel';
            }
        }
        
        if (this.state === 'gameOver') {
            this.gameOverTimer -= deltaTime * 1000;
        }
        
        return null;
    }
};
