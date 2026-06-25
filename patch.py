import re

with open('game.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update powerUp object definition
old_powerup_def = '''let powerUp = {
    type: null,       // 'camera', 'coffee', 'wacom'
    timer: 0,
    maxTime: 0,
    doubleJumpAvailable: false,
    hasDoubleJumped: false
};'''
new_powerup_def = '''let powerUp = {
    camera: 0,
    coffee: 0,
    wacom: 0,
    ai: 0,
    hasDoubleJumped: false
};

const PU_DURATIONS = {
    camera: 12000,
    coffee: 15000,
    wacom: 10000,
    ai: 20000,
    undoshield: 0
};'''
code = code.replace(old_powerup_def, new_powerup_def)

# 2. Update timer starting to 40s
code = code.replace('let gameDeadlineTimer = 60000; // 60 seconds', 'let gameDeadlineTimer = 40000; // 40 seconds')
code = code.replace('gameDeadlineTimer = 60000; // 60 seconds', 'gameDeadlineTimer = 40000; // 40 seconds')

# 3. Update penalty to 30s
code = code.replace('gameDeadlineTimer -= 10000;', 'gameDeadlineTimer -= 30000;')
code = code.replace("spawnFloatingText(this.x, this.y - 20, '-10s (CEZA)', '#ff4444');", "spawnFloatingText(this.x, this.y - 20, '-30s (CEZA)', '#ff4444');")

# 4. Replace powerUp.type === 'camera' with powerUp.camera > 0
code = code.replace("powerUp.type === 'camera'", "powerUp.camera > 0")
code = code.replace("powerUp.type === 'wacom'", "powerUp.wacom > 0")
code = code.replace("powerUp.type === 'coffee'", "powerUp.coffee > 0")
code = code.replace("powerUp.type === 'ai'", "powerUp.ai > 0")
code = code.replace("powerUp.type !== 'camera'", "powerUp.camera <= 0")

# 5. Fix activatePowerUp
old_activate = '''function activatePowerUp(type) {
    if (type === 'undoshield') {
        player.undoShield = true;
        player.lastSafeX = player.x;
        player.lastSafeY = player.y;
        
        // Show hud
        const undoHUD = document.getElementById('hud-undoshield');
        if (undoHUD) undoHUD.classList.remove('hidden');
        
        spawnParticles(player.x + player.width/2, player.y + player.height/2, 20, '#ff33ff', 'burst');
        spawnFloatingText(player.x, player.y - 10, 'CTRL+Z SHIELD!', '#ff33ff');
        return;
    }

    const durations = {
        camera: 12000, // 12 seconds invincibility
        coffee: 15000, // 15 seconds double jump
        wacom: 10000, // 10 seconds speed + drawing trail
        ai: 20000, // 20 seconds AI buddy
        undoshield: 0
    };
    powerUp.type = type;
    powerUp.timer = durations[type];
    powerUp.maxTime = durations[type];
    powerUp.hasDoubleJumped = false;

    if (type === 'ai' && !aiHelperInstance) {
        aiHelperInstance = new AIHelper(player.x, player.y - 40);
    }
}'''
new_activate = '''function activatePowerUp(type) {
    if (type === 'undoshield') {
        player.undoShield = true;
        player.lastSafeX = player.x;
        player.lastSafeY = player.y;
        
        // Show hud
        const undoHUD = document.getElementById('hud-undoshield');
        if (undoHUD) undoHUD.classList.remove('hidden');
        
        spawnParticles(player.x + player.width/2, player.y + player.height/2, 20, '#ff33ff', 'burst');
        spawnFloatingText(player.x, player.y - 10, 'CTRL+Z SHIELD!', '#ff33ff');
        return;
    }

    powerUp[type] = PU_DURATIONS[type];
    if (type === 'coffee') powerUp.hasDoubleJumped = false;

    if (type === 'ai' && !aiHelperInstance) {
        aiHelperInstance = new AIHelper(player.x, player.y - 40);
    }
}'''
code = code.replace(old_activate, new_activate)

# 6. Update powerUp state resets
old_reset = '''    powerUp.type = null;
    powerUp.timer = 0;'''
new_reset = '''    powerUp.camera = 0;
    powerUp.coffee = 0;
    powerUp.wacom = 0;
    powerUp.ai = 0;'''
code = code.replace(old_reset, new_reset)

# 7. gameLoop timer decrement
old_gameloop_timer = '''        if (powerUp.type) {
            powerUp.timer -= deltaTime;
            if (powerUp.timer <= 0) {
                if (powerUp.type === 'ai') {
                    aiHelperInstance = null;
                }
                powerUp.type = null;
                powerUp.timer = 0;
                aiHelperInstance = null;
            }
        }'''
new_gameloop_timer = '''        for (const key of ['camera', 'coffee', 'wacom', 'ai']) {
            if (powerUp[key] > 0) {
                powerUp[key] -= deltaTime;
                if (powerUp[key] <= 0) {
                    powerUp[key] = 0;
                    if (key === 'ai') aiHelperInstance = null;
                }
            }
        }'''
code = code.replace(old_gameloop_timer, new_gameloop_timer)

# 8. Drawing powerUp timer bars
old_timer_bar = '''        // Power-up timer bar
        if (powerUp.type) {
            ctx.save();
            const pct = powerUp.timer / powerUp.maxTime;
            const colors = { camera: '#ffdd00', coffee: '#ff8800', wacom: '#00ff88', ai: '#00f0ff' };
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(canvas.width / 2 - 100, canvas.height - 20, 200, 8);
            ctx.fillStyle = colors[powerUp.type];
            ctx.fillRect(canvas.width / 2 - 100, canvas.height - 20, 200 * pct, 8);
            ctx.restore();
        }'''
new_timer_bar = '''        // Power-up timer bar
        let barIndex = 0;
        const colors = { camera: '#ffdd00', coffee: '#ff8800', wacom: '#00ff88', ai: '#00f0ff' };
        for (const key of ['camera', 'coffee', 'wacom', 'ai']) {
            if (powerUp[key] > 0) {
                ctx.save();
                const pct = powerUp[key] / PU_DURATIONS[key];
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(canvas.width / 2 - 100, canvas.height - 20 - (barIndex * 10), 200, 8);
                ctx.fillStyle = colors[key];
                ctx.fillRect(canvas.width / 2 - 100, canvas.height - 20 - (barIndex * 10), 200 * pct, 8);
                ctx.restore();
                barIndex++;
            }
        }'''
code = code.replace(old_timer_bar, new_timer_bar)

# 9. Fix multiplier logic in nextLevel()
old_nextlevel = '''        document.querySelector('.gameover-title').textContent = 'TEBRİKLER! 🎉';
        document.querySelector('.gameover-subtitle').textContent = 'Tüm projeleri teslim ettin!';
        document.getElementById('final-score').textContent = score;
        document.getElementById('final-sdcards').textContent = sdCardsCollected;
        
        // High score checks'''
new_nextlevel = '''        document.querySelector('.gameover-title').textContent = 'TEBRİKLER! 🎉';
        document.querySelector('.gameover-subtitle').textContent = 'Tüm projeleri teslim ettin!';
        
        const minutesLeft = Math.floor(gameDeadlineTimer / 60000);
        const multiplier = Math.max(1, minutesLeft);
        score *= multiplier;
        
        document.getElementById('final-score').textContent = score;
        document.getElementById('final-sdcards').textContent = sdCardsCollected;
        
        const mulMsg = document.getElementById('score-multiplier-msg');
        if (mulMsg) {
            mulMsg.classList.remove('hidden');
            document.getElementById('score-multiplier-value').textContent = multiplier;
        }

        // High score checks'''
code = code.replace(old_nextlevel, new_nextlevel)

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(code)
