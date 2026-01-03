/**
 * Sprite System
 * Handles rendering of text-based sprites with animation support
 */

window.SpaceInvaders = window.SpaceInvaders || {};

/**
 * Sprite class for rendering text-pattern based sprites
 */
SpaceInvaders.Sprite = class Sprite {
    constructor(spriteData) {
        this.frames = spriteData.frames;
        this.color = spriteData.color;
        this.currentFrame = 0;
        this.frameCount = this.frames.length;
        
        // Calculate dimensions from first frame
        this.height = this.frames[0].length;
        this.width = this.frames[0][0].length;
    }
    
    /**
     * Advance to next animation frame
     */
    nextFrame() {
        this.currentFrame = (this.currentFrame + 1) % this.frameCount;
    }
    
    /**
     * Set specific animation frame
     */
    setFrame(frameIndex) {
        this.currentFrame = frameIndex % this.frameCount;
    }
    
    /**
     * Get current frame data
     */
    getCurrentFrame() {
        return this.frames[this.currentFrame];
    }
    
    /**
     * Render sprite to canvas context
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position (center)
     * @param {number} y - Y position (center)
     * @param {number} scale - Scale factor for rendering
     * @param {string} [colorOverride] - Optional color override
     */
    render(ctx, x, y, scale = 2, colorOverride = null) {
        const frame = this.getCurrentFrame();
        const color = colorOverride || this.color;
        const pixelSize = scale;
        
        // Calculate top-left position (center the sprite)
        const startX = x - (this.width * pixelSize) / 2;
        const startY = y - (this.height * pixelSize) / 2;
        
        ctx.fillStyle = color;
        
        for (let row = 0; row < frame.length; row++) {
            for (let col = 0; col < frame[row].length; col++) {
                if (frame[row][col] === '█') {
                    ctx.fillRect(
                        startX + col * pixelSize,
                        startY + row * pixelSize,
                        pixelSize,
                        pixelSize
                    );
                }
            }
        }
    }
    
    /**
     * Get sprite bounds for collision detection
     */
    getBounds(x, y, scale = 2) {
        const pixelSize = scale;
        return {
            x: x - (this.width * pixelSize) / 2,
            y: y - (this.height * pixelSize) / 2,
            width: this.width * pixelSize,
            height: this.height * pixelSize
        };
    }
};

/**
 * SpriteManager - handles loading and caching sprites
 */
SpaceInvaders.SpriteManager = class SpriteManager {
    constructor() {
        this.sprites = {};
        this.loadSprites();
    }
    
    /**
     * Load all sprites from SPRITES config
     */
    loadSprites() {
        const SPRITES = SpaceInvaders.SPRITES;
        for (const [name, data] of Object.entries(SPRITES)) {
            this.sprites[name] = new SpaceInvaders.Sprite(data);
        }
    }
    
    /**
     * Get a sprite by name
     */
    getSprite(name) {
        return this.sprites[name];
    }
    
    /**
     * Create a new sprite instance (for entities that need independent animation)
     */
    createSprite(name) {
        const SPRITES = SpaceInvaders.SPRITES;
        if (SPRITES[name]) {
            return new SpaceInvaders.Sprite(SPRITES[name]);
        }
        return null;
    }
};
