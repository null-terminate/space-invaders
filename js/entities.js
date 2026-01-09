/**
 * Game Entities
 * Defines all game objects: Player, Alien, Bullet, Shield, UFO
 */

window.SpaceInvaders = window.SpaceInvaders || {};

const CONFIG = SpaceInvaders.CONFIG;

/**
 * Base Entity class
 */
SpaceInvaders.Entity = class Entity {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.active = true;
        this.sprite = null;
    }
    
    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }
    
    collidesWith(other) {
        const a = this.getBounds();
        const b = other.getBounds();
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }
    
    update(deltaTime) {}
    render(ctx) {}
};

/**
 * Player entity
 */
SpaceInvaders.Player = class Player extends SpaceInvaders.Entity {
    constructor(spriteManager) {
        const config = CONFIG.PLAYER;
        super(
            CONFIG.CANVAS.WIDTH / 2,
            CONFIG.CANVAS.HEIGHT - 50,
            config.WIDTH,
            config.HEIGHT
        );
        this.speed = config.SPEED;
        this.sprite = spriteManager.createSprite('player');
        this.lastFireTime = 0;
        this.fireRate = config.FIRE_RATE;
        this.lives = config.START_LIVES;
        this.respawnTime = 0;
        this.invulnerable = false;
    }
    
    update(deltaTime, inputHandler) {
        // Handle respawn timer
        if (this.respawnTime > 0) {
            this.respawnTime -= deltaTime * 1000;
            if (this.respawnTime <= 0) {
                this.respawnTime = 0;
                this.invulnerable = false;
            }
        }
        
        // Movement (allowed even while invulnerable)
        if (inputHandler.isMovingLeft()) {
            this.x -= this.speed * deltaTime;
        }
        if (inputHandler.isMovingRight()) {
            this.x += this.speed * deltaTime;
        }
        
        // Keep within bounds
        const halfWidth = this.width / 2;
        this.x = Math.max(halfWidth, Math.min(CONFIG.CANVAS.WIDTH - halfWidth, this.x));
    }
    
    canFire() {
        return Date.now() - this.lastFireTime >= this.fireRate && this.respawnTime <= 0;
    }
    
    fire() {
        this.lastFireTime = Date.now();
        return new SpaceInvaders.Bullet(
            this.x,
            this.y - this.height / 2,
            true
        );
    }
    
    hit() {
        this.lives--;
        if (this.lives > 0) {
            this.respawnTime = CONFIG.PLAYER.RESPAWN_DELAY;
            this.invulnerable = true;
            this.x = CONFIG.CANVAS.WIDTH / 2;
        }
        return this.lives <= 0;
    }
    
    render(ctx) {
        if (this.respawnTime > 0 && Math.floor(this.respawnTime / 100) % 2 === 0) {
            return; // Blink effect during respawn
        }
        if (this.sprite) {
            this.sprite.render(ctx, this.x, this.y, 2);
        }
    }
};

/**
 * Alien entity
 */
