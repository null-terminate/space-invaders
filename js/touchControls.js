/**
 * Touch Controls
 * Analog thumbstick + fire button for devices without a keyboard.
 *
 * The controls only translate touches into the InputHandler's virtual actions -
 * no game logic lives here, so touch and keyboard play behave identically.
 *
 * Each control tracks its own pointerId, so a thumb on the stick and a thumb on
 * FIRE never interfere: firing cannot cancel movement and vice versa.
 */

window.SpaceInvaders = window.SpaceInvaders || {};

SpaceInvaders.TouchControls = class TouchControls {
    /**
     * @param {HTMLElement} container element to append the controls to
     * @param {SpaceInvaders.InputHandler} inputHandler receives the virtual actions
     */
    constructor(container, inputHandler) {
        this.container = container;
        this.inputHandler = inputHandler;

        if (!TouchControls.shouldEnable()) return;

        this.build();
    }

    /**
     * Whether to show the controls, per CONFIG.CONTROLS.TOUCH.SHOW.
     * 'auto' uses a hover/pointer media query rather than sniffing the user
     * agent: laptops with touchscreens keep the keyboard-only layout, while
     * phones and tablets get the pad.
     */
    static shouldEnable() {
        const mode = SpaceInvaders.CONFIG.CONTROLS.TOUCH.SHOW;
        if (mode === 'always') return true;
        if (mode === 'never') return false;

        return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    }

    build() {
        const pad = document.createElement('div');
        pad.id = 'touch-controls';

        // Stick on the left, fire on the right: the standard two-thumb grip.
        pad.appendChild(this.makeStick());

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

        actionGroup.appendChild(this.makeFireButton());

        pad.appendChild(actionGroup);
        this.container.appendChild(pad);

        this.pad = pad;
    }

    /**
     * Analog slider. Distance from centre sets speed, side sets direction, so the
     * thumb can sweep across centre to reverse without ever lifting off. The
     * track is a horizontal pill because the ship only moves left and right.
     */
    makeStick() {
        const stickConfig = SpaceInvaders.CONFIG.CONTROLS.TOUCH.STICK;

        const base = document.createElement('div');
        base.className = 'touch-stick';
        base.setAttribute('role', 'slider');
        base.setAttribute('aria-label', 'Move ship left and right');
        base.style.width = stickConfig.TRACK_WIDTH + 'px';
        base.style.height = stickConfig.TRACK_HEIGHT + 'px';

        const knob = document.createElement('div');
        knob.className = 'touch-stick-knob';
        knob.style.width = stickConfig.KNOB_SIZE + 'px';
        knob.style.height = stickConfig.KNOB_SIZE + 'px';
        base.appendChild(knob);

        // Pointer currently driving the stick; null when nothing is on it.
        let activePointerId = null;

        /**
         * Centre and travel measured from what is actually on screen, not from
         * the CONFIG numbers - media queries resize the stick on short
         * landscape viewports, and hard-coded travel would then disagree with
         * the visual.
         */
        const geometry = () => {
            const baseRect = base.getBoundingClientRect();
            const knobWidth = knob.getBoundingClientRect().width;
            return {
                centreX: baseRect.left + baseRect.width / 2,
                maxTravel: Math.max(1, (baseRect.width - knobWidth) / 2)
            };
        };

        /** Position the knob and report the resulting axis value. */
        const applyPosition = (clientX) => {
            const { centreX, maxTravel } = geometry();
            const offset = clientX - centreX;
            const clamped = Math.max(-maxTravel, Math.min(maxTravel, offset));

            knob.style.transform = `translate(calc(-50% + ${clamped}px), -50%)`;

            // Normalise, then rescale past the dead zone so the usable range
            // still spans 0..1 rather than starting at DEAD_ZONE.
            const raw = clamped / maxTravel;
            const magnitude = Math.abs(raw);

            let output = 0;
            if (magnitude > stickConfig.DEAD_ZONE) {
                const scaled = (magnitude - stickConfig.DEAD_ZONE) / (1 - stickConfig.DEAD_ZONE);
                // Floor the output so a small nudge still moves the ship
                // perceptibly instead of crawling.
                const eased = stickConfig.MIN_OUTPUT +
                    (1 - stickConfig.MIN_OUTPUT) * scaled;
                output = Math.sign(raw) * eased;
            }

            this.inputHandler.setMoveAxis(output);
            base.classList.toggle('active', output !== 0);
        };

        const recentre = () => {
            knob.style.transform = 'translate(-50%, -50%)';
            this.inputHandler.setMoveAxis(0);
            base.classList.remove('active');
        };

        base.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            // Ignore extra fingers landing on an already-held stick
            if (activePointerId !== null) return;
            activePointerId = e.pointerId;
            // Capture so drags that leave the base keep steering, and so the
            // release is always delivered here.
            try {
                base.setPointerCapture(e.pointerId);
            } catch (err) {
                // Best-effort; the document-level fallback below covers it
            }
            applyPosition(e.clientX);
        });

        base.addEventListener('pointermove', (e) => {
            if (e.pointerId !== activePointerId) return;
            e.preventDefault();
            applyPosition(e.clientX);
        });

        const end = (e) => {
            // Only the finger that grabbed the stick can release it - a thumb
            // lifting off FIRE must not stop the ship.
            if (e.pointerId !== activePointerId) return;
            activePointerId = null;
            recentre();
        };
        base.addEventListener('pointerup', end);
        base.addEventListener('pointercancel', end);

        // Fallback for browsers where setPointerCapture failed: a release
        // anywhere for this pointer still recentres the stick.
        document.addEventListener('pointerup', end);
        document.addEventListener('pointercancel', end);

        base.addEventListener('contextmenu', (e) => e.preventDefault());

        recentre();
        return base;
    }

    /** Fire button - holds the fire action for as long as it is pressed. */
    makeFireButton() {
        const button = document.createElement('button');
        button.className = 'touch-button touch-fire';
        button.type = 'button';
        button.textContent = 'FIRE';
        button.setAttribute('aria-label', 'Fire');

        let activePointerId = null;

        const release = (e) => {
            // Scoped to the pointer that pressed it, so lifting the stick thumb
            // does not stop continuous fire.
            if (e.pointerId !== activePointerId) return;
            activePointerId = null;
            this.inputHandler.setAction('fire', false);
            button.classList.remove('pressed');
        };

        button.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (activePointerId !== null) return;
            activePointerId = e.pointerId;
            try {
                button.setPointerCapture(e.pointerId);
            } catch (err) {
                // Best-effort; the document-level fallback below covers it
            }
            this.inputHandler.setAction('fire', true);
            button.classList.add('pressed');
        });

        button.addEventListener('pointerup', release);
        button.addEventListener('pointercancel', release);
        document.addEventListener('pointerup', release);
        document.addEventListener('pointercancel', release);

        button.addEventListener('contextmenu', (e) => e.preventDefault());
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
    }

    /** True if the controls were actually created for this device. */
    get enabled() {
        return Boolean(this.pad);
    }
};
