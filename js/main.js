/**
 * Main Entry Point
 * Initializes and starts the game
 */

(function() {
    'use strict';
    
    function init() {
        const canvas = document.getElementById('gameCanvas');
        
        if (!canvas) {
            console.error('Game canvas not found!');
            return;
        }
        
        const game = new SpaceInvaders.Game(canvas);
        game.start();
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
