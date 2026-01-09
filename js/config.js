/**
 * Game Configuration
 * Central configuration file for all game settings
 */

// Create global namespace
window.SpaceInvaders = window.SpaceInvaders || {};

SpaceInvaders.CONFIG = {
    // Canvas settings
    CANVAS: {
        WIDTH: 800,
        HEIGHT: 600,
        BACKGROUND_COLOR: '#000000'
    },
    
    // Player settings
    PLAYER: {
        WIDTH: 52,
        HEIGHT: 32,
        SPEED: 300,          // pixels per second
        COLOR: '#00ff00',
        START_LIVES: 3,
        RESPAWN_DELAY: 2000, // milliseconds
        FIRE_RATE: 200       // minimum ms between shots
    },
    
    // Alien settings
    ALIENS: {
        ROWS: 5,
        COLS: 11,
        WIDTH: 40,
        HEIGHT: 32,
        PADDING_X: 16,
        PADDING_Y: 16,
        START_X: 60,
        START_Y: 80,
        BASE_SPEED: 50,           // pixels per second (lower = slower)
        SPEED_INCREASE: 2,        // speed increase per destroyed alien
        DROP_DISTANCE: 8,         // pixels to drop when hitting edge (lower = smaller descent)
        FIRE_RATE: 2000,          // base ms between alien shots
        MIN_FIRE_RATE: 200,       // minimum ms between shots
        ANIMATION_SPEED: 1000,    // ms between animation frames
        GAME_OVER_Y: 500          // Y position at which aliens trigger game over (lower = more time)
    },
    
    // Alien types configuration (row index -> type)
    ALIEN_TYPES: {
        0: 'squid',      // Top row - 30 points
        1: 'crab',       // Second row - 20 points
        2: 'crab',       // Third row - 20 points
        3: 'octopus',    // Fourth row - 10 points
        4: 'octopus'     // Fifth row - 10 points
    },
    
    // Points per alien type
    ALIEN_POINTS: {
        squid: 30,
        crab: 20,
        octopus: 10
    },
    
    // Alien colors
    ALIEN_COLORS: {
        squid: '#ff00ff',    // Magenta
        crab: '#00ffff',     // Cyan
        octopus: '#ffff00'   // Yellow
    },
    
    // Bullet settings
    BULLETS: {
        PLAYER: {
            WIDTH: 4,
            HEIGHT: 16,
            SPEED: 600,      // pixels per second
            COLOR: '#ffffff',
            MAX_ACTIVE: 1    // max player bullets on screen
        },
        ALIEN: {
            WIDTH: 4,
            HEIGHT: 16,
            SPEED: 250,      // pixels per second
            COLOR: '#ff0000',
            MAX_ACTIVE: 3    // max alien bullets on screen
        }
    },
    
    // Shield settings
    SHIELDS: {
        COUNT: 4,
        WIDTH: 66,
        HEIGHT: 48,
        Y_POSITION: 480,     // Y position from top
        COLOR: '#00ff00',
        BLOCK_SIZE: 6,       // size of each destructible block
        DAMAGE_RADIUS: 4     // radius of damage when hit
    },
    
    // UFO/Mystery ship settings
    UFO: {
        WIDTH: 48,
        HEIGHT: 20,
        SPEED: 150,                    // pixels per second 
        POINTS: [50, 100, 150, 300],   // random points
        SPAWN_INTERVAL: 5000,          // ms between potential spawns
        SPAWN_CHANCE: 0.5              // 50% chance to spawn
    },
    
    // Game settings
    GAME: {
        TARGET_FPS: 60,
        LEVEL_COMPLETE_DELAY: 2000,    // ms before next level
        GAME_OVER_DELAY: 1000          // ms before returning to menu
    },
    
    // Controls
    CONTROLS: {
        LEFT: ['ArrowLeft', 'KeyA'],
        RIGHT: ['ArrowRight', 'KeyD'],
        FIRE: ['Space'],
        PAUSE: ['KeyP', 'Escape']
    },
    
    // Local storage keys
    STORAGE: {
        HIGH_SCORE: 'spaceInvaders_highScore'
    }
};

