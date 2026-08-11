/**
 * Input Handler
 * Manages keyboard and touch input for the game.
 *
 * Both sources feed the same four virtual actions (left / right / fire / pause),
 * so the game loop never needs to know how a control was triggered.
 */

window.SpaceInvaders = window.SpaceInvaders || {};

SpaceInvaders.InputHandler = class InputHandler {
    constructor() {
        this.keys = {};
        this.justPressed = {};

        // Virtual actions driven by on-screen buttons / canvas drags.
        // Held actions mirror keys; queued actions mirror justPressed.
        this.actions = { left: false, right: false, fire: false };
        this.queuedActions = { pause: false, fire: false };

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
            this.actions = { left: false, right: false, fire: false };
        });
    }

    /**
     * Set a held virtual action (button pressed down / released).
     * @param {'left'|'right'|'fire'} action
     * @param {boolean} pressed
     */
    setAction(action, pressed) {
        if (!(action in this.actions)) return;
        this.actions[action] = pressed;
    }

    /**
     * Queue a one-shot virtual action, consumed by the next poll.
     * Used for pause and for menu/game-over taps, where a held button
     * would otherwise re-trigger every frame.
     * @param {'pause'|'fire'} action
     */
    queueAction(action) {
        if (!(action in this.queuedActions)) return;
        this.queuedActions[action] = true;
    }

    /** Release every held virtual action (e.g. when a touch is cancelled). */
    releaseAllActions() {
        this.actions = { left: false, right: false, fire: false };
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
        return this.actions.left || CONFIG.CONTROLS.LEFT.some(key => this.isKeyDown(key));
    }

    isMovingRight() {
        const CONFIG = SpaceInvaders.CONFIG;
        return this.actions.right || CONFIG.CONTROLS.RIGHT.some(key => this.isKeyDown(key));
    }

    isFiring() {
        const CONFIG = SpaceInvaders.CONFIG;
        return this.actions.fire ||
            this.queuedActions.fire ||
            CONFIG.CONTROLS.FIRE.some(key => this.isKeyDown(key));
    }

    isPausePressed() {
        const CONFIG = SpaceInvaders.CONFIG;
        if (this.queuedActions.pause) {
            this.queuedActions.pause = false;
            return true;
        }
        return CONFIG.CONTROLS.PAUSE.some(key => this.isKeyJustPressed(key));
    }

    clearJustPressed() {
        this.justPressed = {};
        this.queuedActions.fire = false;
    }
};
