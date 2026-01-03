/**
 * Input Handler
 * Manages keyboard input for the game
 */

window.SpaceInvaders = window.SpaceInvaders || {};

SpaceInvaders.InputHandler = class InputHandler {
    constructor() {
        this.keys = {};
        this.justPressed = {};
        this.setupListeners();
    }
    
    setupListeners() {
        window.addEventListener('keydown', (e) => {
            if (!this.keys[e.code]) {
                this.justPressed[e.code] = true;
            }
            this.keys[e.code] = true;
            
            // Prevent default for game keys
            const CONFIG = SpaceInvaders.CONFIG;
            const gameKeys = [
                ...CONFIG.CONTROLS.LEFT,
                ...CONFIG.CONTROLS.RIGHT,
                ...CONFIG.CONTROLS.FIRE,
                ...CONFIG.CONTROLS.PAUSE
            ];
            if (gameKeys.includes(e.code)) {
                e.preventDefault();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Clear keys when window loses focus
        window.addEventListener('blur', () => {
            this.keys = {};
            this.justPressed = {};
        });
    }
    
    isKeyDown(keyCode) {
        return this.keys[keyCode] === true;
    }
    
    isKeyJustPressed(keyCode) {
        if (this.justPressed[keyCode]) {
            this.justPressed[keyCode] = false;
            return true;
        }
        return false;
    }
    
    isMovingLeft() {
        const CONFIG = SpaceInvaders.CONFIG;
        return CONFIG.CONTROLS.LEFT.some(key => this.isKeyDown(key));
    }
    
    isMovingRight() {
        const CONFIG = SpaceInvaders.CONFIG;
        return CONFIG.CONTROLS.RIGHT.some(key => this.isKeyDown(key));
    }
    
    isFiring() {
        const CONFIG = SpaceInvaders.CONFIG;
        return CONFIG.CONTROLS.FIRE.some(key => this.isKeyDown(key));
    }
    
    isPausePressed() {
        const CONFIG = SpaceInvaders.CONFIG;
        return CONFIG.CONTROLS.PAUSE.some(key => this.isKeyJustPressed(key));
    }
    
    clearJustPressed() {
        this.justPressed = {};
    }
};
