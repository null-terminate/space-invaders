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
    constructor(x, y, type, spriteManager) {
        const config = CONFIG.ALIENS;
        super(x, y, config.WIDTH, config.HEIGHT);
        this.type = type;
        this.sprite = spriteManager.createSprite(type);
        this.points = CONFIG.ALIEN_POINTS[type];
        this.color = CONFIG.ALIEN_COLORS[type];
        this.animationTimer = 0;
    }
    
    updateAnimation(deltaTime) {
        this.animationTimer += deltaTime * 1000;
        if (this.animationTimer >= CONFIG.ALIENS.ANIMATION_SPEED) {
            this.animationTimer = 0;
            if (this.sprite) {
                this.sprite.nextFrame();
            }
        }
    }
    
    render(ctx) {
        if (this.sprite) {
            this.sprite.render(ctx, this.x, this.y, 2, this.color);
        }
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
    }
    
    update(deltaTime) {
        this.x += this.speed * deltaTime;
        if ((this.speed > 0 && this.x > CONFIG.CANVAS.WIDTH + this.width) ||
            (this.speed < 0 && this.x < -this.width)) {
            this.active = false;
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
    constructor(x, y, spriteManager) {
        super(x, y, 32, 32);
        this.sprite = spriteManager.createSprite('explosion');
        this.duration = 300;
        this.elapsed = 0;
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
    }
    
    render(ctx) {
        if (this.sprite) {
            this.sprite.render(ctx, this.x, this.y, 2);
        }
    }
};
