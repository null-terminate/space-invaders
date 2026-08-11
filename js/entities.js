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
        
        // Movement (allowed even while invulnerable). The signed amount is +/-1
        // for keys and proportional for the thumbstick, so a partly-pushed stick
        // gives fine control while a full push matches keyboard top speed.
        this.x += inputHandler.getMoveAmount() * this.speed * deltaTime;
        
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
 * Boss bullet - travels along an arbitrary vector rather than straight down.
 * Lives in the alien bullet list so it hits the player and shields like any other.
 */
SpaceInvaders.BossBullet = class BossBullet extends SpaceInvaders.Entity {
    constructor(x, y, vx, vy) {
        const config = CONFIG.BOSS.BULLET;
        super(x, y, config.WIDTH, config.HEIGHT);
        this.vx = vx;
        this.vy = vy;
        this.color = config.COLOR;
        this.isPlayerBullet = false;
        this.angle = Math.atan2(vy, vx);
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        const margin = this.height;
        if (this.y < -margin || this.y > CONFIG.CANVAS.HEIGHT + margin ||
            this.x < -margin || this.x > CONFIG.CANVAS.WIDTH + margin) {
            this.active = false;
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        // Point the bolt along its travel direction (sprites face "down" at PI/2)
        ctx.rotate(this.angle - Math.PI / 2);
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-this.width / 4, -this.height / 2, this.width / 2, this.height / 2);
        ctx.restore();
    }
};

/**
 * Boss entity - a large multi-hit enemy that replaces the alien grid on boss levels.
 * Cycles through attack patterns, escalating as its health drops through three phases.
 */