SpaceInvaders.Alien = class Alien extends SpaceInvaders.Entity {
    constructor(x, y, type, spriteManager, hasShield = false) {
        const config = CONFIG.ALIENS;
        super(x, y, config.WIDTH, config.HEIGHT);
        this.type = type;
        this.sprite = spriteManager.createSprite(type);
        this.points = CONFIG.ALIEN_POINTS[type];
        this.color = CONFIG.ALIEN_COLORS[type];
        this.animationTimer = 0;
        this.hasShield = hasShield;
        this.shieldActive = hasShield;
        this.shieldGlowTimer = 0;
    }
    
    updateAnimation(deltaTime) {
        this.animationTimer += deltaTime * 1000;
        if (this.animationTimer >= CONFIG.ALIENS.ANIMATION_SPEED) {
            this.animationTimer = 0;
            if (this.sprite) {
                this.sprite.nextFrame();
            }
        }
        
        // Update shield glow animation
        if (this.shieldActive) {
            this.shieldGlowTimer += deltaTime * 1000;
        }
    }
    
    // Method to handle being hit by a bullet
    hitByBullet() {
        if (this.shieldActive) {
            // First hit removes shield
            this.shieldActive = false;
            return false; // Alien not destroyed yet
        } else {
            // Second hit (or first hit if no shield) destroys alien
            this.active = false;
            return true; // Alien destroyed
        }
    }
    
    render(ctx) {
        if (this.sprite) {
            this.sprite.render(ctx, this.x, this.y, 2, this.color);
        }
        
        // Render shield if active
        if (this.shieldActive) {
            this.renderShield(ctx);
        }
    }
    
    renderShield(ctx) {
        const radius = this.width * 0.5;  // Smaller shield (was 0.7)
        const glowIntensity = 0.5 + 0.3 * Math.sin(this.shieldGlowTimer * 0.005);
        
        ctx.save();
        
        // Create bright neon orange glow effect
        ctx.shadowColor = '#ff8800ff';  // Bright neon orange shadow
        ctx.shadowBlur = 15 * glowIntensity;
        
        // Draw outer glow
        ctx.strokeStyle = `rgba(255, 180, 50, ${0.3 * glowIntensity})`;  // Light neon orange
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius + 2, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Draw main shield circle
        ctx.shadowBlur = 8 * glowIntensity;
        ctx.strokeStyle = `rgba(255, 102, 0, ${0.8 * glowIntensity})`;  // Main neon orange
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Draw inner bright circle
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(255, 220, 100, ${0.6 * glowIntensity})`;  // Bright electric orange
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius - 2, 0, 2 * Math.PI);
        ctx.stroke();
        
        ctx.restore();
    }
};

/**
 * Bullet entity
 */
SpaceInvaders.Bullet = class Bullet extends SpaceInvaders.Entity {
    constructor(x, y, isPlayerBullet = true) {
        const config = isPlayerBullet ? CONFIG.BULLETS.PLAYER : CONFIG.BULLETS.ALIEN;
        super(x, y, config.WIDTH, config.HEIGHT);
        this.isPlayerBullet = isPlayerBullet;
        this.speed = isPlayerBullet ? -config.SPEED : config.SPEED;
        this.color = config.COLOR;
    }
    
    update(deltaTime) {
        this.y += this.speed * deltaTime;
        if (this.y < 0 || this.y > CONFIG.CANVAS.HEIGHT) {
            this.active = false;
        }
    }
    
    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(
            this.x - this.width / 2,
            this.y - this.height / 2,
            this.width,
            this.height
        );
    }
};

/**
 * Shield entity with destructible blocks
 */
SpaceInvaders.Shield = class Shield extends SpaceInvaders.Entity {
    constructor(x, y, spriteManager) {
        const config = CONFIG.SHIELDS;
        super(x, y, config.WIDTH, config.HEIGHT);
        this.blockSize = config.BLOCK_SIZE;
        this.color = config.COLOR;
        this.blocks = this.initBlocks(spriteManager);
    }
    
    initBlocks(spriteManager) {
        const blocks = [];
        const sprite = spriteManager.getSprite('shield');
        
        if (sprite) {
            const frame = sprite.getCurrentFrame();
            const scale = this.blockSize / 2;
            
            for (let row = 0; row < frame.length; row++) {
                for (let col = 0; col < frame[row].length; col++) {
                    if (frame[row][col] === '█') {
                        blocks.push({
                            x: col * scale,
                            y: row * scale,
                            width: scale,
                            height: scale,
                            active: true
                        });
                    }
                }
            }
        }
        return blocks;
    }
    
    checkCollision(bullet) {
        const bulletBounds = bullet.getBounds();
        const shieldX = this.x - this.width / 2;
        const shieldY = this.y - this.height / 2;
        
        for (const block of this.blocks) {
            if (!block.active) continue;
            
            const blockX = shieldX + block.x;
            const blockY = shieldY + block.y;
            
            if (bulletBounds.x < blockX + block.width &&
                bulletBounds.x + bulletBounds.width > blockX &&
                bulletBounds.y < blockY + block.height &&
                bulletBounds.y + bulletBounds.height > blockY) {
                this.damageAt(block.x, block.y);
                return true;
            }
        }
        return false;
    }
    
    damageAt(hitX, hitY) {
        const radius = CONFIG.SHIELDS.DAMAGE_RADIUS;
        for (const block of this.blocks) {
            if (!block.active) continue;
            const dx = block.x - hitX;
            const dy = block.y - hitY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= radius * this.blockSize) {
                if (Math.random() < 0.7) {
                    block.active = false;
                }
            }
        }
    }
    
    render(ctx) {
        const shieldX = this.x - this.width / 2;
        const shieldY = this.y - this.height / 2;
        ctx.fillStyle = this.color;
        for (const block of this.blocks) {
            if (block.active) {
                ctx.fillRect(shieldX + block.x, shieldY + block.y, block.width, block.height);
            }
        }
    }
};

/**
 * UFO (Mystery Ship) entity
 */
SpaceInvaders.UFO = class UFO extends SpaceInvaders.Entity {
    constructor(spriteManager) {
        const config = CONFIG.UFO;
        const startX = Math.random() < 0.5 ? -config.WIDTH : CONFIG.CANVAS.WIDTH + config.WIDTH;
        super(startX, 40, config.WIDTH, config.HEIGHT);
        this.speed = startX < 0 ? config.SPEED : -config.SPEED;
        this.sprite = spriteManager.createSprite('ufo');
        this.points = config.POINTS[Math.floor(Math.random() * config.POINTS.length)];
        console.log('ufo: spawned at ' + this.x);
    }
    
    update(deltaTime) {
        this.x += this.speed * deltaTime;
        if ((this.speed > 0 && this.x > CONFIG.CANVAS.WIDTH + this.width) ||
            (this.speed < 0 && this.x < -this.width)) {
            this.active = false;
            console.log('ufo: deactivated at ' + this.x);
        }
    }
    
    render(ctx) {
        if (this.sprite) {
            this.sprite.render(ctx, this.x, this.y, 2, '#ff0000');
        }
    }
};

/**
 * Explosion effect entity
 */
SpaceInvaders.Explosion = class Explosion extends SpaceInvaders.Entity {
    constructor(x, y, spriteManager, alien = null, alienDirection = 1, alienSpeed = 0) {
        super(x, y, 32, 32);
        this.sprite = spriteManager.createSprite('explosion');
        this.duration = 300;
        this.elapsed = 0;
        this.alienDirection = alienDirection; // Direction for trajectory
        this.alienSpeed = alienSpeed; // Speed for trajectory
    }
    
    update(deltaTime) {
        this.elapsed += deltaTime * 1000;
        if (this.elapsed >= this.duration) {
            this.active = false;
        } else {
            const frameIndex = Math.floor(this.elapsed / (this.duration / 2));
            if (this.sprite) {
                this.sprite.setFrame(frameIndex);
            }
        }
        
        // Continue moving along the alien's trajectory independently
        this.x += this.alienDirection * this.alienSpeed * deltaTime;
    }
    
    render(ctx) {
        if (this.sprite) {
            this.sprite.render(ctx, this.x, this.y, 2);
        }
    }
};

/**
 * Shield explosion effect - creates a "popping" animation
 */
SpaceInvaders.ShieldExplosion = class ShieldExplosion extends SpaceInvaders.Entity {
    constructor(x, y, alien = null) {
        super(x, y, 50, 50);
        this.duration = 500; // Longer duration for more visible effect
        this.elapsed = 0;
        this.maxRadius = 25; // Smaller maximum expansion radius (half of 50)
        this.alien = alien; // Reference to the alien to follow
    }
    
    update(deltaTime) {
        this.elapsed += deltaTime * 1000;
        if (this.elapsed >= this.duration) {
            this.active = false;
        }
        
        // Follow the alien's position if it's still active
        if (this.alien && this.alien.active) {
            this.x = this.alien.x;
            this.y = this.alien.y;
        }
    }
    
    render(ctx) {
        if (!this.active) return;
        
        const progress = this.elapsed / this.duration;
        const radius = this.maxRadius * progress;
        const alpha = Math.max(0.2, 1.0 - progress); // Slower fade, minimum 20% opacity
        
        ctx.save();
        
        // Add glow effect
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 10;
        
        // Outer expanding ring - brightest
        ctx.strokeStyle = `rgba(255, 102, 0, ${Math.min(1.0, alpha * 1.5)})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Middle expanding ring
        ctx.strokeStyle = `rgba(255, 140, 0, ${Math.min(1.0, alpha * 1.2)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius * 0.7, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Inner expanding ring
        ctx.strokeStyle = `rgba(255, 180, 50, ${Math.min(1.0, alpha * 1.8)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius * 0.4, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Bright center flash (lasts longer)
        if (progress < 0.6) {
            ctx.fillStyle = `rgba(255, 220, 100, ${Math.min(1.0, alpha * 2.5)})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, Math.max(3, radius * 0.15), 0, 2 * Math.PI);
            ctx.fill();
        }
        
        ctx.restore();
    }
};
