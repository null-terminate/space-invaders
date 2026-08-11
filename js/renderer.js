/**
 * Renderer
 * Handles all canvas rendering operations
 */

window.SpaceInvaders = window.SpaceInvaders || {};

SpaceInvaders.Renderer = class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        const CONFIG = SpaceInvaders.CONFIG;
        this.width = CONFIG.CANVAS.WIDTH;
        this.height = CONFIG.CANVAS.HEIGHT;

        // Set by Game when the on-screen pad is active, so prompts name the
        // controls the player actually has in front of them.
        this.touchMode = false;

        // Set canvas size
        canvas.width = this.width;
        canvas.height = this.height;
    }
    
    clear() {
        const CONFIG = SpaceInvaders.CONFIG;
        this.ctx.fillStyle = CONFIG.CANVAS.BACKGROUND_COLOR;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    renderEntity(entity) {
        if (entity.active) {
            entity.render(this.ctx);
        }
    }
    
    renderEntities(entities) {
        for (const entity of entities) {
            this.renderEntity(entity);
        }
    }
    
    renderHUD(gameState) {
        const ctx = this.ctx;
        
        // Red border around game area
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, this.width - 4, this.height - 4);
        
        // Score
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${gameState.score}`, 20, 30);
        
        // High Score
        ctx.textAlign = 'center';
        ctx.fillText(`HI-SCORE: ${gameState.highScore}`, this.width / 2, 30);
        
        // Lives
        ctx.textAlign = 'right';
        ctx.fillText(`LIVES: ${gameState.lives}`, this.width - 20, 30);
        
        // Level
        ctx.textAlign = 'left';
        ctx.font = '14px "Press Start 2P", monospace';
        ctx.fillText(`LEVEL ${gameState.level}`, 20, 55);
    }
    
    /**
     * Boss health bar, phase readout, and the entrance warning banner.
     */
    renderBossHUD(boss) {
        const ctx = this.ctx;
        const CONFIG = SpaceInvaders.CONFIG;

        if (boss.state === 'entering') {
            // Flashing warning while the boss flies in
            if (Math.floor(boss.stateTimer / 250) % 2 === 0) {
                ctx.fillStyle = '#ff0000';
                ctx.font = '28px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.fillText('!! WARNING !!', this.width / 2, this.height / 2 - 20);
                ctx.fillStyle = '#ffffff';
                ctx.font = '16px "Press Start 2P", monospace';
                ctx.fillText('BOSS INCOMING', this.width / 2, this.height / 2 + 20);
            }
            return;
        }

        // The bar sits above the boss's patrol band. If you raise BOSS.Y_POSITION or
        // BOB_AMPLITUDE, keep the boss's top edge (Y_POSITION - BOB_AMPLITUDE - 18)
        // below barY + barHeight or the sprite will overlap the bar.
        const barWidth = this.width - 200;
        const barHeight = 14;
        const barX = (this.width - barWidth) / 2;
        const barY = 70;

        // While the energy shield holds, the bar reports shield HP instead of boss
        // health - that is what the player's shots are actually depleting.
        const showingShield = boss.shieldActive;
        const fraction = showingShield ? boss.shieldFraction : boss.healthFraction;
        const label = showingShield ? 'BOSS  SHIELD' : `BOSS  PHASE ${boss.phase}`;
        const readout = showingShield
            ? `${boss.shield}/${boss.maxShield}`
            : `${boss.health}/${boss.maxHealth}`;

        const phaseColors = CONFIG.BOSS.PHASE_COLORS;
        const fillColor = showingShield
            ? CONFIG.BOSS.SHIELD.BAR_COLOR
            : phaseColors[Math.min(boss.phase, phaseColors.length) - 1];

        // Label
        ctx.fillStyle = showingShield ? CONFIG.BOSS.SHIELD.BAR_COLOR : '#ffffff';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(label, barX, barY - 8);

        ctx.textAlign = 'right';
        ctx.fillText(readout, barX + barWidth, barY - 8);

        // Track
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Fill
        ctx.fillStyle = fillColor;
        ctx.fillRect(barX, barY, barWidth * fraction, barHeight);

        // Outline
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // While shielded, a thin dim strip shows the untouched boss health beneath,
        // so it is clear the shield is a layer on top rather than the whole fight.
        if (showingShield) {
            const stripY = barY + barHeight + 4;
            const stripHeight = 4;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fillRect(barX, stripY, barWidth, stripHeight);
            ctx.fillStyle = 'rgba(255, 68, 68, 0.55)';
            ctx.fillRect(barX, stripY, barWidth * boss.healthFraction, stripHeight);
        }
    }

    renderPauseScreen() {
        const ctx = this.ctx;
        
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Pause text
        ctx.fillStyle = '#ffffff';
        ctx.font = '40px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', this.width / 2, this.height / 2);
        
        ctx.font = '16px "Press Start 2P", monospace';
        ctx.fillText(
            this.touchMode ? 'Tap ❚❚ to continue' : 'Press P or ESC to continue',
            this.width / 2,
            this.height / 2 + 50
        );
    }
    
    renderGameOver(score, highScore, isNewHighScore) {
        const ctx = this.ctx;
        
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Game Over text
        ctx.fillStyle = '#ff0000';
        ctx.font = '48px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 60);
        
        // Score
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px "Press Start 2P", monospace';
        ctx.fillText(`FINAL SCORE: ${score}`, this.width / 2, this.height / 2);
        
        if (isNewHighScore) {
            ctx.fillStyle = '#ffff00';
            ctx.fillText('NEW HIGH SCORE!', this.width / 2, this.height / 2 + 40);
        } else {
            ctx.fillText(`HIGH SCORE: ${highScore}`, this.width / 2, this.height / 2 + 40);
        }
        
        ctx.fillStyle = '#888888';
        ctx.font = '14px "Press Start 2P", monospace';
        ctx.fillText(
            this.touchMode ? 'TAP TO CONTINUE' : 'PRESS SPACE TO CONTINUE',
            this.width / 2,
            this.height / 2 + 100
        );
    }
    
    renderLevelComplete(level, bossNext = false) {
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = '#00ff00';
        ctx.font = '36px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`LEVEL ${level} COMPLETE!`, this.width / 2, this.height / 2);

        ctx.fillStyle = '#ffffff';
        ctx.font = '16px "Press Start 2P", monospace';
        ctx.fillText('Get ready...', this.width / 2, this.height / 2 + 50);

        if (bossNext) {
            ctx.fillStyle = '#ff4444';
            ctx.fillText('A BOSS APPROACHES', this.width / 2, this.height / 2 + 90);
        }
    }
    
    renderStartScreen(highScore) {
        const ctx = this.ctx;
        
        this.clear();
        
        // Simple border
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(40, 40, this.width - 80, this.height - 80);
        
        // Title
        ctx.fillStyle = '#00ff00';
        ctx.font = '36px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SPACE INVADERS', this.width / 2, 120);
        
        // High Score
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px "Press Start 2P", monospace';
        ctx.fillText(`HIGH SCORE: ${highScore}`, this.width / 2, 170);
        
        // Instructions
        ctx.font = '14px "Press Start 2P", monospace';
        ctx.fillStyle = '#888888';
        ctx.fillText('CONTROLS:', this.width / 2, 230);
        if (this.touchMode) {
            ctx.fillText('STICK - Slide to Move', this.width / 2, 270);
            ctx.fillText('FIRE - Hold to Shoot', this.width / 2, 300);
            ctx.fillText('❚❚ - Pause', this.width / 2, 330);
        } else {
            ctx.fillText('A / ← - Move Left', this.width / 2, 270);
            ctx.fillText('D / → - Move Right', this.width / 2, 300);
            ctx.fillText('SPACE - Fire', this.width / 2, 330);
            ctx.fillText('P / ESC - Pause', this.width / 2, 360);
        }
        
        // Alien point values
        ctx.fillStyle = '#ff00ff';
        ctx.fillText('▼ = 30 PTS', this.width / 2 - 150, 420);
        ctx.fillStyle = '#00ffff';
        ctx.fillText('◆ = 20 PTS', this.width / 2, 420);
        ctx.fillStyle = '#ffff00';
        ctx.fillText('● = 10 PTS', this.width / 2 + 150, 420);
        
        // Boss teaser
        const CONFIG = SpaceInvaders.CONFIG;
        if (CONFIG.BOSS.ENABLED) {
            ctx.fillStyle = '#ff4444';
            ctx.font = '14px "Press Start 2P", monospace';
            ctx.fillText(`BOSS EVERY ${CONFIG.BOSS.LEVEL_INTERVAL} LEVELS`, this.width / 2, 460);
        }

        // Start prompt
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px "Press Start 2P", monospace';
        ctx.fillText(
            this.touchMode ? 'TAP TO START' : 'PRESS SPACE TO START',
            this.width / 2,
            500
        );
    }
};
