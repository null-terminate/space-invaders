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
        
        this.player = null;
        this.aliens = [];
        this.playerBullets = [];
        this.alienBullets = [];
        this.shields = [];
        this.explosions = [];
        this.ufo = null;
        
        this.alienDirection = 1;
        this.alienSpeed = SpaceInvaders.CONFIG.ALIENS.BASE_SPEED;
        this.lastAlienFireTime = 0;
        this.lastUFOSpawnTime = 0;
        
        this.lastTime = 0;
        this.running = false;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('click', () => {
            if (this.gameState.state === 'menu') {
                this.startGame();
            } else if (this.gameState.state === 'gameOver' && this.gameState.gameOverTimer <= 0) {
                this.gameState.state = 'menu';
            }
        });
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
        
        // Create aliens
        this.aliens = [];
        const alienConfig = CONFIG.ALIENS;
        for (let row = 0; row < alienConfig.ROWS; row++) {
            for (let col = 0; col < alienConfig.COLS; col++) {
                const type = CONFIG.ALIEN_TYPES[row];
                const x = alienConfig.START_X + col * (alienConfig.WIDTH + alienConfig.PADDING_X);
                const y = alienConfig.START_Y + row * (alienConfig.HEIGHT + alienConfig.PADDING_Y);
                this.aliens.push(new SpaceInvaders.Alien(x, y, type, this.spriteManager));
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
        
        // Reset bullets and effects
        this.playerBullets = [];
        this.alienBullets = [];
        this.explosions = [];
        this.ufo = null;
        
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
        
        const deltaTime = (currentTime - this.lastTime) / 1000;
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
                // Start game with spacebar
                if (this.inputHandler.isFiring()) {
                    this.startGame();
                }
                break;
            case 'playing':
                this.updateGame(deltaTime);
                break;
            case 'paused':
                break;
            case 'levelComplete':
                const result = this.gameState.update(deltaTime);
                if (result === 'nextLevel') {
                    this.initLevel();
                }
                break;
            case 'gameOver':
                this.gameState.update(deltaTime);
                this.updateExplosions(deltaTime);
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
            if (this.playerBullets.length < CONFIG.BULLETS.PLAYER.MAX_ACTIVE) {
                this.playerBullets.push(this.player.fire());
            }
        }
        
        // Update aliens
        this.updateAliens(deltaTime);
        
        // Update UFO
        this.updateUFO(deltaTime);
        
        // Update bullets
        this.updateBullets(deltaTime);
        
        // Update explosions
        this.updateExplosions(deltaTime);
        
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
    
    updateUFO(deltaTime) {
        const CONFIG = SpaceInvaders.CONFIG;
        
        if (this.ufo && this.ufo.active) {
            this.ufo.update(deltaTime);
        } else {
            this.ufo = null;
        }
        
        // Spawn UFO
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
    
    checkCollisions() {
        // Player bullets vs aliens
        for (const bullet of this.playerBullets) {
            if (!bullet.active) continue;
            
            for (const alien of this.aliens) {
                if (!alien.active) continue;
                
                if (bullet.collidesWith(alien)) {
                    bullet.active = false;
                    alien.active = false;
                    this.gameState.addScore(alien.points);
                    this.explosions.push(new SpaceInvaders.Explosion(alien.x, alien.y, this.spriteManager));
                    
                    // Increase speed
                    const CONFIG = SpaceInvaders.CONFIG;
                    this.alienSpeed += CONFIG.ALIENS.SPEED_INCREASE;
                    break;
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
        
        // Bullets vs shields
        for (const shield of this.shields) {
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
                    this.renderer.renderLevelComplete(this.gameState.level);
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
        
        // Render UFO
        if (this.ufo && this.ufo.active) {
            this.renderer.renderEntity(this.ufo);
        }
        
        // Render bullets
        this.renderer.renderEntities(this.playerBullets);
        this.renderer.renderEntities(this.alienBullets);
        
        // Render explosions
        this.renderer.renderEntities(this.explosions);
        
        // Render HUD
        this.renderer.renderHUD(this.gameState);
    }
};
