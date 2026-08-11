/**
 * Game Engine
 * Main game loop and coordination
 */

window.SpaceInvaders = window.SpaceInvaders || {};

SpaceInvaders.Game = class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.spriteManager = new SpaceInvaders.SpriteManager();
        this.renderer = new SpaceInvaders.Renderer(canvas);
        this.inputHandler = new SpaceInvaders.InputHandler();
        this.gameState = new SpaceInvaders.GameState();

        // On-screen pad for keyboard-less devices. Adds nothing to the DOM when
        // the device has a keyboard, so desktop play is unaffected.
        this.touchControls = new SpaceInvaders.TouchControls(
            canvas.parentElement || document.body,
            this.inputHandler
        );
        // Prompts read "TAP" instead of "PRESS SPACE" once the pad is showing
        this.renderer.touchMode = this.touchControls.enabled;
        
        this.player = null;
        this.aliens = [];
        this.playerBullets = [];
        this.alienBullets = [];
        this.shields = [];
        this.explosions = [];
        this.powerUps = [];
        this.ufo = null;
        this.boss = null;

        this.alienDirection = 1;
        this.alienSpeed = SpaceInvaders.CONFIG.ALIENS.BASE_SPEED;
        this.lastAlienFireTime = 0;
        this.lastUFOSpawnTime = 0;
        this.isBossLevel = false;

        this.lastTime = 0;
        this.running = false;
        this.menuDelay = 0;
        // Swallows the keypress that started the game, so the ship does not fire
        // the instant the player taps SPACE at the menu.
        this.startupDelay = 0;


        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // pointerdown rather than click: it covers mouse and touch in one path
        // and fires immediately, without the tap-to-click delay some mobile
        // browsers add.
        this.canvas.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (this.gameState.state === 'menu') {
                if (this.menuDelay > 0) return;
                this.startGame();
            } else if (this.gameState.state === 'gameOver' && this.gameState.gameOverTimer <= 0) {
                this.gameState.state = 'menu';
                this.menuDelay = 0.3;
            }
        });

        // Auto-pause when the player's attention leaves the game. On mobile,
        // switching apps or locking the screen would otherwise leave the player
        // parked in front of live alien fire; on desktop, so would clicking away
        // to another window. visibilitychange covers the former, blur the latter -
        // a focus change does not always hide the page.
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.pauseForInterruption();
        });
        window.addEventListener('blur', () => this.pauseForInterruption());
    }

    /**
     * Pause because the game lost the player's attention, dropping any held
     * inputs so the ship is not still drifting or firing on return.
     */
    pauseForInterruption() {
        if (this.gameState.state === 'playing') {
            this.gameState.pauseGame();
        }
        this.inputHandler.releaseAllActions();
    }
    
    startGame() {
        this.gameState.startGame();
        this.initLevel();
        // Set a brief startup delay to prevent firing immediately when starting with spacebar
        this.startupDelay = 0.2;
    }
    
    initLevel() {
        const CONFIG = SpaceInvaders.CONFIG;

        // Create player
        this.player = new SpaceInvaders.Player(this.spriteManager);
        this.player.lives = this.gameState.lives;

        this.isBossLevel = this.gameState.isBossLevel();

        // Create aliens (boss levels replace the grid with a single boss)
        this.aliens = [];
        if (!this.isBossLevel) {
            const alienConfig = CONFIG.ALIENS;
            for (let row = 0; row < alienConfig.ROWS; row++) {
                for (let col = 0; col < alienConfig.COLS; col++) {
                    const type = CONFIG.ALIEN_TYPES[row];
                    const x = alienConfig.START_X + col * (alienConfig.WIDTH + alienConfig.PADDING_X);
                    const y = alienConfig.START_Y + row * (alienConfig.HEIGHT + alienConfig.PADDING_Y);

                    // Add shields to some aliens in level 2+
                    let hasShield = false;
                    if (this.gameState.level >= 2) {
                        // 20% chance for an alien to have a shield in level 2+
                        hasShield = Math.random() < 0.2;
                    }

                    this.aliens.push(new SpaceInvaders.Alien(x, y, type, this.spriteManager, hasShield));
                }
            }
        }

        // Create shields
        this.shields = [];
        const shieldConfig = CONFIG.SHIELDS;
        const totalShieldWidth = shieldConfig.COUNT * shieldConfig.WIDTH;
        const shieldSpacing = (CONFIG.CANVAS.WIDTH - totalShieldWidth) / (shieldConfig.COUNT + 1);
        for (let i = 0; i < shieldConfig.COUNT; i++) {
            const x = shieldSpacing + i * (shieldConfig.WIDTH + shieldSpacing) + shieldConfig.WIDTH / 2;
            this.shields.push(new SpaceInvaders.Shield(x, shieldConfig.Y_POSITION, this.spriteManager));
        }
        
        // Create boss on boss levels
        this.boss = this.isBossLevel
            ? new SpaceInvaders.Boss(this.spriteManager, this.gameState.bossAppearance())
            : null;

        // Reset bullets and effects
        this.playerBullets = [];
        this.alienBullets = [];
        this.explosions = [];
        this.powerUps = [];
        this.ufo = null;
        // A capsule caught at the end of a level does not carry into the next one
        if (this.player) {
            this.player.clearPowerUp();
        }

        // Reset alien movement
        this.alienDirection = 1;
        this.alienSpeed = CONFIG.ALIENS.BASE_SPEED + (this.gameState.level - 1) * 10;
        this.lastAlienFireTime = Date.now();
        this.lastUFOSpawnTime = Date.now();
    }
    
    start() {
        this.running = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    stop() {
        this.running = false;
    }
    
    gameLoop(currentTime = performance.now()) {
        if (!this.running) return;

        // Clamp the step. Backgrounding the tab (a phone call, app switch, screen
        // lock) stalls requestAnimationFrame, and the first frame back would
        // otherwise carry a multi-second delta - enough to move bullets straight
        // through aliens without ever overlapping them.
        const rawDelta = (currentTime - this.lastTime) / 1000;
        const deltaTime = Math.min(rawDelta, 1 / 30);
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        // Check for pause
        if (this.inputHandler.isPausePressed()) {
            if (this.gameState.state === 'playing' || this.gameState.state === 'paused') {
                this.gameState.togglePause();
            }
        }
        
        // Handle different game states
        switch (this.gameState.state) {
            case 'menu':
                // Handle menu delay (prevents immediate start when coming from game over)
                if (this.menuDelay > 0) {
                    this.menuDelay -= deltaTime;
                } else if (this.inputHandler.isFiring()) {
                    // Start game with spacebar
                    this.startGame();
                }
                break;
            case 'playing':
                this.updateGame(deltaTime);
                break;
            case 'paused':
                break;
            case 'levelComplete': {
                const result = this.gameState.update(deltaTime);
                if (result === 'nextLevel') {
                    this.initLevel();
                }
                break;
            }
            case 'gameOver':
                this.gameState.update(deltaTime);
                this.updateExplosions(deltaTime);
                // Return to menu with spacebar
                if (this.gameState.gameOverTimer <= 0 && this.inputHandler.isFiring()) {
                    this.gameState.state = 'menu';
                    this.menuDelay = 0.3; // Delay before menu accepts input
                }
                break;
        }
        
        this.inputHandler.clearJustPressed();
    }
    
    updateGame(deltaTime) {
        // Handle startup delay (prevents firing when starting with spacebar)
        if (this.startupDelay > 0) {
            this.startupDelay -= deltaTime;
        }
        
        // Update player
        this.player.update(deltaTime, this.inputHandler);
        this.gameState.setLives(this.player.lives);
        
        // Player firing (only after startup delay)
        if (this.startupDelay <= 0 && this.inputHandler.isFiring() && this.player.canFire()) {
            const CONFIG = SpaceInvaders.CONFIG;
            // Boss levels grant a larger bullet allowance to keep the fight paced,
            // and rapid fire raises it further still
            const baseAllowance = this.isBossLevel
                ? CONFIG.BOSS.PLAYER_MAX_BULLETS
                : CONFIG.BULLETS.PLAYER.MAX_ACTIVE;
            const maxBullets = this.player.getMaxBullets(baseAllowance);
            if (this.playerBullets.length < maxBullets) {
                this.playerBullets.push(this.player.fire());
            }
        }

        // Update aliens
        this.updateAliens(deltaTime);

        // Update boss
        this.updateBoss(deltaTime);

        // Update UFO (boss levels have no mystery ship)
        if (!this.isBossLevel) {
            this.updateUFO(deltaTime);
        }

        // Update bullets
        this.updateBullets(deltaTime);
        
        // Update explosions
        this.updateExplosions(deltaTime);

        // Update falling power-up capsules
        this.updatePowerUps(deltaTime);

        // Check collisions
        this.checkCollisions();
        
        // Check win/lose conditions
        this.checkGameConditions();
    }
    
    updateAliens(deltaTime) {
        const CONFIG = SpaceInvaders.CONFIG;
        
        // Update animations
        for (const alien of this.aliens) {
            if (alien.active) {
                alien.updateAnimation(deltaTime);
            }
        }
        
        // Calculate movement
        const activeAliens = this.aliens.filter(a => a.active);
        if (activeAliens.length === 0) return;
        
        // Check boundaries
        let hitEdge = false;
        for (const alien of activeAliens) {
            const nextX = alien.x + this.alienDirection * this.alienSpeed * deltaTime;
            if (nextX < CONFIG.ALIENS.WIDTH / 2 + 10 || 
                nextX > CONFIG.CANVAS.WIDTH - CONFIG.ALIENS.WIDTH / 2 - 10) {
                hitEdge = true;
                break;
            }
        }
        
        if (hitEdge) {
            // Drop down and reverse direction
            this.alienDirection *= -1;
            for (const alien of activeAliens) {
                alien.y += CONFIG.ALIENS.DROP_DISTANCE;
            }
        } else {
            // Move horizontally
            for (const alien of activeAliens) {
                alien.x += this.alienDirection * this.alienSpeed * deltaTime;
            }
        }
        
        // Alien firing
        const now = Date.now();
        const fireRate = Math.max(
            CONFIG.ALIENS.MIN_FIRE_RATE,
            CONFIG.ALIENS.FIRE_RATE - (this.gameState.level - 1) * 200
        );
        
        if (now - this.lastAlienFireTime >= fireRate) {
            this.lastAlienFireTime = now;
            
            if (this.alienBullets.length < CONFIG.BULLETS.ALIEN.MAX_ACTIVE) {
                // Find bottom aliens in each column
                const bottomAliens = [];
                for (const alien of activeAliens) {
                    const col = Math.round((alien.x - CONFIG.ALIENS.START_X) / (CONFIG.ALIENS.WIDTH + CONFIG.ALIENS.PADDING_X));
                    if (!bottomAliens[col] || alien.y > bottomAliens[col].y) {
                        bottomAliens[col] = alien;
                    }
                }
                
                // Random bottom alien fires
                const shooters = bottomAliens.filter(a => a);
                if (shooters.length > 0) {
                    const shooter = shooters[Math.floor(Math.random() * shooters.length)];
                    this.alienBullets.push(new SpaceInvaders.Bullet(
                        shooter.x,
                        shooter.y + CONFIG.ALIENS.HEIGHT / 2,
                        false
                    ));
                }
            }
        }
    }
    
    updateBoss(deltaTime) {
        if (!this.boss) return;

        const CONFIG = SpaceInvaders.CONFIG;
        const wasDying = this.boss.state === 'dying';

        this.boss.update(deltaTime, {
            playerX: this.player.x,
            playerY: this.player.y,
            bullets: this.alienBullets,
            bulletLimit: CONFIG.BOSS.MAX_BULLETS
        });

        // Scatter explosions across the hull while the boss dies
        if (this.boss.state === 'dying' && Math.random() < 0.35) {
            const offsetX = (Math.random() - 0.5) * this.boss.width;
            const offsetY = (Math.random() - 0.5) * this.boss.height;
            this.explosions.push(new SpaceInvaders.Explosion(
                this.boss.x + offsetX,
                this.boss.y + offsetY,
                this.spriteManager
            ));
        }

        // Death animation finished - clear the boss so the level can complete
        if (wasDying && !this.boss.active) {
            this.boss = null;
        }
    }

    updateUFO(deltaTime) {
        const CONFIG = SpaceInvaders.CONFIG;
        
        if (this.ufo && this.ufo.active) {
            this.ufo.update(deltaTime);
        } else if (this.ufo) {
            // Flew off screen or was shot down - start the cooldown again
            this.ufo = null;
            this.lastUFOSpawnTime = Date.now();
        }

        // Spawn UFO. The interval is rolled whether or not the chance lands, so a
        // failed roll waits a full interval before trying again.
        const now = Date.now();
        if (!this.ufo && now - this.lastUFOSpawnTime >= CONFIG.UFO.SPAWN_INTERVAL) {
            this.lastUFOSpawnTime = now;
            if (Math.random() < CONFIG.UFO.SPAWN_CHANCE) {
                this.ufo = new SpaceInvaders.UFO(this.spriteManager);
            }
        }
    }
    
    updateBullets(deltaTime) {
        // Update player bullets
        for (const bullet of this.playerBullets) {
            bullet.update(deltaTime);
        }
        this.playerBullets = this.playerBullets.filter(b => b.active);
        
        // Update alien bullets
        for (const bullet of this.alienBullets) {
            bullet.update(deltaTime);
        }
        this.alienBullets = this.alienBullets.filter(b => b.active);
    }
    
    updateExplosions(deltaTime) {
        for (const explosion of this.explosions) {
            explosion.update(deltaTime);
        }
        this.explosions = this.explosions.filter(e => e.active);
    }

    /**
     * Roll for a power-up drop at a destroyed alien's position.
     * @param {number} x
     * @param {number} y
     */
    maybeDropPowerUp(x, y) {
        const config = SpaceInvaders.CONFIG.POWERUPS;
        if (this.powerUps.length >= config.MAX_ACTIVE) return;
        if (Math.random() >= config.DROP_CHANCE) return;

        this.powerUps.push(new SpaceInvaders.PowerUp(x, y, this.spriteManager));
    }

    updatePowerUps(deltaTime) {
        for (const powerUp of this.powerUps) {
            powerUp.update(deltaTime);
        }
        this.powerUps = this.powerUps.filter(p => p.active);
    }
    
    checkCollisions() {
        // Player bullets vs aliens
        for (const bullet of this.playerBullets) {
            if (!bullet.active) continue;
            
            for (const alien of this.aliens) {
                if (!alien.active) continue;
                
                if (bullet.collidesWith(alien)) {
                    bullet.active = false;
                    
                    // Use the new hitByBullet method to handle shields
                    const alienDestroyed = alien.hitByBullet();
                    
                    if (alienDestroyed) {
                        // Alien was destroyed
                        this.gameState.addScore(alien.points);
                        this.explosions.push(new SpaceInvaders.Explosion(
                            alien.x,
                            alien.y,
                            this.spriteManager,
                            this.alienDirection * this.alienSpeed
                        ));
                        
                        this.maybeDropPowerUp(alien.x, alien.y);

                        // Increase speed
                        const CONFIG = SpaceInvaders.CONFIG;
                        this.alienSpeed += CONFIG.ALIENS.SPEED_INCREASE;
                    } else {
                        // Shield was hit, create a shield popping explosion effect that follows the alien
                        this.explosions.push(new SpaceInvaders.ShieldExplosion(alien.x, alien.y, alien));
                    }
                    break;
                }
            }
            
            // Player bullets vs boss
            if (bullet.active && this.boss && this.boss.vulnerable && bullet.collidesWith(this.boss)) {
                bullet.active = false;
                const killed = this.boss.hitByBullet();
                this.explosions.push(new SpaceInvaders.Explosion(
                    bullet.x,
                    this.boss.y + this.boss.height / 2,
                    this.spriteManager
                ));
                if (killed) {
                    this.gameState.addScore(this.boss.points);
                }
            }

            // Player bullets vs UFO
            if (this.ufo && this.ufo.active && bullet.collidesWith(this.ufo)) {
                bullet.active = false;
                this.gameState.addScore(this.ufo.points);
                this.explosions.push(new SpaceInvaders.Explosion(this.ufo.x, this.ufo.y, this.spriteManager));
                this.ufo.active = false;
            }
        }
        
        // Bullets vs shields. Skip flattened shields - aliens overrunning a shield
        // clear its active flag, and an invisible shield must not keep eating shots.
        for (const shield of this.shields) {
            if (!shield.active) continue;
            for (const bullet of [...this.playerBullets, ...this.alienBullets]) {
                if (bullet.active && shield.checkCollision(bullet)) {
                    bullet.active = false;
                }
            }
        }
        
        // Alien bullets vs player
        if (!this.player.invulnerable) {
            for (const bullet of this.alienBullets) {
                if (bullet.active && bullet.collidesWith(this.player)) {
                    bullet.active = false;
                    this.explosions.push(new SpaceInvaders.Explosion(this.player.x, this.player.y, this.spriteManager));
                    
                    if (this.player.hit()) {
                        this.gameState.gameOver();
                    }
                    break;
                }
            }
        }
        
        // Power-up capsules vs player. Capsules pass straight through shields -
        // there is no capsule/shield check - so a pickup can never be stranded
        // behind cover the player cannot get to. Collection waits for the respawn
        // to finish, so a capsule is not silently absorbed while the ship is
        // blinking and not really back in play yet.
        if (this.player.respawnTime <= 0) {
            for (const powerUp of this.powerUps) {
                if (powerUp.active && powerUp.collidesWith(this.player)) {
                    powerUp.active = false;
                    this.player.applyPowerUp(powerUp.type);
                }
            }
        }

        // Aliens colliding with shields - destroy the shield
        for (const alien of this.aliens) {
            if (!alien.active) continue;
            
            for (const shield of this.shields) {
                if (shield.active && alien.collidesWith(shield)) {
                    shield.active = false;
                }
            }
        }
        
        // Aliens reaching bottom or hitting player
        const CONFIG = SpaceInvaders.CONFIG;
        for (const alien of this.aliens) {
            if (!alien.active) continue;
            
            if (alien.y + alien.height / 2 >= CONFIG.ALIENS.GAME_OVER_Y) {
                this.gameState.gameOver();
                break;
            }
            
            if (!this.player.invulnerable && alien.collidesWith(this.player)) {
                this.gameState.gameOver();
                break;
            }
        }
    }
    
    checkGameConditions() {
        // Boss levels end when the boss is destroyed and its death animation finishes
        if (this.isBossLevel) {
            if (!this.boss) {
                this.gameState.completeLevel();
            }
            return;
        }

        const activeAliens = this.aliens.filter(a => a.active);

        if (activeAliens.length === 0) {
            this.gameState.completeLevel();
        }
    }
    
    render() {
        this.renderer.clear();
        
        switch (this.gameState.state) {
            case 'menu':
                this.renderer.renderStartScreen(this.gameState.highScore);
                break;
            case 'playing':
            case 'paused':
            case 'levelComplete':
                this.renderGame();
                if (this.gameState.state === 'paused') {
                    this.renderer.renderPauseScreen();
                } else if (this.gameState.state === 'levelComplete') {
                    const CONFIG = SpaceInvaders.CONFIG;
                    const bossNext = CONFIG.BOSS.ENABLED &&
                        (this.gameState.level + 1) % CONFIG.BOSS.LEVEL_INTERVAL === 0;
                    this.renderer.renderLevelComplete(this.gameState.level, bossNext);
                }
                break;
            case 'gameOver':
                this.renderGame();
                this.renderer.renderGameOver(
                    this.gameState.score,
                    this.gameState.highScore,
                    this.gameState.isNewHighScore()
                );
                break;
        }
    }
    
    renderGame() {
        // Render shields
        this.renderer.renderEntities(this.shields);
        
        // Render player
        this.renderer.renderEntity(this.player);
        
        // Render aliens
        this.renderer.renderEntities(this.aliens.filter(a => a.active));

        // Render boss
        if (this.boss && this.boss.active) {
            this.renderer.renderEntity(this.boss);
        }

        // Render UFO
        if (this.ufo && this.ufo.active) {
            this.renderer.renderEntity(this.ufo);
        }
        
        // Render bullets
        this.renderer.renderEntities(this.playerBullets);
        this.renderer.renderEntities(this.alienBullets);
        
        // Render falling power-up capsules
        this.renderer.renderEntities(this.powerUps);

        // Render explosions
        this.renderer.renderEntities(this.explosions);

        // Render HUD
        this.renderer.renderHUD(this.gameState);

        // Active power-up readout, below the standard HUD
        if (this.player.powerUp) {
            this.renderer.renderPowerUpStatus(this.player);
        }

        // Boss health bar / warning banner sits above the standard HUD
        if (this.boss && this.boss.active && this.boss.state !== 'dying') {
            this.renderer.renderBossHUD(this.boss);
        }
    }
};
