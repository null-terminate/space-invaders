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

        // Virtual actions driven by on-screen controls.
        // Held actions mirror keys; queued actions mirror justPressed.
        this.actions = { left: false, right: false, fire: false };
        this.queuedActions = { pause: false, fire: false };

        // Analog horizontal axis from the thumbstick, -1 (full left) to 1 (full
        // right), 0 when centred. Keyboard input is digital, so it reports +/-1.
        this.moveAxis = 0;

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
            this.releaseAllActions();
        });
    }

    /**
     * Set the analog movement axis from the thumbstick.
     * @param {number} value -1 (full left) to 1 (full right)
     */
    setMoveAxis(value) {
        this.moveAxis = Math.max(-1, Math.min(1, value));
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
        this.moveAxis = 0;
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

    /**
     * Signed movement amount, -1..1. Analog when the thumbstick is driving it,
     * full-scale for keys and on-screen direction buttons. Opposing inputs
     * cancel, so holding both directions parks the ship.
     * @returns {number}
     */
    getMoveAmount() {
        if (this.moveAxis !== 0) return this.moveAxis;

        const CONFIG = SpaceInvaders.CONFIG;
        let amount = 0;
        if (this.actions.left || CONFIG.CONTROLS.LEFT.some(key => this.isKeyDown(key))) {
            amount -= 1;
        }
        if (this.actions.right || CONFIG.CONTROLS.RIGHT.some(key => this.isKeyDown(key))) {
            amount += 1;
        }
        return amount;
    }

    /**
     * Whether fire is being requested this frame.
     *
     * justPressed is consulted alongside the held state because a tap short
     * enough to start and end between two frames has already released by the
     * time the loop polls, and held-state alone would drop it - most visible on
     * the menu and game-over screens, where a quick tap did nothing. It is
     * peeked rather than consumed, and clearJustPressed wipes it once per frame,
     * so a single tap still fires exactly once.
     * @returns {boolean}
     */
    isFiring() {
        const CONFIG = SpaceInvaders.CONFIG;
        return this.actions.fire ||
            this.queuedActions.fire ||
            CONFIG.CONTROLS.FIRE.some(key => this.isKeyDown(key) || this.justPressed[key] === true);
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