/**
 * Sprite definitions using text patterns
 * Each character in the pattern represents a pixel
 * '█' = filled pixel, ' ' = empty pixel
 * Each sprite can have multiple frames for animation
 */
SpaceInvaders.SPRITES = {
    player: {
        frames: [
            [
                '           █          ',
                '          ███         ',
                '          ███         ',
                '   █████████████████ ',
                '  ███████████████████',
                '  ███████████████████',
                '  ███████████████████',
                '  ███████████████████'
            ]
        ],
        color: '#00ff00'
    },
    
    squid: {
        frames: [
            // Frame 1
            [
                '      ████      ',
                '   ██████████   ',
                '  ████████████  ',
                '  ███  ██  ███  ',
                '  ████████████  ',
                '    ██    ██    ',
                '   ██  ██  ██   ',
                '  ██        ██  '
            ],
            // Frame 2
            [
                '      ████      ',
                '   ██████████   ',
                '  ████████████  ',
                '  ███  ██  ███  ',
                '  ████████████  ',
                '    ██    ██    ',
                '   ██ ████ ██   ',
                '     ██  ██     '
            ]
        ],
        color: '#ff00ff'
    },
    
    crab: {
        frames: [
            // Frame 1
            [
                '   ██      ██   ',
                '    ██    ██    ',
                '   ██████████   ',
                '  ███  ██  ███  ',
                ' ██████████████ ',
                ' █ ██████████ █ ',
                ' █ ██      ██ █ ',
                '     ██  ██     '
            ],
            // Frame 2
            [
                '   ██      ██   ',
                ' █  ██    ██  █ ',
                ' █ ██████████ █ ',
                ' ████  ██  ████ ',
                ' ██████████████ ',
                '   ██████████   ',
                '   ██      ██   ',
                '  ██        ██  '
            ]
        ],
        color: '#00ffff'
    },
    
    octopus: {
        frames: [
            // Frame 1
            [
                '     ██████     ',
                '   ██████████   ',
                '  ████████████  ',
                '  ███  ██  ███  ',
                '  ████████████  ',
                '     ██  ██     ',
                '    ████████    ',
                '   ██  ██  ██   '
            ],
            // Frame 2
            [
                '     ██████     ',
                '   ██████████   ',
                '  ████████████  ',
                '  ███  ██  ███  ',
                '  ████████████  ',
                '     ██  ██     ',
                '    ██ ██ ██    ',
                '  ██        ██  '
            ]
        ],
        color: '#ffff00'
    },
    
    ufo: {
        frames: [
            [
                '      ██████████      ',
                '   ████████████████   ',
                '  ██████████████████  ',
                ' ██ ██ ██ ██ ██ ██ ██ ',
                '██████████████████████',
                '    ████    ████      ',
                '      ██    ██        '
            ]
        ],
        color: '#ff0000'
    },
    
    explosion: {
        frames: [
            [
                ' █   █   █ ',
                '  █  █  █  ',
                '   █ █ █   ',
                '█████ █████',
                '   █ █ █   ',
                '  █  █  █  ',
                ' █   █   █ '
            ],
            [
                '█    █    █',
                ' █   █   █ ',
                '  █  █  █  ',
                '█████ █████',
                '  █  █  █  ',
                ' █   █   █ ',
                '█    █    █'
            ]
        ],
        color: '#ff6600'
    },
    
    shield: {
        frames: [
            [
                '    ████████████    ',
                '   ██████████████   ',
                '  ████████████████  ',
                ' ██████████████████ ',
                '████████████████████',
                '████████████████████',
                '████████████████████',
                '████████████████████',
                '██████        ██████',
                '█████          █████',
                '████            ████'
            ]
        ],
        color: '#00ff00'
    }
};