SpaceInvaders.Boss = class Boss extends SpaceInvaders.Entity {
    /**
     * @param {SpaceInvaders.SpriteManager} spriteManager
     * @param {number} appearance - 1 for the first boss, 2 for the second, etc.
     */
    constructor(spriteManager, appearance = 1) {
        const config = CONFIG.BOSS;
        super(CONFIG.CANVAS.WIDTH / 2, -config.HEIGHT, config.WIDTH, config.HEIGHT);

        this.appearance = appearance;
        this.maxHealth = config.BASE_HEALTH + (appearance - 1) * config.HEALTH_PER_APPEARANCE;
        this.health = this.maxHealth;
        this.points = config.POINTS + (appearance - 1) * config.POINTS_PER_APPEARANCE;

        this.sprite = spriteManager.createSprite('boss');
        this.baseY = config.Y_POSITION;
        this.direction = Math.random() < 0.5 ? -1 : 1;
        this.baseSpeed = config.BASE_SPEED + (appearance - 1) * 15;

        this.state = 'entering';   // entering -> active -> dying
        this.stateTimer = 0;
        this.animationTimer = 0;
        this.bobTimer = 0;
        this.hitFlashTimer = 0;

        this.phase = 1;
        this.attackIndex = 0;
        this.attackTimer = config.ATTACKS.SPREAD.COOLDOWN * 0.5; // brief grace after entrance
        this.pendingShots = [];

        // Energy shield: absorbs hits before the boss takes any damage.
        // Second appearance onwards; scales with the boss's own health.
        const shieldConfig = config.SHIELD;
        this.maxShield = appearance >= shieldConfig.FIRST_APPEARANCE
            ? Math.max(1, Math.round(this.maxHealth * shieldConfig.HEALTH_FRACTION))
            : 0;
        this.shield = this.maxShield;
        this.shieldPulseTimer = 0;
        this.shieldBreakTimer = 0;
    }

    get healthFraction() {
        return Math.max(0, this.health / this.maxHealth);
    }

    /** True while the energy shield still has hit points. */
    get shieldActive() {
        return this.shield > 0;
    }

    get shieldFraction() {
        return this.maxShield > 0 ? Math.max(0, this.shield / this.maxShield) : 0;
    }

    /** Whether player bullets can currently damage the boss. */
    get vulnerable() {
        return this.state === 'active';
    }

    get color() {
        const colors = CONFIG.BOSS.PHASE_COLORS;
        return colors[Math.min(this.phase, colors.length) - 1];
    }

    /**
     * @param {number} deltaTime
     * @param {object} context - { playerX, playerY, bullets, bulletLimit }
     */
    update(deltaTime, context = {}) {
        const config = CONFIG.BOSS;
        this.stateTimer += deltaTime * 1000;

        // Animation and hit flash run in every state
        this.animationTimer += deltaTime * 1000;
        if (this.animationTimer >= config.ANIMATION_SPEED) {
            this.animationTimer = 0;
            if (this.sprite) this.sprite.nextFrame();
        }
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= deltaTime * 1000;
        }

        // Shield shimmer and shatter flash
        this.shieldPulseTimer += deltaTime * 1000;
        if (this.shieldBreakTimer > 0) {
            this.shieldBreakTimer -= deltaTime * 1000;
        }

        switch (this.state) {
            case 'entering':
                this.updateEntrance();
                break;
            case 'active':
                this.updateMovement(deltaTime);
                this.updateAttacks(deltaTime, context);
                break;
            case 'dying':
                // Drift and sink while the death animation plays out
                this.x += this.direction * this.baseSpeed * 0.3 * deltaTime;
                this.y += 30 * deltaTime;
                if (this.stateTimer >= config.DEATH_DURATION) {
                    this.active = false;
                }
                break;
        }
    }

    updateEntrance() {
        const config = CONFIG.BOSS;
        const progress = Math.min(1, this.stateTimer / config.ENTRANCE_DURATION);
        // Ease-out so the boss decelerates into its patrol height
        const eased = 1 - Math.pow(1 - progress, 3);
        this.y = -config.HEIGHT + (config.Y_POSITION + config.HEIGHT) * eased;

        if (progress >= 1) {
            this.y = config.Y_POSITION;
            this.state = 'active';
            this.stateTimer = 0;
        }
    }

    updateMovement(deltaTime) {
        const config = CONFIG.BOSS;
        const speed = this.baseSpeed * (1 + (this.phase - 1) * config.PHASE_SPEED_BONUS);

        this.x += this.direction * speed * deltaTime;

        const halfWidth = this.width / 2;
        const minX = halfWidth + 10;
        const maxX = CONFIG.CANVAS.WIDTH - halfWidth - 10;
        if (this.x <= minX) {
            this.x = minX;
            this.direction = 1;
        } else if (this.x >= maxX) {
            this.x = maxX;
            this.direction = -1;
        }

        // Gentle hover
        this.bobTimer += deltaTime;
        this.y = this.baseY + Math.sin(this.bobTimer * config.BOB_SPEED) * config.BOB_AMPLITUDE;
    }

    updateAttacks(deltaTime, context) {
        const config = CONFIG.BOSS;
        const bullets = context.bullets;
        if (!bullets) return;
        const limit = context.bulletLimit || config.MAX_BULLETS;

        // Release any queued multi-stage shots first.
        // fire() takes the bullet array as an argument rather than closing over it:
        // the game reassigns its bullet array every frame when filtering out spent
        // bullets, so a captured reference would go stale before the shot lands.
        for (const shot of this.pendingShots) {
            shot.delay -= deltaTime * 1000;
        }
        this.pendingShots = this.pendingShots.filter(shot => {
            if (shot.delay > 0) return true;
            if (bullets.length < limit) shot.fire(bullets);
            return false;
        });

        this.attackTimer -= deltaTime * 1000;
        if (this.attackTimer > 0) return;
        if (bullets.length >= limit) return;

        const rotation = config.PHASE_ATTACKS[Math.min(this.phase, config.PHASE_ATTACKS.length) - 1];
        const attackName = rotation[this.attackIndex % rotation.length];
        this.attackIndex++;

        const attack = config.ATTACKS[attackName];
        this.fireAttack(attackName, attack, context, limit);

        const cooldownScale = Math.max(0.4, 1 - (this.phase - 1) * config.PHASE_COOLDOWN_REDUCTION);
        this.attackTimer = attack.COOLDOWN * cooldownScale;
    }

    fireAttack(name, attack, context, limit) {
        const bullets = context.bullets;
        const muzzleY = this.y + this.height / 2;

        switch (name) {
            case 'SPREAD': {
                // Symmetrical fan aimed downwards from the boss belly
                const count = attack.BULLETS;
                const step = count > 1 ? attack.SPREAD_ANGLE / (count - 1) : 0;
                const start = Math.PI / 2 - attack.SPREAD_ANGLE / 2;
                for (let i = 0; i < count && bullets.length < limit; i++) {
                    const angle = start + step * i;
                    bullets.push(new SpaceInvaders.BossBullet(
                        this.x,
                        muzzleY,
                        Math.cos(angle) * attack.SPEED,
                        Math.sin(angle) * attack.SPEED
                    ));
                }
                break;
            }

            case 'AIMED': {
                // Three bolts tracking the player's current position
                const targetX = context.playerX != null ? context.playerX : this.x;
                const targetY = context.playerY != null ? context.playerY : CONFIG.CANVAS.HEIGHT;
                const baseAngle = Math.atan2(targetY - muzzleY, targetX - this.x);
                for (const offset of [-attack.FAN_ANGLE, 0, attack.FAN_ANGLE]) {
                    if (bullets.length >= limit) break;
                    const angle = baseAngle + offset;
                    bullets.push(new SpaceInvaders.BossBullet(
                        this.x,
                        muzzleY,
                        Math.cos(angle) * attack.SPEED,
                        Math.sin(angle) * attack.SPEED
                    ));
                }
                break;
            }

            case 'VOLLEY': {
                // Alternating cannon fire, staggered over time
                const offsets = [-this.width * 0.32, this.width * 0.32];
                for (let i = 0; i < attack.COUNT; i++) {
                    const offsetX = offsets[i % offsets.length];
                    this.pendingShots.push({
                        delay: i * attack.INTERVAL,
                        fire: (list) => {
                            list.push(new SpaceInvaders.BossBullet(
                                this.x + offsetX,
                                this.y + this.height / 2,
                                0,
                                attack.SPEED
                            ));
                        }
                    });
                }
                break;
            }

            case 'SWEEP': {
                // A curtain of bullets across the screen with a dodgeable gap
                const columns = attack.COLUMNS;
                const spacing = CONFIG.CANVAS.WIDTH / columns;
                const gapStart = Math.floor(Math.random() * (columns - 1));
                for (let i = 0; i < columns; i++) {
                    if (i === gapStart || i === gapStart + 1) continue;
                    const x = spacing * (i + 0.5);
                    this.pendingShots.push({
                        delay: i * 40,
                        fire: (list) => {
                            list.push(new SpaceInvaders.BossBullet(
                                x,
                                this.y,
                                0,
                                attack.SPEED
                            ));
                        }
                    });
                }
                break;
            }
        }
    }

    /**
     * Apply one bullet of damage. The energy shield soaks hits first; only once
     * it is down does the boss's own health start dropping.
     * @returns {boolean} true if this hit killed the boss
     */
    hitByBullet() {
        if (!this.vulnerable) return false;

        this.hitFlashTimer = CONFIG.BOSS.HIT_FLASH_DURATION;

        // Shield absorbs the hit; boss health and phase are untouched
        if (this.shieldActive) {
            this.shield--;
            if (this.shield <= 0) {
                this.shield = 0;
                this.shieldBreakTimer = CONFIG.BOSS.SHIELD.BREAK_FLASH_DURATION;
            }
            return false;
        }

        this.health--;

        // Escalate phase as health drops
        const fraction = this.healthFraction;
        const newPhase = fraction > 2 / 3 ? 1 : (fraction > 1 / 3 ? 2 : 3);
        if (newPhase > this.phase) {
            this.phase = newPhase;
            this.attackIndex = 0;
            this.attackTimer = Math.min(this.attackTimer, 400);
        }

        if (this.health <= 0) {
            this.health = 0;
            this.state = 'dying';
            this.stateTimer = 0;
            this.pendingShots = [];
            return true;
        }
        return false;
    }

    render(ctx) {
        if (!this.sprite) return;

        const config = CONFIG.BOSS;

        if (this.state === 'dying') {
            // Flicker out over the death animation
            const progress = this.stateTimer / config.DEATH_DURATION;
            if (Math.floor(this.stateTimer / 60) % 2 === 0) return;
            ctx.save();
            ctx.globalAlpha = Math.max(0, 1 - progress);
            this.sprite.render(ctx, this.x, this.y, config.SPRITE_SCALE, '#ffaa00');
            ctx.restore();
            return;
        }

        const color = this.hitFlashTimer > 0 ? '#ffffff' : this.color;

        ctx.save();
        if (this.state === 'entering') {
            ctx.globalAlpha = Math.min(1, this.stateTimer / (config.ENTRANCE_DURATION * 0.4));
        }
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.phase >= 3 ? 18 : 10;
        this.sprite.render(ctx, this.x, this.y, config.SPRITE_SCALE, color);
        ctx.restore();

        // Shield bubble sits on top of the hull
        if (this.shieldActive) {
            this.renderShield(ctx);
        } else if (this.shieldBreakTimer > 0) {
            this.renderShieldBreak(ctx);
        }
    }

    /**
     * Elliptical energy bubble hugging the boss hull. Opacity tracks remaining
     * shield HP so the player can read how close it is to breaking.
     */
    renderShield(ctx) {
        const shieldConfig = CONFIG.BOSS.SHIELD;
        const rx = this.width * 0.62;
        const ry = this.height * 0.95;
        const pulse = 0.75 + 0.25 * Math.sin(this.shieldPulseTimer * shieldConfig.PULSE_SPEED);
        // Fade the bubble as it weakens, but keep it clearly visible
        const strength = 0.35 + 0.65 * this.shieldFraction;
        const alpha = pulse * strength;

        ctx.save();
        ctx.shadowColor = shieldConfig.COLOR;
        ctx.shadowBlur = 12 * pulse;

        // Outer ring
        ctx.strokeStyle = `rgba(102, 204, 255, ${(0.85 * alpha).toFixed(3)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();

        // Inner ring
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(180, 235, 255, ${(0.55 * alpha).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, rx - 5, ry - 4, 0, 0, 2 * Math.PI);
        ctx.stroke();

        // Faint fill so the bubble reads as a surface, not just an outline
        ctx.fillStyle = `rgba(102, 204, 255, ${(0.10 * alpha).toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, rx, ry, 0, 0, 2 * Math.PI);
        ctx.fill();

        ctx.restore();
    }

    /** Expanding shockwave the moment the shield shatters. */
    renderShieldBreak(ctx) {
        const shieldConfig = CONFIG.BOSS.SHIELD;
        const progress = 1 - this.shieldBreakTimer / shieldConfig.BREAK_FLASH_DURATION;
        const alpha = Math.max(0, 1 - progress);
        const rx = this.width * (0.62 + 0.5 * progress);
        const ry = this.height * (0.95 + 0.6 * progress);

        ctx.save();
        ctx.shadowColor = shieldConfig.COLOR;
        ctx.shadowBlur = 20 * alpha;
        ctx.strokeStyle = `rgba(180, 235, 255, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 4 * alpha + 1;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();
    }
};

/**
 * Explosion effect entity
 */
SpaceInvaders.Explosion = class Explosion extends SpaceInvaders.Entity {
    /**
     * @param {number} x
     * @param {number} y
     * @param {SpaceInvaders.SpriteManager} spriteManager
     * @param {number} [driftX] signed horizontal velocity in px/s. Explosions born
     *   from a marching alien inherit its drift so the puff keeps pace with the
     *   rank it came from instead of hanging in place.
     */
    constructor(x, y, spriteManager, driftX = 0) {
        super(x, y, 32, 32);
        this.sprite = spriteManager.createSprite('explosion');
        this.duration = 300;
        this.elapsed = 0;
        this.driftX = driftX;
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

        this.x += this.driftX * deltaTime;
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
