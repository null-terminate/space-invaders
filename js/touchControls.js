/**
 * Touch Controls
 * On-screen D-pad + fire button for devices without a keyboard.
 *
 * The buttons only translate touches into the InputHandler's virtual actions -
 * no game logic lives here, so touch and keyboard play behave identically.
 */

window.SpaceInvaders = window.SpaceInvaders || {};

SpaceInvaders.TouchControls = class TouchControls {
    /**
     * @param {HTMLElement} container element to append the pad to
     * @param {SpaceInvaders.InputHandler} inputHandler receives the virtual actions
     */
    constructor(container, inputHandler) {
        this.container = container;
        this.inputHandler = inputHandler;
        this.buttons = [];

        if (!TouchControls.shouldEnable()) return;

        this.build();
    }

    /**
     * Whether to show the pad, per CONFIG.CONTROLS.TOUCH.SHOW.
     * 'auto' uses a hover/pointer media query rather than sniffing the user
     * agent: laptops with touchscreens keep the keyboard-only layout, while
     * phones and tablets get the pad.
     */
    static shouldEnable() {
        const mode = SpaceInvaders.CONFIG.CONTROLS.TOUCH.SHOW;
        if (mode === 'always') return true;
        if (mode === 'never') return false;

        const coarse = window.matchMedia('(hover: none) and (pointer: coarse)');
        return coarse.matches;
    }

    build() {
        const pad = document.createElement('div');
        pad.id = 'touch-controls';

        // Movement on the left, so a thumb can hold a direction while the other
        // thumb taps fire - the two-handed grip players expect on a phone.
        const moveGroup = document.createElement('div');
        moveGroup.className = 'touch-group';
        moveGroup.appendChild(this.makeHoldButton('◀', 'left', 'Move left'));
        moveGroup.appendChild(this.makeHoldButton('▶', 'right', 'Move right'));

        const actionGroup = document.createElement('div');
        actionGroup.className = 'touch-group';

        // Pause lives here rather than over the canvas, where it would sit on
        // top of the LIVES readout in the HUD.
        const pause = document.createElement('button');
        pause.className = 'touch-button touch-pause';
        pause.type = 'button';
        pause.textContent = '❚❚';
        pause.setAttribute('aria-label', 'Pause');
        this.bindTap(pause, () => this.inputHandler.queueAction('pause'));
        actionGroup.appendChild(pause);

        actionGroup.appendChild(this.makeHoldButton('FIRE', 'fire', 'Fire', 'touch-fire'));

        pad.appendChild(moveGroup);
        pad.appendChild(actionGroup);
        this.container.appendChild(pad);

        this.pad = pad;
    }

    /**
     * Button that holds an action for as long as it is pressed.
     * @param {string} label visible glyph or text
     * @param {'left'|'right'|'fire'} action virtual action to hold
     * @param {string} ariaLabel accessible name
     * @param {string} [extraClass] additional CSS class
     */
    makeHoldButton(label, action, ariaLabel, extraClass) {
        const button = document.createElement('button');
        button.className = 'touch-button' + (extraClass ? ' ' + extraClass : '');
        button.type = 'button';
        button.textContent = label;
        button.setAttribute('aria-label', ariaLabel);

        const press = (e) => {
            e.preventDefault();
            this.inputHandler.setAction(action, true);
            button.classList.add('pressed');
        };
        const release = (e) => {
            e.preventDefault();
            this.inputHandler.setAction(action, false);
            button.classList.remove('pressed');
        };

        // Pointer events cover touch, pen, and mouse in one path.
        button.addEventListener('pointerdown', (e) => {
            // Capture so the release still lands on this button even if the
            // finger slides off it. No pointerleave handler for that reason -
            // under capture it would fire on the slide and drop the action while
            // the finger is still down.
            if (button.setPointerCapture) {
                try {
                    button.setPointerCapture(e.pointerId);
                } catch (err) {
                    // Capture is best-effort; the window fallback below covers it
                }
            }
            press(e);
        });
        button.addEventListener('pointerup', release);
        button.addEventListener('pointercancel', release);

        // Fallback if capture was unavailable: a release anywhere clears the
        // action, so a button can never latch on.
        window.addEventListener('pointerup', () => {
            this.inputHandler.setAction(action, false);
            button.classList.remove('pressed');
        });

        // Suppress the synthetic click/zoom gestures touch would otherwise fire
        button.addEventListener('contextmenu', (e) => e.preventDefault());

        this.buttons.push(button);
        return button;
    }

    /**
     * Button that fires a one-shot action on tap.
     * @param {HTMLElement} button
     * @param {Function} handler
     */
    bindTap(button, handler) {
        button.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            handler();
        });
        button.addEventListener('contextmenu', (e) => e.preventDefault());
        this.buttons.push(button);
    }

    /** True if the pad was actually created for this device. */
    get enabled() {
        return Boolean(this.pad);
    }
};
