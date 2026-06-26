/* ============================================
   DESIGNER RUN - GAME ENGINE v3
   - Hand-crafted levels (no random)
   - Power-ups: Camera, Coffee, Wacom
   - Portal system (secret dimensions)
   ============================================ */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 960;
canvas.height = 640;

// ==========================================
// GAME STATE
// ==========================================
const GameState = { MENU: 'menu', INTRO: 'intro', OUTRO: 'outro', PLAYING: 'playing', GAMEOVER: 'gameover', LEVELCOMPLETE: 'levelcomplete', PORTAL: 'portal_transition', PAUSED: 'paused', SETTINGS: 'settings' };
let gameState = GameState.MENU;
let score = 0;
let sdCardsCollected = 0;
let lives = 3;
let currentLevel = 1;
let gameDeadlineTimer = 40000; // 40 seconds
let highscore = parseInt(localStorage.getItem('designer_run_highscore') || '0');

// Default Key Bindings
let KeyBindings = {
    LEFT: ['ArrowLeft', 'KeyA'],
    RIGHT: ['ArrowRight', 'KeyD'],
    UP: ['ArrowUp', 'KeyW', 'Space'],
    DOWN: ['ArrowDown', 'KeyS'],
    DASH: ['ShiftLeft', 'ShiftRight'],
    SHOOT: ['KeyX', 'KeyC']
};

function isPressed(action) {
    return KeyBindings[action].some(code => keys[code]);
}

function isJustPressed(action) {
    return KeyBindings[action].some(code => justPressed[code]);
}
let cameraX = 0;
let levelWidth = 6000;
let particles = [];
let floatingTexts = [];
let screenShake = 0;
let lastTime = 0;
let deltaTime = 0;
let gameTime = 0;

// --- Intro Cutscene Variables ---
let introCurrentSlide = 0;
let introSlideTimer = 0;
let introFadeAlpha = 1.0;
let introFadingIn = true;
let speechProgress = {};

// --- Outro Cutscene Variables ---
let outroCurrentSlide = 0;
let outroSlideTimer = 0;
let outroFadeAlpha = 1.0;
let outroFadingIn = true;
let outroSpeechProgress = {};

// Power-up state
let powerUp = {
    camera: 0,
    coffee: 0,
    wacom: 0,
    ai: 0,
    hasDoubleJumped: false
};

const PU_DURATIONS = {
    camera: 12000,
    coffee: 18000,
    wacom: 14000,
    ai: 30000,
    undoshield: 0
};

// Portal / Secret dimension state
let inSecretDimension = false;
let secretDimensionTimer = 0;
let secretReturnX = 0;
let secretReturnY = 0;
let portalTransitionAlpha = 0;
let portalTransitionDir = 0; // 1 = entering, -1 = exiting
let pendingPortal = null;

// New gameplay components
let boss = null;
let bossActive = false;
let bossDefeated = false;
let lasers = [];
let aiHelperInstance = null;
let weatherParticles = [];

// ==========================================
// PIXEL ART SPRITE SYSTEM
// ==========================================
function createSpriteCanvas(width, height, drawFunc) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const cx = c.getContext('2d');
    drawFunc(cx, width, height);
    return c;
}

// --- DESIGNER (PLAYER) SPRITES ---
// --- PLAYER CLASSES AND SPRITES ---
const CHARACTERS = [
    {
        key: 'uiux',
        name: 'UI/UX DESIGNER',
        speed: 5.5,
        jumpForce: -13,
        maxLives: 3,
        orbColor: null
    },
    {
        key: 'modeler',
        name: '3D MODELER',
        speed: 4.8,
        jumpForce: -12.5,
        maxLives: 4,
        orbColor: { hex: '#81c784', rgba: '129, 199, 132' }
    },
    {
        key: 'coder',
        name: 'FRONTEND CODER',
        speed: 6.3,
        jumpForce: -13,
        maxLives: 3,
        orbColor: { hex: '#00ff88', rgba: '0, 255, 136' }
    }
];

let selectedCharIndex = 0;
let selectedPauseIndex = 0;
const playerSprites = { idle: [], run: [], jump: null, fall: null };
const playerSpritesData = {
    uiux: { idle: [], run: [], jump: null, fall: null },
    modeler: { idle: [], run: [], jump: null, fall: null },
    coder: { idle: [], run: [], jump: null, fall: null }
};

// UI/UX Character Base Drawing
function drawDesignerBase(cx, legL, legR, armAngle, eyeBlink) {
    cx.fillStyle = 'rgba(0,0,0,0.2)';
    cx.fillRect(6, 52, 28, 4);
    // Legs
    cx.fillStyle = '#2b4570';
    cx.fillRect(10, 36 + legL, 8, 16 - legL);
    cx.fillRect(22, 36 + legR, 8, 16 - legR);
    cx.fillStyle = '#e84545';
    cx.fillRect(8, 50 + legL, 10, 4);
    cx.fillRect(22, 50 + legR, 10, 4);
    // Body
    cx.fillStyle = '#2d2d2d';
    cx.fillRect(8, 20, 24, 18);
    cx.fillStyle = '#222';
    cx.fillRect(14, 30, 12, 5);
    cx.fillStyle = '#555';
    cx.fillRect(17, 20, 2, 6);
    cx.fillRect(21, 20, 2, 6);
    // Arms
    cx.fillStyle = '#2d2d2d';
    cx.fillRect(4, 22 + armAngle, 6, 12);
    cx.fillRect(30, 22 - armAngle, 6, 12);
    cx.fillStyle = '#ff6b35';
    cx.fillRect(33, 18 - armAngle, 3, 8);
    cx.fillStyle = '#ffcc00';
    cx.fillRect(34, 16 - armAngle, 1, 3);
    // Head
    cx.fillStyle = '#ffd5a0';
    cx.fillRect(10, 4, 20, 18);
    cx.fillStyle = '#3a2000';
    cx.fillRect(8, 2, 24, 8);
    cx.fillRect(8, 2, 4, 12);
    cx.fillRect(28, 2, 4, 10);
    cx.fillRect(14, 0, 4, 4);
    cx.fillRect(22, 0, 6, 3);
    // Glasses
    cx.fillStyle = '#222';
    cx.fillRect(12, 10, 7, 6);
    cx.fillRect(21, 10, 7, 6);
    cx.fillRect(19, 11, 2, 2);
    cx.fillStyle = eyeBlink ? '#ffd5a0' : '#7af3ff';
    cx.fillRect(13, 11, 5, 4);
    cx.fillRect(22, 11, 5, 4);
    if (!eyeBlink) {
        cx.fillStyle = 'rgba(255,255,255,0.5)';
        cx.fillRect(14, 11, 2, 2);
        cx.fillRect(23, 11, 2, 2);
    }
    cx.fillStyle = '#c9a080';
    cx.fillRect(16, 18, 6, 2);
}

// 3D Modeler Character Base Drawing
function drawModelerBase(cx, legL, legR, armAngle, eyeBlink) {
    cx.fillStyle = 'rgba(0,0,0,0.2)';
    cx.fillRect(6, 52, 28, 4);
    // Legs
    cx.fillStyle = '#4e342e'; // dark brown pants
    cx.fillRect(10, 36 + legL, 8, 16 - legL);
    cx.fillRect(22, 36 + legR, 8, 16 - legR);
    cx.fillStyle = '#ff6f00'; // orange shoes
    cx.fillRect(8, 50 + legL, 10, 4);
    cx.fillRect(22, 50 + legR, 10, 4);
    // Body
    cx.fillStyle = '#2e7d32'; // green jacket
    cx.fillRect(8, 20, 24, 18);
    cx.fillStyle = '#1b5e20';
    cx.fillRect(14, 30, 12, 5);
    cx.fillStyle = '#81c784';
    cx.fillRect(17, 20, 2, 6);
    cx.fillRect(21, 20, 2, 6);
    // Arms
    cx.fillStyle = '#2e7d32';
    cx.fillRect(4, 22 + armAngle, 6, 12);
    cx.fillRect(30, 22 - armAngle, 6, 12);
    cx.fillStyle = '#ffcc00'; // gold stylus
    cx.fillRect(33, 18 - armAngle, 3, 8);
    cx.fillStyle = '#00e5ff'; // light blue glowing tip
    cx.fillRect(34, 16 - armAngle, 1, 3);
    // Head
    cx.fillStyle = '#ffd5a0';
    cx.fillRect(10, 4, 20, 18);
    // Beard
    cx.fillStyle = '#5d4037'; // brown beard
    cx.fillRect(10, 14, 20, 8);
    cx.fillRect(12, 20, 16, 3);
    // Cap
    cx.fillStyle = '#1565c0'; // blue cap
    cx.fillRect(8, 0, 24, 6);
    cx.fillRect(6, 4, 28, 2); // visor
    // Glasses (safety goggles)
    cx.fillStyle = '#111';
    cx.fillRect(12, 8, 7, 5);
    cx.fillRect(21, 8, 7, 5);
    cx.fillRect(19, 9, 2, 2);
    cx.fillStyle = eyeBlink ? '#ffd5a0' : '#e0f7fa';
    cx.fillRect(13, 9, 5, 3);
    cx.fillRect(22, 9, 5, 3);
}

// Frontend Coder Character Base Drawing
function drawCoderBase(cx, legL, legR, armAngle, eyeBlink) {
    cx.fillStyle = 'rgba(0,0,0,0.2)';
    cx.fillRect(6, 52, 28, 4);
    // Legs
    cx.fillStyle = '#37474f'; // blue-grey pants
    cx.fillRect(10, 36 + legL, 8, 16 - legL);
    cx.fillRect(22, 36 + legR, 8, 16 - legR);
    cx.fillStyle = '#eceff1'; // white sneakers
    cx.fillRect(8, 50 + legL, 10, 4);
    cx.fillRect(22, 50 + legR, 10, 4);
    // Body
    cx.fillStyle = '#f9a825'; // yellow tech shirt
    cx.fillRect(8, 20, 24, 18);
    cx.fillStyle = '#f57f17';
    cx.fillRect(14, 30, 12, 5);
    cx.fillStyle = '#fff';
    cx.fillRect(12, 24, 4, 2);
    cx.fillRect(18, 26, 4, 2);
    // Arms
    cx.fillStyle = '#f9a825';
    cx.fillRect(4, 22 + armAngle, 6, 12);
    cx.fillRect(30, 22 - armAngle, 6, 12);
    cx.fillStyle = '#424242'; // tech device (keyboard/phone)
    cx.fillRect(32, 16 - armAngle, 4, 8);
    // Head
    cx.fillStyle = '#ffeedd';
    cx.fillRect(10, 4, 20, 18);
    cx.fillStyle = '#212121'; // black hair
    cx.fillRect(8, 2, 24, 6);
    cx.fillRect(8, 2, 4, 10);
    cx.fillRect(28, 2, 4, 8);
    // Headphones
    cx.fillStyle = '#00e5ff';
    cx.fillRect(7, 8, 4, 8);
    cx.fillRect(29, 8, 4, 8);
    cx.fillStyle = '#00838f'; // band
    cx.fillRect(10, 2, 20, 2);
    // Eyes
    cx.fillStyle = '#111';
    cx.fillRect(14, 11, 2, 3);
    cx.fillRect(24, 11, 2, 3);
    if (eyeBlink) {
        cx.fillStyle = '#ffeedd';
        cx.fillRect(14, 11, 2, 3);
        cx.fillRect(24, 11, 2, 3);
    }
}

// Generate Sprites for UI/UX Designer
for (let i = 0; i < 2; i++) {
    playerSpritesData.uiux.idle.push(createSpriteCanvas(40, 56, (cx) => {
        drawDesignerBase(cx, i === 1 ? -1 : 0, i === 1 ? -1 : 0, i === 1 ? 1 : 0, i === 1);
    }));
}
for (let i = 0; i < 4; i++) {
    const lo = [[-4, 4], [0, 0], [4, -4], [0, 0]];
    playerSpritesData.uiux.run.push(createSpriteCanvas(40, 56, (cx) => {
        drawDesignerBase(cx, lo[i][0], lo[i][1], Math.sin(i * Math.PI / 2) * 3, false);
    }));
}
playerSpritesData.uiux.jump = createSpriteCanvas(40, 56, (cx) => { drawDesignerBase(cx, -6, -6, -4, false); });
playerSpritesData.uiux.fall = createSpriteCanvas(40, 56, (cx) => { drawDesignerBase(cx, 2, 2, 3, false); });

// Generate Sprites for 3D Modeler
for (let i = 0; i < 2; i++) {
    playerSpritesData.modeler.idle.push(createSpriteCanvas(40, 56, (cx) => {
        drawModelerBase(cx, i === 1 ? -1 : 0, i === 1 ? -1 : 0, i === 1 ? 1 : 0, i === 1);
    }));
}
for (let i = 0; i < 4; i++) {
    const lo = [[-4, 4], [0, 0], [4, -4], [0, 0]];
    playerSpritesData.modeler.run.push(createSpriteCanvas(40, 56, (cx) => {
        drawModelerBase(cx, lo[i][0], lo[i][1], Math.sin(i * Math.PI / 2) * 3, false);
    }));
}
playerSpritesData.modeler.jump = createSpriteCanvas(40, 56, (cx) => { drawModelerBase(cx, -6, -6, -4, false); });
playerSpritesData.modeler.fall = createSpriteCanvas(40, 56, (cx) => { drawModelerBase(cx, 2, 2, 3, false); });

// Generate Sprites for Frontend Coder
for (let i = 0; i < 2; i++) {
    playerSpritesData.coder.idle.push(createSpriteCanvas(40, 56, (cx) => {
        drawCoderBase(cx, i === 1 ? -1 : 0, i === 1 ? -1 : 0, i === 1 ? 1 : 0, i === 1);
    }));
}
for (let i = 0; i < 4; i++) {
    const lo = [[-4, 4], [0, 0], [4, -4], [0, 0]];
    playerSpritesData.coder.run.push(createSpriteCanvas(40, 56, (cx) => {
        drawCoderBase(cx, lo[i][0], lo[i][1], Math.sin(i * Math.PI / 2) * 3, false);
    }));
}
playerSpritesData.coder.jump = createSpriteCanvas(40, 56, (cx) => { drawCoderBase(cx, -6, -6, -4, false); });
playerSpritesData.coder.fall = createSpriteCanvas(40, 56, (cx) => { drawCoderBase(cx, 2, 2, 3, false); });

// Set default UI/UX designer active initially
Object.assign(playerSprites, playerSpritesData.uiux);

// --- ENEMY (MÜŞTERİ) SPRITES ---
function drawClientBase(cx, legL, legR, mouthOpen, hasExcl) {
    cx.fillStyle = 'rgba(0,0,0,0.2)';
    cx.fillRect(6, 48, 28, 4);
    cx.fillStyle = '#1a1a3e';
    cx.fillRect(10, 34 + legL, 8, 14 - legL);
    cx.fillRect(22, 34 + legR, 8, 14 - legR);
    cx.fillStyle = '#222';
    cx.fillRect(8, 46 + legL, 10, 4);
    cx.fillRect(22, 46 + legR, 10, 4);
    cx.fillStyle = '#1e3a5f';
    cx.fillRect(8, 16, 24, 20);
    cx.fillStyle = '#15304e';
    cx.fillRect(8, 16, 24, 4);
    cx.fillStyle = '#cc0000';
    cx.fillRect(18, 18, 4, 14);
    cx.fillStyle = '#aa0000';
    cx.fillRect(17, 17, 6, 3);
    cx.fillStyle = '#1e3a5f';
    cx.fillRect(4, 18, 6, 14);
    cx.fillRect(30, 18, 6, 14);
    cx.fillStyle = '#fff';
    cx.fillRect(32, 14, 10, 14);
    cx.fillStyle = '#ddd';
    cx.fillRect(33, 16, 8, 1);
    cx.fillRect(33, 19, 8, 1);
    cx.fillRect(33, 22, 6, 1);
    cx.fillStyle = '#ff0000';
    cx.fillRect(33, 24, 8, 3);
    cx.fillStyle = '#ffccaa';
    cx.fillRect(10, 2, 20, 16);
    cx.fillStyle = '#333';
    cx.fillRect(12, 6, 6, 2);
    cx.fillRect(22, 6, 6, 2);
    cx.fillRect(12, 7, 2, 1);
    cx.fillRect(26, 7, 2, 1);
    cx.fillStyle = '#cc0000';
    cx.fillRect(14, 9, 4, 3);
    cx.fillRect(22, 9, 4, 3);
    cx.fillStyle = '#600';
    cx.fillRect(15, 10, 2, 2);
    cx.fillRect(23, 10, 2, 2);
    cx.fillStyle = '#800000';
    if (mouthOpen) { cx.fillRect(15, 14, 10, 3); cx.fillStyle = '#400'; cx.fillRect(17, 15, 6, 1); }
    else { cx.fillRect(14, 15, 12, 2); }
    cx.fillStyle = '#1a1a1a';
    cx.fillRect(9, 0, 22, 5);
    cx.fillRect(9, 0, 4, 8);
    cx.fillRect(27, 0, 4, 8);
    if (hasExcl) { cx.fillStyle = '#ff4444'; cx.font = 'bold 10px Arial'; cx.fillText('!', 19, -2); }
}

const enemySprites = { walk: [] };
for (let i = 0; i < 4; i++) {
    const lo = [[-3, 3], [0, 0], [3, -3], [0, 0]];
    enemySprites.walk.push(createSpriteCanvas(44, 52, (cx) => {
        drawClientBase(cx, lo[i][0], lo[i][1], i % 2 === 0, i === 0);
    }));
}

// --- SD CARD SPRITE ---
function drawSDCard(cx, w, h, sparkle) {
    cx.fillStyle = '#3388ff';
    cx.beginPath();
    cx.moveTo(4, 2); cx.lineTo(w - 4, 2); cx.lineTo(w - 4, h - 2); cx.lineTo(4, h - 2); cx.lineTo(4, 6);
    cx.closePath(); cx.fill();
    cx.fillStyle = '#1a5faa'; cx.fillRect(w - 8, 2, 4, 6);
    cx.fillStyle = '#ffcc00';
    cx.fillRect(8, 4, 3, 6); cx.fillRect(13, 4, 3, 6); cx.fillRect(18, 4, 3, 6); cx.fillRect(23, 4, 3, 6);
    cx.fillStyle = '#2266cc'; cx.fillRect(6, 12, w - 12, 12);
    cx.fillStyle = '#fff'; cx.font = 'bold 8px Arial'; cx.textAlign = 'center'; cx.fillText('SD', w / 2, 22);
    cx.fillStyle = '#aaddff'; cx.font = '5px Arial'; cx.fillText('64GB', w / 2, h - 5);
    cx.fillStyle = 'rgba(255,255,255,0.2)'; cx.fillRect(5, 3, 6, h - 6);
    if (sparkle) { cx.fillStyle = '#fff'; cx.fillRect(w - 6, 4, 2, 2); cx.fillRect(6, h - 6, 2, 2); }
}
const sdCardSprites = [];
for (let i = 0; i < 2; i++) sdCardSprites.push(createSpriteCanvas(32, 32, (cx, w, h) => drawSDCard(cx, w, h, i === 0)));

// --- POWER-UP SPRITES ---
function drawCameraPowerUp(cx, w, h) {
    // Camera body
    cx.fillStyle = '#333';
    cx.fillRect(4, 10, 24, 16);
    cx.fillStyle = '#222';
    cx.fillRect(6, 6, 12, 6);
    // Lens
    cx.fillStyle = '#555';
    cx.beginPath(); cx.arc(16, 18, 6, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#4488ff';
    cx.beginPath(); cx.arc(16, 18, 4, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = 'rgba(255,255,255,0.4)';
    cx.beginPath(); cx.arc(14, 16, 2, 0, Math.PI * 2); cx.fill();
    // Flash
    cx.fillStyle = '#ffdd00';
    cx.fillRect(22, 7, 6, 4);
    cx.fillStyle = '#fff';
    cx.fillRect(24, 4, 2, 3);
}

function drawCoffeePowerUp(cx, w, h) {
    // Cup
    cx.fillStyle = '#8B4513';
    cx.fillRect(8, 10, 16, 18);
    cx.fillStyle = '#6B3410';
    cx.fillRect(8, 10, 16, 3);
    // Handle
    cx.fillStyle = '#8B4513';
    cx.fillRect(24, 14, 4, 2); cx.fillRect(26, 14, 2, 8); cx.fillRect(24, 22, 4, 2);
    // Coffee inside
    cx.fillStyle = '#3a1a00';
    cx.fillRect(10, 13, 12, 8);
    // Steam
    cx.fillStyle = 'rgba(255,255,255,0.6)';
    cx.fillRect(12, 4, 2, 5);
    cx.fillRect(16, 2, 2, 6);
    cx.fillRect(20, 5, 2, 4);
    // Label
    cx.fillStyle = '#fff';
    cx.font = '5px Arial'; cx.textAlign = 'center';
    cx.fillText('☕', 16, 26);
}

function drawWacomPowerUp(cx, w, h) {
    // Tablet
    cx.fillStyle = '#222';
    cx.fillRect(4, 8, 24, 18);
    cx.fillStyle = '#333';
    cx.fillRect(6, 10, 20, 14);
    // Screen
    cx.fillStyle = '#0a4a2a';
    cx.fillRect(7, 11, 18, 12);
    // Pen
    cx.fillStyle = '#888';
    cx.save();
    cx.translate(22, 12);
    cx.rotate(0.5);
    cx.fillRect(0, 0, 3, 16);
    cx.fillStyle = '#ff6b35';
    cx.fillRect(0, 14, 3, 4);
    cx.restore();
    // Glow
    cx.fillStyle = '#0f8';
    cx.fillRect(10, 14, 2, 2);
}

function drawAIPowerUp(cx, w, h) {
    // Droid body
    cx.fillStyle = '#1e3a5f';
    cx.fillRect(6, 8, 20, 20);
    cx.fillStyle = '#00f0ff';
    // Blue glowing eye
    cx.fillRect(14, 14, 4, 4);
    // Metallic accents
    cx.fillStyle = '#555';
    cx.fillRect(4, 14, 2, 8);
    cx.fillRect(26, 14, 2, 8);
    // Antenna
    cx.fillRect(15, 2, 2, 6);
    cx.fillStyle = '#ffcc00';
    cx.fillRect(15, 0, 2, 2);
}

function drawUndoPowerUp(cx, w, h) {
    cx.strokeStyle = '#ff33ff';
    cx.lineWidth = 3;
    cx.beginPath();
    cx.arc(w / 2, h / 2, 9, 0.2, Math.PI * 1.7);
    cx.stroke();
    // Arrow head
    cx.fillStyle = '#ff33ff';
    cx.beginPath();
    cx.moveTo(w / 2 + 5, h / 2 - 9);
    cx.lineTo(w / 2 + 12, h / 2 - 12);
    cx.lineTo(w / 2 + 9, h / 2 - 4);
    cx.closePath();
    cx.fill();
    // Z text inside
    cx.fillStyle = '#ffffff';
    cx.font = 'bold 8px Arial';
    cx.textAlign = 'center';
    cx.fillText('Z', w / 2 - 1, h / 2 + 3);
}

const powerUpSprites = {
    camera: createSpriteCanvas(32, 32, drawCameraPowerUp),
    coffee: createSpriteCanvas(32, 32, drawCoffeePowerUp),
    wacom: createSpriteCanvas(32, 32, drawWacomPowerUp),
    ai: createSpriteCanvas(32, 32, drawAIPowerUp),
    undoshield: createSpriteCanvas(32, 32, drawUndoPowerUp)
};

// --- PORTAL SPRITE ---
function drawPortalFrame(cx, w, h, hue) {
    for (let r = 18; r > 4; r -= 2) {
        cx.fillStyle = `hsla(${hue + r * 10}, 80%, ${40 + r * 2}%, ${0.3 + r * 0.03})`;
        cx.beginPath(); cx.ellipse(w / 2, h / 2, r, r * 1.3, 0, 0, Math.PI * 2); cx.fill();
    }
    cx.fillStyle = `hsla(${hue}, 90%, 15%, 0.9)`;
    cx.beginPath(); cx.ellipse(w / 2, h / 2, 6, 8, 0, 0, Math.PI * 2); cx.fill();
}

// ==========================================
// SOUND ENGINE
// ==========================================
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.bgmPlaying = false;
        this.bgmMuted = false;
        this.schedulerId = null;
        this.currentBeat = 0;
        this.bassPitches = {
            normal: [110, 110, 130, 130, 98, 98, 87, 87],
            secret: [55, 55, 65, 65, 49, 49, 43, 43],
            power: [220, 220, 261, 261, 196, 196, 174, 174],
            boss: [73, 73, 73, 82, 87, 87, 82, 73]
        };
        this.melodyPitches = {
            normal: [440, 494, 523, 587, 659, 587, 523, 494],
            secret: [220, 0, 261, 0, 196, 0, 174, 0],
            power: [440, 523, 587, 659, 784, 659, 587, 523],
            boss: [293, 311, 329, 220, 293, 311, 329, 0]
        };
    }
    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            const btn = document.getElementById('sound-toggle');
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleSound();
                });
            }
        }
        catch (e) { }
    }
    toggleSound() {
        this.init();
        this.bgmMuted = !this.bgmMuted;
        const emoji = this.bgmMuted ? '🔇' : '🔊';
        
        const btnHud = document.getElementById('sound-toggle');
        if (btnHud) {
            btnHud.textContent = emoji;
            btnHud.blur();
        }
        
        const btnMain = document.getElementById('btn-sound-main');
        if (btnMain) {
            btnMain.textContent = `${emoji} SES`;
            btnMain.blur();
        }
        
        const btnPause = document.getElementById('btn-sound-pause');
        if (btnPause) {
            btnPause.textContent = `${emoji} SES AÇ/KAPAT`;
            btnPause.blur();
        }

        if (!this.bgmMuted && !this.bgmPlaying && gameState === GameState.PLAYING) {
            this.startBGM();
        }
    }
    startBGM() {
        if (!this.initialized || !this.ctx) return;
        if (this.bgmPlaying) return;
        this.bgmPlaying = true;
        this.currentBeat = 0;
        this._scheduleNextBeat();
    }
    stopBGM() {
        this.bgmPlaying = false;
        if (this.schedulerId) {
            clearTimeout(this.schedulerId);
            this.schedulerId = null;
        }
    }
    _scheduleNextBeat() {
        if (!this.bgmPlaying) return;
        let tempo = 180;
        let pitchKey = 'normal';
        if (bossActive) {
            tempo = 200;
            pitchKey = 'boss';
        } else if (inSecretDimension) {
            tempo = 280;
            pitchKey = 'secret';
        } else if (powerUp.camera > 0) {
            tempo = 110;
            pitchKey = 'power';
        } else if (powerUp.wacom > 0) {
            tempo = 135;
            pitchKey = 'power';
        } else if (powerUp.coffee > 0) {
            tempo = 150;
            pitchKey = 'normal';
        }
        this._playBeat(pitchKey);
        this.schedulerId = setTimeout(() => {
            this.currentBeat = (this.currentBeat + 1) % 8;
            this._scheduleNextBeat();
        }, tempo);
    }
    _playBeat(pitchKey) {
        if (this.bgmMuted) return;
        const time = this.ctx.currentTime;
        const bassPitch = this.bassPitches[pitchKey][this.currentBeat];
        if (bassPitch > 0) {
            const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
            osc.type = pitchKey === 'secret' ? 'sine' : 'sawtooth';
            osc.frequency.setValueAtTime(bassPitch, time);
            gain.gain.setValueAtTime(pitchKey === 'boss' ? 0.06 : 0.04, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(time);
            osc.stop(time + 0.35);
        }
        const melodyPitch = this.melodyPitches[pitchKey][this.currentBeat];
        if (melodyPitch > 0 && this.currentBeat % 2 === 0) {
            const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(melodyPitch, time);
            gain.gain.setValueAtTime(0.03, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(time);
            osc.stop(time + 0.25);
        }
    }
    play(type) {
        if (!this.initialized || !this.ctx) return;
        switch (type) {
            case 'jump': this._tone(400, 600, 0.12, 'square', 0.05); break;
            case 'doublejump': this._tone(600, 900, 0.1, 'square', 0.05); break;
            case 'coin':
                this._tone(880, 1100, 0.08, 'square', 0.04);
                setTimeout(() => this._tone(1320, 1320, 0.12, 'square', 0.03), 80);
                break;
            case 'stomp': this._tone(300, 100, 0.15, 'sawtooth', 0.06); break;
            case 'hit': this._noise(0.15, 0.07); this._tone(200, 50, 0.3, 'sawtooth', 0.06); break;
            case 'powerup':
                [523, 659, 784, 1047, 1320].forEach((f, i) => setTimeout(() => this._tone(f, f, 0.1, 'square', 0.04), i * 80));
                break;
            case 'portal':
                this._tone(200, 800, 0.4, 'sine', 0.06);
                this._tone(300, 1200, 0.4, 'sine', 0.04);
                break;
            case 'levelup':
                [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._tone(f, f, 0.15, 'square', 0.05), i * 120));
                break;
            case 'gameover':
                [400, 350, 300, 200].forEach((f, i) => setTimeout(() => this._tone(f, f * 0.8, 0.25, 'square', 0.06), i * 200));
                break;
            case 'laser':
                this._tone(1000, 300, 0.1, 'sawtooth', 0.04);
                break;
            case 'spring':
                this._tone(200, 700, 0.25, 'sine', 0.06);
                break;
            case 'boss_hit':
                this._noise(0.2, 0.08);
                this._tone(150, 40, 0.2, 'sawtooth', 0.08);
                break;
            case 'boss_die':
                [150, 200, 300, 400].forEach((f, i) => setTimeout(() => this._tone(f, f * 0.5, 0.3, 'sawtooth', 0.07), i * 150));
                break;
            case 'dash':
                this._tone(800, 1600, 0.15, 'sawtooth', 0.06);
                break;
            case 'talk':
                // Short, thin high-pitched blips (900Hz to 1100Hz) reminiscent of classic arcade games
                this._tone(900 + Math.random() * 200, 900 + Math.random() * 200, 0.03, 'triangle', 0.05);
                break;
        }
    }
    _tone(sf, ef, dur, type, vol) {
        if (this.bgmMuted) return;
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(sf, this.ctx.currentTime);
        o.frequency.linearRampToValueAtTime(ef, this.ctx.currentTime + dur);
        g.gain.setValueAtTime(vol, this.ctx.currentTime);
        g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + dur);
        o.connect(g); g.connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime + dur);
    }
    _noise(dur, vol) {
        if (this.bgmMuted) return;
        const sz = this.ctx.sampleRate * dur, buf = this.ctx.createBuffer(1, sz, this.ctx.sampleRate);
        const d = buf.getChannelData(0); for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
        const s = this.ctx.createBufferSource(); s.buffer = buf;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, this.ctx.currentTime);
        g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + dur);
        s.connect(g); g.connect(this.ctx.destination); s.start();
    }
}
const sound = new SoundEngine();

// ==========================================
// INPUT
// ==========================================
const keys = {};
const justPressed = {};
let adminModeActive = false;
let secretBuffer = "";
document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;

    // Secret sequence tracker for "1881" admin mode
    if (!adminModeActive) {
        if (e.key >= '0' && e.key <= '9') {
            secretBuffer += e.key;
            if (secretBuffer.length > 4) {
                secretBuffer = secretBuffer.slice(-4);
            }
            if (secretBuffer === '1881') {
                adminModeActive = true;
                sound.init();
                sound.play('levelup');
                if (gameState === GameState.PLAYING || gameState === GameState.PAUSED) {
                    spawnFloatingText(player ? player.x + player.width / 2 : canvas.width / 2, player ? player.y - 20 : canvas.height / 2, 'ADMIN MODU AKTİF!', '#ffcc00');
                }
            }
        }
    }

    // Character selection menu controls
    if (gameState === GameState.MENU) {
        if (isJustPressed('LEFT')) {
            if (selectedCharIndex > 0) {
                selectedCharIndex--;
                updateCharacterSelectionUI();
                sound.init();
                sound.play('coin');
            }
        } else if (isJustPressed('RIGHT')) {
            if (selectedCharIndex < CHARACTERS.length - 1) {
                selectedCharIndex++;
                updateCharacterSelectionUI();
                sound.init();
                sound.play('coin');
            }
        }
    }

    // Pause Menu Navigation
    if (gameState === GameState.PAUSED) {
        if (e.code === 'ArrowUp' || e.code === 'KeyW') {
            selectedPauseIndex = (selectedPauseIndex - 1 + 4) % 4;
            updatePauseMenuUI();
            sound.init();
            sound.play('coin');
            e.preventDefault();
            return;
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
            selectedPauseIndex = (selectedPauseIndex + 1) % 4;
            updatePauseMenuUI();
            sound.init();
            sound.play('coin');
            e.preventDefault();
            return;
        } else if (e.code === 'Enter') {
            const btnIds = ['btn-resume', 'btn-restart', 'btn-sound-pause', 'btn-mainmenu'];
            const activeBtn = document.getElementById(btnIds[selectedPauseIndex]);
            if (activeBtn) {
                activeBtn.click();
            }
            e.preventDefault();
            return;
        }
    }

    if (isJustPressed('SHOOT')) {
        if (gameState === GameState.PLAYING && player.shootCooldown <= 0 && !player.isRespawning) {
            if (typeof bossActive !== 'undefined' && bossActive && player.bossAmmo > 0) {
                player.shootCooldown = 250;
                player.bossAmmo--;
                playerProjectiles.push(new PlayerProjectile(player.x + player.width / 2, player.y + 20, player.facing * 14));
                sound.play('jump');
                if (typeof updateHUD === 'function') updateHUD();
            }
        }
    }

    // Pause Game
    if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameState === GameState.PLAYING) {
            gameState = GameState.PAUSED;
            selectedPauseIndex = 0;
            updatePauseMenuUI();
            document.getElementById('pause-screen').classList.remove('hidden');
        } else if (gameState === GameState.PAUSED) {
            gameState = GameState.PLAYING;
            document.getElementById('pause-screen').classList.add('hidden');
        } else if (gameState === GameState.SETTINGS) {
            closeSettings();
        }
    }

    // Skip intro cutscene with ENTER
    if (gameState === GameState.INTRO && e.code === 'Enter') {
        sound.init();
        introCurrentSlide = 999;
        startGame();
    }
    if (e.code === 'Enter') {
        sound.init();
        if (gameState === GameState.MENU) startIntro();
        else if (gameState === GameState.GAMEOVER) { resetGame(); startGame(); }
        else if (gameState === GameState.LEVELCOMPLETE) nextLevel();
        else if (gameState === GameState.OUTRO) returnToMenu();
    }

    // Restart key (R) during playing or paused
    if ((gameState === GameState.PLAYING || gameState === GameState.PAUSED) && e.code === 'KeyR') {
        document.getElementById('pause-screen').classList.add('hidden');
        resetGame();
        startGame();
    }

    // --- CHEAT CODES (Numpad) ---
    if (adminModeActive && (gameState === GameState.PLAYING || gameState === GameState.PAUSED) && e.code.startsWith('Numpad')) {
        const num = parseInt(e.code.replace('Numpad', ''));
        if (num === 0) {
            // Numpad 0: Sınırsız Can ve Süre (Infinite Health & Time)
            lives = 9999;
            gameDeadlineTimer = 99999999;
            if (typeof spawnFloatingText === 'function') spawnFloatingText(player.x, player.y - 40, 'GOD MODE AKTIF!', '#00ff88');
            sound.play('powerup');
            if (typeof updateHUD === 'function') updateHUD();
        } else if (num >= 1 && num <= 5) {
            // Numpad 1-5: Bölümlere Işınlanma (Level Teleport)
            currentLevel = num;
            player.x = 100;
            player.y = 400;
            player.vx = 0;
            player.vy = 0;
            cameraX = 0;
            loadLevel(currentLevel);
        }
    }
});
document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// ==========================================
// GAME OBJECTS
// ==========================================
let platforms = [];
let enemies = [];
let sdCards = [];
let powerUps = [];
let portals = [];
let finishFlag = null;
let clouds = [];
let skillOrbs = [];
let playerProjectiles = [];


// ==========================================
// PLAYER
// ==========================================
class Player {
    constructor() { this.reset(); }
    reset() {
        this.x = 100; this.y = 400;
        this.width = 40; this.height = 56;
        this.vx = 0; this.vy = 0;
        this.speed = 5.5; this.jumpForce = -13;
        this.gravity = 0.55; this.grounded = false;
        this.facing = 1; this.animFrame = 0; this.animTimer = 0;
        this.invincible = 0; this.state = 'idle';
        this.scaleX = 1;
        this.scaleY = 1;
        this.isDashing = false;
        this.dashTimer = 0;
        this.isStomping = false;
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.skillCharges = 0; // New: Replaces cooldowns
        this.undoShield = false;
        this.lastSafeX = 100;
        this.lastSafeY = 400;
        this.isRespawning = false;
        this.respawnTimer = 0;
        this.shootCooldown = 0;
        this.bossAmmo = 0;
    }
    update(dt) {
        if (this.isRespawning) {
            this.respawnTimer -= dt;
            this.vy = 0; this.vx = 0;

            // Floating up slightly while respawning
            this.y = this.lastSafeY - Math.sin((1200 - this.respawnTimer) * 0.005) * 15;

            if (Math.random() < 0.6) {
                spawnParticles(this.x + Math.random() * this.width, this.y + this.height + Math.random() * 20, 1, '#00f0ff', 'sparkle');
            }
            if (this.respawnTimer <= 0) {
                this.isRespawning = false;
                this.y = this.lastSafeY; // Snap back to safe Y
                spawnParticles(this.x + this.width / 2, this.y + this.height / 2, 25, '#ffffff', 'burst');
                sound.play('powerup');
            }
            return;
        }

        if (this.shootCooldown > 0) this.shootCooldown -= dt;

        const wasGrounded = this.grounded;
        this.scaleX += (1 - this.scaleX) * 0.12;
        this.scaleY += (1 - this.scaleY) * 0.12;

        // Active Shield timer decrement
        if (this.shieldActive) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) {
                this.shieldActive = false;
            }
        }

        // Trigger Shield if UI/UX Designer and Shift pressed (Currently Disabled per design)
        const isUIUX = CHARACTERS[selectedCharIndex].key === 'uiux';
        if (isUIUX && isJustPressed('DASH') && !this.shieldActive) {
            // Disabled: UI/UX Designer has no active skill.
        }

        // Trigger Dash if Frontend Coder and Shift pressed
        const isCoder = CHARACTERS[selectedCharIndex].key === 'coder';
        if (isCoder && isJustPressed('DASH') && !this.isDashing) {
            if (this.skillCharges > 0) {
                this.skillCharges--;
                this.isDashing = true;
                this.dashTimer = 240; // dash duration 240ms
                this.vy = 0;
                sound.play('dash');
                spawnParticles(this.x + this.width / 2, this.y + this.height / 2, 12, '#00ff88', 'burst');
            } else {
                // Deny sound
            }
        }

        // Trigger Stomp if 3D Modeler, in air, and S/DownArrow pressed
        const isModeler = CHARACTERS[selectedCharIndex].key === 'modeler';
        if (isModeler && !this.grounded && isJustPressed('DOWN') && !this.isStomping) {
            if (this.skillCharges > 0) {
                this.skillCharges--;
                this.isStomping = true;
                this.vy = 25; // Instant fast fall
                sound.play('dash');
                spawnParticles(this.x + this.width / 2, this.y + this.height, 10, '#81c784', 'burst');
            }
        }

        // Apply normal physics or Dashing physics
        if (this.isDashing) {
            this.dashTimer -= dt;
            if (this.dashTimer <= 0) {
                this.isDashing = false;
            }
            this.vx = this.facing * 22; // Speed 22 (BUFFED)
            this.vy = 0;
            this.x += this.vx;
            // Spawn code trail particles
            if (Math.random() < 0.6) {
                spawnCodeParticles(this.x + this.width / 2, this.y + this.height / 2 + (Math.random() - 0.5) * 20);
            }
        } else {
            // Normal movement
            let moveX = 0;
            if (isPressed('LEFT')) moveX -= 1;
            if (isPressed('RIGHT')) moveX += 1;

            let spd = this.speed;
            if (powerUp.wacom > 0) spd = 8;
            if (powerUp.camera > 0) spd = 7;

            if (moveX !== 0) { this.vx += moveX * 0.8; this.facing = moveX; }
            else { this.vx *= 0.82; }
            this.vx = Math.max(-spd, Math.min(spd, this.vx));
            if (Math.abs(this.vx) < 0.15) this.vx = 0;

            // Jump
            const jumpKey = isJustPressed('UP');
            if (jumpKey && this.grounded) {
                this.vy = this.jumpForce;
                this.grounded = false;
                powerUp.hasDoubleJumped = false;
                sound.play('jump');
                spawnParticles(this.x + this.width / 2, this.y + this.height, 5, '#aaa', 'dust');
                this.scaleY = 1.25;
                this.scaleX = 0.75;
            }
            // Double jump (coffee power-up)
            else if (jumpKey && !this.grounded && powerUp.coffee > 0 && !powerUp.hasDoubleJumped) {
                this.vy = this.jumpForce * 0.85;
                powerUp.hasDoubleJumped = true;
                sound.play('doublejump');
                spawnParticles(this.x + this.width / 2, this.y + this.height, 8, '#ff8800', 'burst');
                this.scaleY = 1.25;
                this.scaleX = 0.75;
            }

            // Variable jump
            if (!isPressed('UP') && this.vy < -7.5) this.vy = -7.5;

            this.vy += this.gravity;
            if (this.vy > 15) this.vy = 15;
            this.x += this.vx;
            this.y += this.vy;
        }

        // Platform collision
        this.grounded = false;
        for (const p of platforms) {
            if (p.type === 'spikes') continue; // Spikes have a custom deadly hitbox check!

            if (this.x + this.width > p.x + 2 && this.x < p.x + p.width - 2) {
                if (this.vy >= 0 && this.y + this.height >= p.y && this.y + this.height <= p.y + this.vy + 8) {
                    if (p.type === 'trampoline') {
                        this.vy = -18;
                        this.grounded = false;
                        sound.play('spring');
                        spawnParticles(this.x + this.width / 2, this.y + this.height, 10, '#e040fb', 'burst');
                        this.scaleY = 1.4;
                        this.scaleX = 0.6;
                    } else {
                        // Modeler stomp shockwave check
                        if (this.isStomping) {
                            this.triggerShockwave();
                            this.isStomping = false;
                        }
                        this.y = p.y - this.height;
                        this.vy = 0;
                        this.grounded = true;
                        powerUp.hasDoubleJumped = false;
                    }
                }
                else if (this.vy < 0 && p.type === 'ground' && this.y <= p.y + p.height && this.y >= p.y) {
                    this.y = p.y + p.height; this.vy = 2;
                }
            }
            if (p.type === 'ground' && this.y + this.height > p.y + 4 && this.y < p.y + p.height - 4) {
                if (this.vx > 0 && this.x + this.width > p.x && this.x + this.width < p.x + 12) { this.x = p.x - this.width; this.vx = 0; }
                if (this.vx < 0 && this.x < p.x + p.width && this.x > p.x + p.width - 12) { this.x = p.x + p.width; this.vx = 0; }
            }
        }

        if (this.grounded && !wasGrounded) {
            this.scaleY = 0.75;
            this.scaleX = 1.25;
            spawnParticles(this.x + this.width / 2, this.y + this.height, 6, '#aaa', 'dust');
        }

        // Checkpoint tracking for Ctrl+Z shield — update every time player is on safe ground
        if (this.grounded) {
            let onHazard = false;
            for (const p of platforms) {
                if (p.type === 'spikes' && this.x + this.width > p.x && this.x < p.x + p.width && this.y + this.height >= p.y - 8) {
                    onHazard = true;
                    break;
                }
            }
            if (!onHazard && this.invincible <= 0) {
                this.lastSafeX = this.x;
                this.lastSafeY = this.y;
            }
        }

        if (this.x < cameraX) this.x = cameraX;
        if (bossActive) {
            if (this.x > cameraX + canvas.width - this.width) {
                this.x = cameraX + canvas.width - this.width;
            }
        } else {
            if (this.x > levelWidth - this.width) this.x = levelWidth - this.width;
        }
        // Die if fallen far below screen — tight threshold so no infinite fall loop
        if (this.y > canvas.height + 60) this.die(true);

        // Anim state
        if (!this.grounded) this.state = this.vy < 0 ? 'jump' : 'fall';
        else if (Math.abs(this.vx) > 0.5) this.state = 'run';
        else this.state = 'idle';

        this.animTimer += dt;
        if (this.animTimer > 120) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 4; }
        if (this.invincible > 0) this.invincible -= dt;

        // Update AI Helper if active
        if (powerUp.ai > 0 && aiHelperInstance) {
            aiHelperInstance.update(dt);
        }

        // Spawn trail particles based on power-up type
        if (powerUp.camera > 0 || powerUp.coffee > 0 || powerUp.wacom > 0 || powerUp.ai > 0) {
            const px = this.x + this.width / 2;
            const py = this.y + this.height / 2;
            if (powerUp.camera > 0) {
                const rainbowColors = ['#ffdd00', '#ff4444', '#44ff44', '#4488ff', '#ff00ff'];
                const randColor = rainbowColors[Math.floor(Math.random() * rainbowColors.length)];
                spawnParticles(px, py - 10, 1, randColor, 'sparkle');
            }
            if (powerUp.coffee > 0) {
                spawnParticles(px, py - 10, 1, '#ff8800', 'sparkle');
            }
            if (powerUp.wacom > 0) {
                spawnParticles(px, py - 10, 1, '#00ff88', 'sparkle');
            }
            if (powerUp.ai > 0) {
                spawnParticles(px, py - 10, 1, '#00f0ff', 'sparkle');
            }
        }
        // Spawn foot dust when running
        if (this.grounded && Math.abs(this.vx) > 3 && Math.random() < 0.25) {
            spawnParticles(this.x + (this.vx > 0 ? 0 : this.width), this.y + this.height, 1, '#888', 'dust');
        }
    }
    triggerShockwave() {
        sound.play('spring'); // deep boom sound
        screenShake = 15; // slightly increased screenshake
        spawnShockwaveParticles(this.x + this.width / 2, this.y + this.height);

        // Deal damage to walker/jumper enemies in range (240px horizontal range)
        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            const dist = Math.abs((enemy.x + enemy.width / 2) - (this.x + this.width / 2));
            const distY = Math.abs((enemy.y + enemy.height / 2) - (this.y + this.height / 2));
            if (dist < 240 && distY < 120) {
                enemy.alive = false;
                score += 150;
                gameDeadlineTimer += 3000;
                spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 12, '#ffcc00', 'burst');
                spawnFloatingText(enemy.x + enemy.width / 2, enemy.y, '+3s', '#ffcc00');
            }
        }
        // Deal damage to Boss
        if (bossActive && boss && boss.state !== 'defeat') {
            const dist = Math.abs((boss.x + boss.width / 2) - (this.x + this.width / 2));
            if (dist < 240) {
                boss.takeDamage();
            }
        }
        updateHUD();
    }
    die(isFall = false, isTimeout = false) {
        if (powerUp.camera > 0 && !isFall) return; // Invincible! (but not to falling)
        if (this.undoShield) {
            this.undoShield = false;
            const undoHUD = document.getElementById('hud-undoshield');
            if (undoHUD) undoHUD.classList.add('hidden');

            sound.play('portal'); // warp sound
            screenShake = 20;
            spawnParticles(this.x + this.width / 2, this.y + this.height / 2, 25, '#ff33ff', 'burst');
            spawnFloatingText(this.x, this.y, '↩️ CTRL+Z UNDO!', '#ff33ff');

            // Teleport back
            this.x = this.lastSafeX;
            this.y = this.lastSafeY;
            this.vx = 0;
            this.vy = 0;
            this.invincible = 750;
            return;
        }

        if (!isTimeout) {
            gameDeadlineTimer -= 30000;
            if (gameDeadlineTimer < 0) gameDeadlineTimer = 0;
            spawnFloatingText(this.x, this.y - 20, '-30s (CEZA)', '#ff4444');
        }

        lives--;
        sound.play('hit');
        screenShake = 15;
        if (lives <= 0) {
            gameState = GameState.GAMEOVER;
            sound.play('gameover');
            sound.stopBGM();
            showScreen('gameover-screen');
            const gameoverTitle = document.querySelector('.gameover-title');
            if (gameoverTitle) gameoverTitle.textContent = isTimeout ? 'SÜRE BİTTİ' : 'GAME OVER';
            const gameoverSubtitle = document.querySelector('.gameover-subtitle');
            if (gameoverSubtitle) gameoverSubtitle.textContent = isTimeout ? 'Deadline kaçırıldı! ⏰' : 'Müşteriler kazandı! 😭';
            document.getElementById('final-score').textContent = score;
            document.getElementById('final-sdcards').textContent = sdCardsCollected;

            // High score checks
            document.getElementById('gameover-highscore-value').textContent = highscore;
            const newRecordMsg = document.getElementById('new-highscore-msg');
            if (score >= highscore && score > 0) {
                if (newRecordMsg) newRecordMsg.classList.remove('hidden');
            } else {
                if (newRecordMsg) newRecordMsg.classList.add('hidden');
            }
            const startVal = document.getElementById('start-highscore-value');
            if (startVal) startVal.textContent = highscore;
        } else {
            // Find a safe respawn position: use lastSafeX/Y if valid, otherwise default
            if (this.lastSafeX > 0 && this.lastSafeY > 0 && this.lastSafeY < canvas.height - 50) {
                this.x = this.lastSafeX;
                this.y = this.lastSafeY;
            } else {
                this.x = 100;
                // Place player on top of the first ground platform
                let spawnY = 400;
                for (const p of platforms) {
                    if (p.type === 'ground' && p.x <= 200) {
                        spawnY = p.y - this.height;
                        break;
                    }
                }
                this.y = spawnY;
            }
            this.vx = 0; this.vy = 0;
            this.invincible = 1250;
            this.isRespawning = true;
            this.respawnTimer = 1200;
            spawnParticles(this.x + this.width / 2, this.y + this.height, 20, '#00f0ff', 'burst');
            if (inSecretDimension) exitSecretDimension();
        }
        updateHUD();
    }
    draw() {
        let sx = this.x - cameraX;

        if (this.isRespawning) {
            const progress = 1 - (this.respawnTimer / 1200);

            // Draw a warp beam
            ctx.save();
            ctx.globalAlpha = (1 - Math.abs(progress - 0.5) * 2) * 0.5; // Fade in and out
            const beamGrad = ctx.createLinearGradient(0, this.y - 100, 0, this.y + this.height);
            beamGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
            beamGrad.addColorStop(1, 'rgba(0, 240, 255, 1)');
            ctx.fillStyle = beamGrad;
            ctx.fillRect(sx - 10, this.y - 100, this.width + 20, this.height + 100);
            ctx.restore();

            // Silhouette glitch effect
            ctx.globalAlpha = Math.min(1, progress * 1.5);
            ctx.filter = `brightness(${150 + Math.sin(gameTime * 0.05) * 50}%) hue-rotate(${progress * 360}deg) saturate(200%)`;
            if (Math.random() < 0.2) {
                sx += (Math.random() - 0.5) * 10;
            }
        } else if (this.invincible > 0 && Math.floor(this.invincible / 80) % 2 === 0 && !this.isRespawning) {
            return;
        }
        let sprite;
        if (this.state === 'jump') sprite = playerSprites.jump;
        else if (this.state === 'fall') sprite = playerSprites.fall;
        else if (this.state === 'run') sprite = playerSprites.run[this.animFrame % playerSprites.run.length];
        else sprite = playerSprites.idle[Math.floor(this.animFrame / 2) % playerSprites.idle.length];

        ctx.save();
        // Power-up visual effects
        if (powerUp.camera > 0) {
            const hue = (gameTime * 0.5) % 360;
            ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
            ctx.shadowBlur = 20;
        } else if (powerUp.coffee > 0) {
            ctx.shadowColor = '#ff8800';
            ctx.shadowBlur = 10;
        } else if (powerUp.wacom > 0) {
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 10;
        } else if (powerUp.ai > 0) {
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 10;
        }

        // Squash & Stretch visual transformations
        ctx.translate(sx + this.width / 2, this.y + this.height);
        ctx.scale(this.scaleX * (this.facing === -1 ? -1 : 1), this.scaleY);
        ctx.translate(-this.width / 2, -this.height);
        ctx.drawImage(sprite, 0, 0, this.width, this.height);
        ctx.restore();

        // Draw Undo Shield Orbs rotating around player
        if (this.undoShield) {
            ctx.save();
            const numArrows = 3;
            const radius = 32;
            const time = gameTime * 0.003;
            for (let i = 0; i < numArrows; i++) {
                const angle = time + i * Math.PI * 2 / numArrows;
                const ax = sx + this.width / 2 + Math.cos(angle) * radius;
                const ay = this.y + this.height / 2 + Math.sin(angle) * radius;

                ctx.fillStyle = '#ff33ff';
                ctx.shadowColor = '#ff33ff';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(ax, ay, 4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Draw AI Helper companion if active
        if (powerUp.ai > 0 && aiHelperInstance) {
            aiHelperInstance.draw();
        }

        // Power-up indicator above player
        if (powerUp.camera > 0 || powerUp.coffee > 0 || powerUp.wacom > 0 || powerUp.ai > 0) {
            ctx.font = '12px Courier New';
            ctx.textAlign = 'center';
            // Just display one of them for simplicity over head if we want, or remove it. Let's remove overhead timer to reduce clutter since we have bars now.
        }
    }
}

// ==========================================
// ENEMY
// ==========================================
class Enemy {
    constructor(x, y, type = 'walker') {
        this.x = x; this.y = y;
        this.width = 44; this.height = 52;
        this.vx = type === 'walker' ? -1.8 : 0;
        this.vy = 0; this.type = type;
        this.alive = true; this.animFrame = 0; this.animTimer = 0;
        this.deathTimer = 0; this.originalX = x; this.direction = -1;
        this.jumpTimer = Math.random() * 1000; this.patrolRange = 180;
        this.bubbleTimer = Math.random() * 2000;
        this.revizeTexts = ['REVİZE!', 'DEĞİŞTİR!', 'BEĞENMEDIM!', 'TEKRAR!', 'LOGO BÜYÜT!', 'RENK DEĞİŞ!'];
        this.currentText = this.revizeTexts[Math.floor(Math.random() * this.revizeTexts.length)];
        this.grounded = false;
    }
    update(dt) {
        if (this.y > canvas.height + 150) return false; // clean up out-of-bounds enemies
        if (!this.alive) { this.deathTimer += dt; this.y += 3; return this.deathTimer < 400; }
        this.animTimer += dt;
        if (this.animTimer > 180) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 4; }
        this.bubbleTimer += dt;
        if (this.bubbleTimer > 3000) { this.bubbleTimer = 0; this.currentText = this.revizeTexts[Math.floor(Math.random() * this.revizeTexts.length)]; }

        if (this.type === 'walker') {
            this.x += this.vx;
            if (this.x < this.originalX - this.patrolRange) { this.vx = Math.abs(this.vx); this.direction = 1; }
            if (this.x > this.originalX + this.patrolRange) { this.vx = -Math.abs(this.vx); this.direction = -1; }
            for (const plat of platforms) {
                if (this.x + this.width > plat.x && this.x < plat.x + plat.width &&
                    this.y + this.height >= plat.y && this.y + this.height <= plat.y + 5) {
                    const ahead = this.direction === 1 ? this.x + this.width + 5 : this.x - 5;
                    let edge = true;
                    for (const p of platforms) {
                        if (ahead > p.x && ahead < p.x + p.width && this.y + this.height + 5 > p.y && this.y + this.height + 5 < p.y + p.height + 20) edge = false;
                    }
                    if (edge) { this.vx = -this.vx; this.direction = -this.direction; }
                }
            }
        }
        if (this.type === 'jumper') {
            this.jumpTimer += dt;
            if (this.jumpTimer > 2000 && this.grounded) {
                this.jumpTimer = 0;
                this.vy = -9;
                this.grounded = false;
            }
            this.vy += 0.4; this.y += this.vy;
            this.grounded = false;
            for (const plat of platforms) {
                if (this.x + this.width > plat.x && this.x < plat.x + plat.width &&
                    this.vy >= 0 && this.y + this.height >= plat.y && this.y + this.height <= plat.y + this.vy + 10) {
                    this.y = plat.y - this.height;
                    this.vy = 0;
                    this.grounded = true;
                }
            }
        }
        return true;
    }
    draw() {
        const sx = this.x - cameraX;
        if (sx < -80 || sx > canvas.width + 80) return;
        ctx.save();
        if (!this.alive) ctx.globalAlpha = 1 - (this.deathTimer / 400);
        const sprite = enemySprites.walk[this.animFrame % 4];
        if (this.direction === 1) { ctx.translate(sx + this.width, 0); ctx.scale(-1, 1); ctx.drawImage(sprite, 0, this.y, this.width, this.height); }
        else { ctx.drawImage(sprite, sx, this.y, this.width, this.height); }
        ctx.restore();
        // Bubble
        if (this.alive && this.bubbleTimer < 2000) {
            const bx = sx + this.width / 2, by = this.y - 20;
            ctx.save();
            ctx.font = '8px "Press Start 2P", monospace';
            const bw = Math.max(60, this.currentText.length * 7 + 16);
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.roundRect(bx - bw / 2, by - 14, bw, 22, 6); ctx.fill();
            ctx.strokeStyle = '#cc0000'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.moveTo(bx - 5, by + 8); ctx.lineTo(bx, by + 15); ctx.lineTo(bx + 5, by + 8); ctx.fill();
            ctx.fillStyle = '#cc0000'; ctx.textAlign = 'center';
            ctx.fillText(this.currentText, bx, by + 2);
            ctx.restore();
        }
    }
}

// ==========================================
// SD CARD
// ==========================================
class SDCard {
    constructor(x, y) {
        this.x = x; this.y = y; this.width = 28; this.height = 28;
        this.collected = false; this.floatOffset = Math.random() * Math.PI * 2; this.sparkleTimer = 0; this.animFrame = 0;
    }
    update(dt) {
        if (this.collected) return;
        this.floatOffset += dt * 0.004;
        this.sparkleTimer += dt;
        if (this.sparkleTimer > 500) { this.sparkleTimer = 0; this.animFrame = (this.animFrame + 1) % 2; }
    }
    draw() {
        if (this.collected) return;
        const sx = this.x - cameraX;
        if (sx < -40 || sx > canvas.width + 40) return;
        const fy = this.y + Math.sin(this.floatOffset) * 4;
        ctx.save();
        ctx.shadowColor = '#3388ff'; ctx.shadowBlur = 12;
        ctx.drawImage(sdCardSprites[this.animFrame], sx, fy, this.width, this.height);
        ctx.restore();
    }
}

// ==========================================
// SKILL ORB
// ==========================================
class SkillOrb {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.width = 24; this.height = 24;
        this.color = color || { hex: '#00ff88', rgba: '0, 255, 136' };
        this.collected = false; this.floatOffset = Math.random() * Math.PI * 2;
    }
    update(dt) {
        if (this.collected) return;
        this.floatOffset += dt * 0.005;
    }
    draw() {
        if (this.collected) return;
        const sx = this.x - cameraX;
        if (sx < -40 || sx > canvas.width + 40) return;
        const fy = this.y + Math.sin(this.floatOffset) * 5;

        ctx.save();
        ctx.shadowColor = this.color.hex; ctx.shadowBlur = 15;
        ctx.fillStyle = `rgba(${this.color.rgba}, 0.4)`;
        ctx.beginPath(); ctx.arc(sx + 12, fy + 12, 14, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = this.color.hex;
        ctx.beginPath(); ctx.arc(sx + 12, fy + 12, 8, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(sx + 8, fy + 8, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

// ==========================================
// POWER-UP ITEM
// ==========================================
class PowerUpItem {
    constructor(x, y, type) {
        this.x = x; this.y = y; this.width = 32; this.height = 32;
        this.type = type; // 'camera', 'coffee', 'wacom'
        this.collected = false; this.floatOffset = Math.random() * Math.PI * 2;
    }
    update(dt) {
        if (this.collected) return;
        this.floatOffset += dt * 0.003;
    }
    draw() {
        if (this.collected) return;
        const sx = this.x - cameraX;
        if (sx < -40 || sx > canvas.width + 40) return;
        const fy = this.y + Math.sin(this.floatOffset) * 5;

        // Background glow circle
        ctx.save();
        const colors = { camera: '#ffdd00', coffee: '#ff8800', wacom: '#00ff88', undoshield: '#ff33ff' };
        ctx.shadowColor = colors[this.type] || '#ff00ff'; ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.arc(sx + 16, fy + 16, 18, 0, Math.PI * 2); ctx.fill();

        // Item box
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(sx - 2, fy - 2, 36, 36);
        ctx.fillStyle = '#b8960f';
        ctx.fillRect(sx, fy, 32, 32);
        ctx.fillStyle = '#e8c020';
        ctx.fillRect(sx + 1, fy + 1, 30, 30);

        // Question mark or icon
        ctx.drawImage(powerUpSprites[this.type], sx, fy, 32, 32);
        ctx.restore();

        // Label below
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = '6px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        const labels = { camera: '📷 KAMERA', coffee: '☕ KAHVE', wacom: '🖱️ WACOM', undoshield: '↩️ CTRL+Z' };
        ctx.fillText(labels[this.type] || 'GÜÇ', sx + 16, fy + 42);
        ctx.restore();
    }
}

// ==========================================
// PORTAL
// ==========================================
class Portal {
    constructor(x, y, targetDimension) {
        this.x = x; this.y = y;
        this.width = 40; this.height = 56;
        this.targetDimension = targetDimension; // secret room definition
        this.animTimer = 0;
        this.active = true;
    }
    update(dt) { this.animTimer += dt; }
    draw() {
        if (!this.active) return;
        const sx = this.x - cameraX;
        if (sx < -60 || sx > canvas.width + 60) return;

        // Portal swirl
        ctx.save();
        const time = this.animTimer * 0.003;
        for (let r = 24; r > 4; r -= 2) {
            const hue = (time * 60 + r * 15) % 360;
            ctx.fillStyle = `hsla(${hue}, 80%, ${50 + r}%, ${0.2 + r * 0.02})`;
            ctx.beginPath();
            ctx.ellipse(sx + 20, this.y + 28, r + Math.sin(time + r) * 3, r * 1.2 + Math.cos(time + r) * 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        // Center dark
        ctx.fillStyle = 'rgba(10, 0, 30, 0.8)';
        ctx.beginPath(); ctx.ellipse(sx + 20, this.y + 28, 8, 10, 0, 0, Math.PI * 2); ctx.fill();

        // Rotating particles around portal
        for (let i = 0; i < 6; i++) {
            const a = time * 2 + i * Math.PI / 3;
            const pr = 20 + Math.sin(time * 3 + i) * 4;
            const px = sx + 20 + Math.cos(a) * pr;
            const py = this.y + 28 + Math.sin(a) * pr * 1.2;
            const hue = (time * 80 + i * 60) % 360;
            ctx.fillStyle = `hsla(${hue}, 100%, 70%, 0.8)`;
            ctx.fillRect(px - 2, py - 2, 4, 4);
        }
        ctx.restore();

        // Label
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = '6px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#a040ff'; ctx.shadowBlur = 8;
        ctx.fillText('⬇ GİZLİ GEÇİT', sx + 20, this.y - 8);
        ctx.restore();
    }
}

// ==========================================
// FINISH FLAG
// ==========================================
class FinishFlag {
    constructor(x, y) { this.x = x; this.y = y; this.width = 50; this.height = 130; this.waveOffset = 0; }
    update(dt) { this.waveOffset += dt * 0.005; }
    draw() {
        const sx = this.x - cameraX;
        if (sx < -60 || sx > canvas.width + 60) return;
        ctx.fillStyle = '#bbb'; ctx.fillRect(sx + 6, this.y, 6, this.height);
        ctx.fillStyle = '#888'; ctx.fillRect(sx, this.y + this.height - 8, 18, 8);
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath(); ctx.arc(sx + 9, this.y, 8, 0, Math.PI * 2); ctx.fill();
        const w = Math.sin(this.waveOffset) * 6;
        ctx.fillStyle = '#44dd55';
        ctx.beginPath(); ctx.moveTo(sx + 12, this.y + 6); ctx.lineTo(sx + 50 + w, this.y + 22); ctx.lineTo(sx + 12, this.y + 42); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#228833'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 7px "Press Start 2P", monospace'; ctx.textAlign = 'left';
        ctx.fillText('TESLİM', sx + 16, this.y + 27);
        ctx.fillText('ET!', sx + 22, this.y + 36);
    }
}

// ==========================================
// LASER PROJECTILE
// ==========================================
class LaserProjectile {
    constructor(x, y, vx) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = 0;
        this.width = 10;
        this.height = 10;
        this.active = true;
        this.homingTarget = null; // set by AIHelper for homing shots
    }
    update(dt) {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < cameraX - 100 || this.x > cameraX + canvas.width + 100 ||
            this.y < -100 || this.y > canvas.height + 100) {
            this.active = false;
        }
        return this.active;
    }
    draw() {
        const sx = this.x - cameraX;
        ctx.save();
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        // Draw as glowing circle for homing shots
        ctx.beginPath();
        ctx.arc(sx + 5, this.y + 5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx + 5, this.y + 5, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ==========================================
// PLAYER PROJECTILE
// ==========================================
class PlayerProjectile {
    constructor(x, y, vx) {
        this.x = x; this.y = y; this.vx = vx; this.vy = 0;
        this.width = 12; this.height = 12;
        this.active = true;
        this.animOffset = 0;
    }
    update(dt) {
        this.x += this.vx;
        this.animOffset += dt * 0.01;
        if (this.x < cameraX - 100 || this.x > cameraX + canvas.width + 100) this.active = false;
        return this.active;
    }
    draw() {
        const sx = this.x - cameraX;
        ctx.save();
        ctx.translate(sx + 6, this.y + 6);
        ctx.rotate(this.animOffset);
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10;
        ctx.fillRect(-6, -6, 12, 12);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-2, -2, 4, 4);
        ctx.restore();
    }
}

// ==========================================
// AI HELPER DROID
// ==========================================
class AIHelper {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 24;
        this.shootTimer = 0;
        this.hoverOffset = 0;
    }
    update(dt) {
        this.hoverOffset += dt * 0.005;
        const targetX = player.x - player.facing * 35;
        const targetY = player.y - 25 + Math.sin(this.hoverOffset) * 6;
        this.x += (targetX - this.x) * 0.12;
        this.y += (targetY - this.y) * 0.12;

        // Update homing for all active lasers fired by this drone
        for (const laser of lasers) {
            if (!laser.active || !laser.homingTarget) continue;
            if (!laser.homingTarget.alive) { laser.homingTarget = null; continue; }
            const dx = (laser.homingTarget.x + laser.homingTarget.width / 2) - laser.x;
            const dy = (laser.homingTarget.y + laser.homingTarget.height / 2) - laser.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 5) {
                const spd = 14;
                laser.vx += (dx / dist * spd - laser.vx) * 0.18;
                laser.vy += (dy / dist * spd - laser.vy) * 0.18;
            }
        }

        this.shootTimer += dt;
        if (this.shootTimer > 700) {
            let closestEnemy = null;
            let minDist = 500; // increased detection range
            for (const enemy of enemies) {
                if (!enemy.alive) continue;
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) {
                    minDist = dist;
                    closestEnemy = enemy;
                }
            }
            if (closestEnemy) {
                this.shootTimer = 0;
                const dx = (closestEnemy.x + closestEnemy.width / 2) - this.x;
                const dy = (closestEnemy.y + closestEnemy.height / 2) - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const spd = 13;
                const laser = new LaserProjectile(this.x + this.width / 2, this.y + 10, dx / dist * spd);
                laser.vy = dy / dist * spd;
                laser.homingTarget = closestEnemy;
                lasers.push(laser);
                sound.play('laser');
                spawnParticles(this.x + this.width / 2, this.y + 12, 5, '#00f0ff', 'sparkle');
            }
        }
    }
    draw() {
        const sx = this.x - cameraX;
        ctx.save();
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#2d2d2d';
        ctx.fillRect(sx, this.y, this.width, this.height);
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(sx + 8, this.y + 8, 8, 8);
        ctx.fillStyle = '#666';
        ctx.fillRect(sx + 4, this.y - 4, 2, 4);
        ctx.fillRect(sx + 18, this.y - 4, 2, 4);
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(sx + 4, this.y - 6, 2, 2);
        ctx.fillRect(sx + 18, this.y - 6, 2, 2);
        ctx.restore();
    }
}

// ==========================================
// BOSS: BAŞ MÜŞTERİ
// ==========================================
class Boss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 100;
        this.hp = 7;
        this.maxHp = 7;
        this.originalY = y;
        this.vx = -1.5;
        this.vy = 0;
        this.state = 'intro';
        this.stateTimer = 0;
        this.invincibleTimer = 0;
        this.flashTimer = 0;
        this.attackTimer = 0;
        this.animFrame = 0;
        this.animTimer = 0;
        this.projectiles = [];
        this.direction = -1;
        this.floatOffset = 0;
        this.phase2 = false;
        this.laserActive = false;
        this.laserTimer = 0;
    }
    update(dt) {
        this.animTimer += dt;
        if (this.animTimer > 150) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }

        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
        if (this.flashTimer > 0) this.flashTimer -= dt;

        this.projectiles = this.projectiles.filter(p => p.update(dt));

        this.stateTimer += dt;
        if (this.state === 'intro') {
            if (this.x > cameraX + canvas.width - 150) {
                this.x -= 2.5;
            } else {
                this.state = 'idle';
                this.stateTimer = 0;
            }
            return true;
        }

        if (this.state === 'defeat') {
            if (this.stateTimer < 1500) {
                if (Math.random() < 0.15) {
                    spawnParticles(this.x + Math.random() * this.width, this.y + Math.random() * this.height, 8, '#ffcc00', 'burst');
                    sound.play('stomp');
                }
                this.y += 1.5;
                return true;
            }
            sound.play('boss_die');
            for (let i = 0; i < 20; i++) {
                sdCards.push(new SDCard(this.x + this.width / 2 + (Math.random() - 0.5) * 60, this.y + Math.random() * this.height - 30));
            }
            spawnParticles(this.x + this.width / 2, this.y + this.height / 2, 40, '#ff4444', 'burst');
            spawnFloatingText(this.x + this.width / 2, this.y, 'REVİZE BİTTİ!', '#ffcc00');
            bossActive = false;
            bossDefeated = true;
            if (typeof startOutro === 'function') startOutro();
            return false;
        }

        this.floatOffset += dt * 0.003;
        const targetY = this.originalY + Math.sin(this.floatOffset) * 40;
        this.y += (targetY - this.y) * 0.05;

        this.x += this.vx;
        const leftLimit = cameraX + 100;
        const rightLimit = cameraX + canvas.width - this.width - 100;
        if (this.x < leftLimit) {
            this.vx = Math.abs(this.vx);
            this.direction = 1;
        } else if (this.x > rightLimit) {
            this.vx = -Math.abs(this.vx);
            this.direction = -1;
        }

        this.attackTimer += dt;
        if (this.attackTimer > (this.phase2 ? 2400 : 2800)) {
            this.attackTimer = 0;
            this.performAttack();
        }

        return true;
    }
    performAttack() {
        const rand = Math.random();

        const dropChance = Math.random();
        if (dropChance < (this.phase2 ? 0.25 : 0.15)) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            this.projectiles.push(new BossProjectile(this.x + this.width / 2, this.y + this.height / 2, (dx / dist) * 3, (dy / dist) * 3, 'AMMO', '#00ff00', 'ammo'));
        } else if (dropChance > 0.90) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            this.projectiles.push(new BossProjectile(this.x + this.width / 2, this.y + this.height / 2, (dx / dist) * 3, (dy / dist) * 3, 'CAN', '#ff00ff', 'health'));
        }

        if (this.phase2 && rand < 0.4) {
            spawnFloatingText(this.x + this.width / 2, this.y - 10, 'REVİZE YAĞMURU!', '#ff0000');
            sound.play('boss_hit');
            screenShake = 15;

            const numProjectiles = 9; // Azaltılmış mermi sayısı
            const gapIndex = Math.floor(Math.random() * (numProjectiles - 3));
            for (let i = 0; i < numProjectiles; i++) {
                if (i >= gapIndex && i <= gapIndex + 2) continue; // Boşluk
                const angle = Math.PI + (i * (Math.PI / (numProjectiles - 1)));
                const speed = 3.0 + Math.random();
                const vx = Math.cos(angle) * speed;
                const vy = Math.abs(Math.sin(angle)) * speed + 1;
                this.projectiles.push(new BossProjectile(this.x + this.width / 2, this.y + this.height / 2, vx, vy, 'REVIZE!', '#ff0000'));
            }
        } else if (rand < 0.6) {
            const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
            const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
            const baseAngle = Math.atan2(dy, dx);

            // Hedefe kilitli yan yana mermi atışı
            for (let i = -0.5; i <= 0.5; i += 1) { // 3 mermi yerine 2 mermi atacak
                const angle = baseAngle + (i * 0.35);
                const speed = this.phase2 ? 5.5 : 4.0;
                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed;
                this.projectiles.push(new BossProjectile(this.x + this.width / 2, this.y + this.height / 2, vx, vy, 'REVIZE!'));
            }
            sound.play('hit');
            spawnFloatingText(this.x + this.width / 2, this.y - 10, 'HEMEN DÜZELT!', '#ff4444');
        } else {
            spawnFloatingText(this.x + this.width / 2, this.y - 10, 'TASARIM OLMAMIŞ!', '#ff4444');
            const dx = player.x - this.x;
            this.vx = (dx > 0 ? 1 : -1) * (this.phase2 ? 8.5 : 5.5);
            setTimeout(() => {
                this.vx = (this.vx > 0 ? (this.phase2 ? 4.5 : 1.5) : (this.phase2 ? -4.5 : -1.5));
            }, 1200);
        }
    }
    takeDamage() {
        if (this.invincibleTimer > 0 || this.state === 'defeat') return;
        this.hp--;
        this.invincibleTimer = 1000;
        this.flashTimer = 250;
        sound.play('boss_hit');
        screenShake = 15;
        spawnParticles(this.x + this.width / 2, this.y + this.height / 2, 20, '#ff4444', 'burst');
        spawnFloatingText(this.x + this.width / 2, this.y, `-1 HP`, '#ff0000');

        if (this.hp <= 3 && !this.phase2) {
            this.phase2 = true;
            this.vx = (this.vx > 0 ? 4.5 : -4.5);
            spawnFloatingText(this.x + this.width / 2, this.y - 30, 'ÖFKELİ MÜŞTERİ!', '#ff0000');
            sound.play('boss_hit');
        }

        if (this.hp <= 0) {
            this.state = 'defeat';
            this.stateTimer = 0;
            this.vx = 0;
            this.laserActive = false;
        }
    }
    draw() {
        const sx = this.x - cameraX;
        ctx.save();

        if (this.phase2) {
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 30;
        }

        if (this.flashTimer > 0 && Math.floor(this.flashTimer / 50) % 2 === 0) {
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 20;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx, this.y, this.width, this.height);
        } else {
            ctx.shadowColor = '#ff4444';
            ctx.shadowBlur = 15;

            ctx.fillStyle = '#0a1a3a';
            ctx.fillRect(sx + 10, this.y + 40, 60, 60);
            ctx.fillStyle = '#ff3333';
            ctx.fillRect(sx + 36, this.y + 50, 8, 40);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx + 24, this.y + 40, 32, 10);
            ctx.fillStyle = '#0a1a3a';
            ctx.fillRect(sx + 10, this.y + 40, 14, 15);
            ctx.fillRect(sx + 56, this.y + 40, 14, 15);

            ctx.fillStyle = '#ffd5a0';
            ctx.fillRect(sx + 16, this.y + 10, 48, 38);

            ctx.fillStyle = '#3a2000';
            ctx.fillRect(sx + 12, this.y, 56, 12);
            ctx.fillRect(sx + 12, this.y, 8, 24);
            ctx.fillRect(sx + 60, this.y, 8, 24);

            ctx.fillStyle = '#ff4444';
            ctx.fillRect(sx + 24, this.y + 20, 8, 4);
            ctx.fillRect(sx + 48, this.y + 20, 8, 4);
            ctx.fillStyle = '#000';
            ctx.fillRect(sx + 26, this.y + 22, 4, 4);
            ctx.fillRect(sx + 50, this.y + 22, 4, 4);

            ctx.strokeStyle = '#3a2000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(sx + 22, this.y + 16);
            ctx.lineTo(sx + 32, this.y + 20);
            ctx.moveTo(sx + 58, this.y + 16);
            ctx.lineTo(sx + 48, this.y + 20);
            ctx.stroke();

            ctx.fillStyle = '#600';
            ctx.fillRect(sx + 28, this.y + 34, 24, 8);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx + 30, this.y + 34, 20, 2);

            ctx.fillStyle = '#8b5a2b';
            ctx.fillRect(sx + 60, this.y + 45, 24, 34);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx + 62, this.y + 48, 20, 28);
            ctx.fillStyle = '#cc0000';
            ctx.font = 'bold 5px Arial';
            ctx.fillText('REVIZE', sx + 63, this.y + 58);
            ctx.fillText('LISTESI', sx + 63, this.y + 66);
        }

        ctx.restore();

        for (const p of this.projectiles) {
            p.draw();
        }

        const barW = 300;
        const barH = 12;
        const bx = canvas.width / 2 - barW / 2;
        const by = 48;

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(bx, by, barW * (this.hp / this.maxHp), barH);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, barW, barH);
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`KREATİF MÜŞTERİ (BOSS) - HP: ${this.hp}/${this.maxHp}`, canvas.width / 2, by - 6);
        ctx.restore();
    }
}

// ==========================================
// BOSS PROJECTILE
// ==========================================
class BossProjectile {
    constructor(x, y, vx, vy, text, color = '#ff3333', projectileType = 'danger') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.text = text;
        this.color = color;
        this.width = text.length * 6 + 10;
        this.height = 14;
        this.active = true;
        this.deflected = false;
        this.projectileType = projectileType;
    }
    update(dt) {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < cameraX - 100 || this.x > cameraX + canvas.width + 100 || this.y > canvas.height + 100 || this.y < -100) {
            this.active = false;
        }

        if (this.active && !this.deflected && player.invincible <= 0 && gameState === GameState.PLAYING) {
            const pLeft = player.x + 10;
            const pRight = player.x + player.width - 10;
            const pTop = player.y + 10;
            const pBottom = player.y + player.height - 2;

            if (this.x + this.width > pLeft && this.x < pRight && this.y + this.height > pTop && this.y < pBottom) {
                if (this.projectileType === 'ammo') {
                    this.active = false;
                    player.bossAmmo += 3;
                    sound.play('coin');
                    spawnParticles(this.x + this.width / 2, this.y + this.height / 2, 10, '#00ff00', 'sparkle');
                    if (typeof updateHUD === 'function') updateHUD();
                    return this.active;
                } else if (this.projectileType === 'health') {
                    this.active = false;
                    lives++;
                    sound.play('powerup');
                    spawnParticles(this.x + this.width / 2, this.y + this.height / 2, 15, '#ff00ff', 'burst');
                    spawnFloatingText(this.x + this.width / 2, this.y, '+1 CAN', '#ff00ff');
                    if (typeof updateHUD === 'function') updateHUD();
                    return this.active;
                }

                const isStomp = player.vy > 0 && pBottom <= this.y + this.height + 5;
                if (player.isDashing || player.shieldActive || isStomp) {
                    this.deflected = true;
                    if (typeof bossActive !== 'undefined' && bossActive && boss) {
                        const dx = (boss.x + boss.width / 2) - (this.x + this.width / 2);
                        const dy = (boss.y + boss.height / 2) - (this.y + this.height / 2);
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        this.vx = (dx / dist) * 8;
                        this.vy = (dy / dist) * 8;
                    } else {
                        this.vx = -this.vx * 1.5;
                        this.vy = -this.vy * 1.5;
                    }
                    this.color = '#00ff88';
                    if (isStomp) player.vy = -10;
                    sound.play('stomp');
                    spawnParticles(this.x + this.width / 2, this.y + this.height / 2, 15, this.color, 'burst');
                    return this.active;
                }

                this.active = false;
                player.die();
            }
        }
        return this.active;
    }
    draw() {
        const sx = this.x - cameraX;
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(sx, this.y, this.width, this.height, 4);
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = this.color;
        ctx.font = 'bold 8px "Press Start 2P", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, sx + this.width / 2, this.y + 10);
        ctx.restore();
    }
}

// ==========================================
// PARTICLES
// ==========================================
function spawnParticles(x, y, count, color, type = 'burst') {
    for (let i = 0; i < count; i++) {
        particles.push({ x, y, vx: (Math.random() - 0.5) * (type === 'burst' ? 8 : 3), vy: type === 'sparkle' ? -Math.random() * 2 : (Math.random() - 0.5) * 8 - 2, life: 1, decay: type === 'sparkle' ? 0.01 : 0.02 + Math.random() * 0.02, color, size: type === 'dust' ? 3 + Math.random() * 3 : 2 + Math.random() * 4, type });
    }
}
function spawnCodeParticles(x, y) {
    const syntaxes = [';', '{', '}', '<', '>', '/', '(', ')', '[', ']'];
    const char = syntaxes[Math.floor(Math.random() * syntaxes.length)];
    particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 3 - player.facing * 3,
        vy: (Math.random() - 0.5) * 2,
        life: 1,
        decay: 0.03 + Math.random() * 0.02,
        color: '#00ff88',
        size: 8 + Math.floor(Math.random() * 6),
        type: 'text_particle',
        char: char
    });
}
function spawnShockwaveParticles(x, y) {
    for (let i = -8; i <= 8; i++) {
        if (i === 0) continue;
        particles.push({
            x: x + i * 4,
            y: y - 4,
            vx: i * 0.9 + (Math.random() - 0.5),
            vy: -Math.random() * 2 - 1,
            life: 1,
            decay: 0.03 + Math.random() * 0.02,
            color: '#ffcc00',
            size: 3 + Math.random() * 4,
            type: 'shockwave'
        });
    }
}
function spawnFloatingText(x, y, text, color = '#ffcc00') { floatingTexts.push({ x, y, text, color, life: 1, vy: -2 }); }
function updateParticles(dt) {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.type !== 'sparkle' && p.type !== 'text_particle') p.vy += 0.12;
        p.life -= p.decay;
        return p.life > 0;
    });
    floatingTexts = floatingTexts.filter(ft => { ft.y += ft.vy; ft.life -= 0.015; return ft.life > 0; });
}
function drawParticles() {
    for (const p of particles) {
        ctx.save(); ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
        if (p.type === 'sparkle') {
            ctx.fillRect(p.x - cameraX - p.size / 2, p.y - p.size / 2, p.size, p.size);
        } else if (p.type === 'text_particle') {
            ctx.font = `bold ${p.size}px monospace`;
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 6;
            ctx.fillText(p.char, p.x - cameraX, p.y);
        } else if (p.type === 'shockwave') {
            ctx.shadowColor = '#ffcc00';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x - cameraX, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(p.x - cameraX, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
    for (const ft of floatingTexts) {
        ctx.save(); ctx.globalAlpha = ft.life; ctx.fillStyle = ft.color;
        ctx.font = 'bold 14px "Press Start 2P", monospace'; ctx.textAlign = 'center';
        ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
        ctx.fillText(ft.text, ft.x - cameraX, ft.y);
        ctx.restore();
    }
}

// ==========================================
// HAND-CRAFTED LEVELS
// ==========================================
const LEVEL_DATA = [
    // ========== LEVEL 1: İlk İş Günü (Easy - Tutorial) ==========
    {
        name: "İlk İş Günü",
        width: 4500,
        groundY: 580,
        ground: [
            [0, 900],           // Long safe starting area
            [1050, 600],        // Gap then ground
            [1800, 500],        // Next section
            [2450, 600],        // Wide area
            [3200, 500],        // Pre-final
            [3850, 650]         // Final ground to flag
        ],
        floating: [
            // Step platforms from first ground over gap to second ground
            [850, 500, 120], [960, 450, 100],
            // From second ground, steps up to reward
            [1150, 500, 100], [1300, 440, 100, 'trampoline'], [1450, 380, 120],
            // Bridge from ground 3 area
            [1900, 480, 100], [2050, 480, 100], [2200, 480, 100],
            // Portal platform & adjacent step platforms forming a staircase
            [1970, 430, 80], [2050, 380, 80], [2130, 430, 80],
            // Steps from ground 4 up
            [2600, 500, 100, 'spikes'], [2750, 440, 100], [2900, 380, 120],
            // Bridge to ground 5
            [3050, 480, 100], [3150, 500, 80, 'trampoline'],
            // From ground 5, easy steps
            [3350, 500, 100], [3500, 450, 100], [3650, 400, 100],
            // Rescue platform over gap to final ground
            [3750, 520, 80]
        ],
        enemies: [
            [400, 'walker'], [700, 'walker'],
            [1200, 'walker'], [1600, 'walker'],
            [2100, 'walker'],
            [2700, 'walker'], [3000, 'walker'],
            [4000, 'walker'], [4200, 'walker']
        ],
        coins: [
            // Starting ground coins
            [150, 530], [210, 530], [270, 530], [330, 530],
            // On step platforms
            [890, 450], [1000, 400],
            // Second ground
            [1100, 530], [1160, 530],
            // Step coins
            [1200, 450], [1350, 390], [1500, 330],
            // Third ground
            [1850, 530], [1910, 530],
            // Bridge coins
            [1940, 430], [2090, 430], [2240, 430],
            // Above bridge reward
            [2070, 330], [2110, 330],
            // Ground 4
            [2500, 530], [2560, 530],
            // Steps up
            [2650, 450], [2800, 390], [2950, 330],
            // Ground 5
            [3250, 530], [3310, 530],
            // Step coins
            [3400, 450], [3550, 400], [3700, 350],
            // Final ground
            [3950, 530], [4010, 530], [4070, 530], [4130, 530]
        ],
        powerups: [
            [1480, 330, 'coffee']
        ],
        portals: [
            {
                x: 2060, y: 324,
                room: {
                    width: 800,
                    platforms: [[0, 520, 800], [100, 420, 100], [300, 340, 100], [500, 420, 100], [250, 260, 120]],
                    coins: [[120, 370], [180, 370], [320, 290], [380, 290], [520, 370], [580, 370], [270, 210], [330, 210], [390, 210]],
                    time: 10
                }
            }
        ],
        flagX: 4300
    },

    // ========== LEVEL 2: Deadline Yaklaşıyor (Medium) ==========
    {
        name: "Deadline Yaklaşıyor",
        width: 5500,
        groundY: 580,
        ground: [
            [0, 700],
            [850, 500],
            [1500, 500],
            [2150, 600],
            [2900, 500],
            [3550, 500],
            [4250, 500],
            [4900, 600]
        ],
        floating: [
            // Gap 1: ground0→ground1 (gap at 700-850)
            [720, 510, 80],
            // From ground1, staircase up
            [950, 500, 80], [1050, 430, 80], [1150, 360, 100],
            // Gap 2: ground1→ground2 (gap at 1350-1500)
            [1370, 500, 80, 'spikes'], [1430, 460, 80],
            // From ground2, upward path
            [1600, 500, 80], [1700, 430, 80], [1800, 360, 100], [1900, 300, 100],
            // Portal on this platform ^
            // Gap 3: ground2→ground3 (gap at 2000-2150)
            [2020, 510, 80, 'trampoline'], [2100, 480, 80],
            // From ground3, challenge section
            [2300, 500, 80], [2420, 440, 80], [2540, 380, 80], [2660, 320, 80],
            // Gap 4: ground3→ground4 (gap at 2750-2900)
            [2770, 500, 80, 'spikes'], [2850, 460, 80],
            // From ground4, more platforms
            [3000, 480, 80], [3100, 410, 80], [3200, 340, 100],
            // Gap 5: ground4→ground5 (gap at 3400-3550)
            [3420, 510, 80, 'trampoline'], [3500, 480, 80],
            // From ground5
            [3650, 500, 80], [3770, 440, 80], [3890, 380, 100],
            // Gap 6: ground5→ground6 (gap at 4050-4250)
            [4080, 510, 80, 'spikes'], [4170, 480, 80],
            // From ground6 steps
            [4350, 500, 80], [4470, 440, 80], [4590, 380, 80],
            // Gap 7: ground6→ground7 (gap at 4750-4900)
            [4770, 510, 80], [4860, 480, 80]
        ],
        enemies: [
            [380, 'walker'], [520, 'walker'],
            [1000, 'walker'], [1200, 'walker'],
            [1650, 'walker'], [1800, 'walker'],
            [2350, 'walker'], [2550, 'jumper'],
            [3050, 'walker'], [3150, 'walker'],
            [3700, 'walker'], [3850, 'jumper'],
            [4400, 'walker'], [4550, 'walker'],
            [5000, 'walker'], [5200, 'walker'], [5300, 'jumper']
        ],
        coins: [
            [100, 530], [160, 530], [220, 530], [380, 530], [440, 530],
            [740, 460], [990, 450], [1090, 380], [1190, 310],
            [1410, 450], [1640, 450], [1740, 380], [1840, 310], [1940, 250],
            [2060, 460], [2340, 450], [2460, 390], [2580, 330], [2700, 270],
            [2810, 450], [3040, 430], [3140, 360], [3240, 290],
            [3460, 460], [3690, 450], [3810, 390], [3930, 330],
            [4120, 460], [4390, 450], [4510, 390], [4630, 330],
            [4810, 460], [5000, 530], [5060, 530], [5120, 530], [5180, 530]
        ],
        powerups: [
            [1190, 310, 'camera'],
            [2100, 300, 'ai'],
            [3230, 290, 'coffee']
        ],
        portals: [
            {
                x: 1910, y: 244,
                room: {
                    width: 1000,
                    platforms: [[0, 520, 1000], [80, 420, 100], [250, 340, 100], [420, 260, 100], [590, 340, 100], [760, 420, 100], [350, 180, 120]],
                    coins: [[100, 370], [270, 290], [440, 210], [610, 290], [780, 370], [370, 130], [430, 130], [50, 470], [100, 470], [850, 470], [900, 470]],
                    time: 10
                }
            }
        ],
        flagX: 5300
    },

    // ========== LEVEL 3: Müşteri Toplantısı (Hard) ==========
    {
        name: "Müşteri Toplantısı",
        width: 6500,
        groundY: 580,
        ground: [
            [0, 600],
            [750, 400],
            [1300, 400],
            [1850, 500],
            [2500, 400],
            [3050, 400],
            [3600, 500],
            [4250, 400],
            [4800, 400],
            [5350, 400],
            [5900, 600]
        ],
        floating: [
            // Gap 1: 0→1 (600-750)
            [630, 510, 70, 'spikes'], [710, 480, 70],
            // From ground1, steps up
            [850, 500, 80], [950, 430, 70], [1050, 360, 80],
            // Gap 2: 1→2 (1150-1300)
            [1170, 510, 70], [1260, 480, 70, 'trampoline'],
            // From ground2, challenge stairs  
            [1400, 500, 70], [1500, 440, 70], [1600, 380, 70], [1700, 320, 80],
            // Gap 3: 2→3 (1700-1850)
            [1720, 510, 70, 'spikes'], [1810, 480, 70],
            // From ground3
            [1950, 500, 70], [2060, 440, 70], [2170, 380, 80], [2280, 320, 80],
            // Portal on 2280,320 platform
            // Gap 4: 3→4 (2350-2500)
            [2370, 510, 70], [2460, 480, 70, 'trampoline'],
            // From ground4 challenge
            [2600, 500, 60], [2700, 440, 60], [2800, 380, 70], [2900, 320, 70],
            // Gap 5: 4→5 (2900-3050)
            [2920, 510, 70, 'spikes'], [3010, 480, 70],
            // From ground5
            [3150, 500, 60], [3250, 440, 60], [3350, 380, 70],
            // Gap 6: 5→6 (3450-3600)
            [3470, 510, 70], [3560, 480, 70, 'trampoline'],
            // From ground6
            [3700, 500, 60], [3810, 440, 60], [3920, 380, 70], [4030, 320, 80],
            // Gap 7: 6→7 (4100-4250)
            [4120, 510, 70], [4210, 480, 70],
            // From ground7
            [4350, 500, 60], [4460, 440, 60], [4560, 380, 70],
            // Gap 8: 7→8 (4650-4800)
            [4670, 510, 70], [4760, 480, 70],
            // From ground8
            [4900, 500, 60], [5010, 440, 60], [5120, 380, 70],
            // Gap 9: 8→9 (5200-5350)
            [5220, 510, 70], [5310, 480, 70],
            // From ground9 to final
            [5450, 500, 60], [5560, 440, 60], [5660, 380, 70],
            // Gap 10: 9→10 (5750-5900)
            [5770, 510, 70], [5860, 480, 70]
        ],
        enemies: [
            [380, 'walker'], [500, 'walker'],
            [900, 'walker'], [1000, 'jumper'],
            [1450, 'walker'], [1600, 'walker'],
            [2000, 'walker'], [2200, 'jumper'],
            [2650, 'walker'], [2850, 'jumper'],
            [3200, 'walker'], [3350, 'walker'],
            [3750, 'walker'], [3950, 'jumper'],
            [4400, 'walker'], [4550, 'walker'],
            [4950, 'jumper'], [5100, 'walker'],
            [5500, 'walker'], [5650, 'jumper'],
            [6000, 'walker'], [6200, 'walker'], [6300, 'jumper']
        ],
        coins: [
            [100, 530], [160, 530], [220, 530],
            [670, 460], [890, 450], [990, 380], [1090, 310],
            [1210, 460], [1440, 450], [1540, 390], [1640, 330], [1740, 270],
            [1760, 460], [1990, 450], [2100, 390], [2210, 330], [2320, 270],
            [2410, 460], [2640, 450], [2740, 390], [2840, 330], [2940, 270],
            [2960, 460], [3190, 450], [3290, 390], [3390, 330],
            [3510, 460], [3740, 450], [3850, 390], [3960, 330], [4070, 270],
            [4160, 460], [4390, 450], [4500, 390], [4600, 330],
            [4710, 460], [4940, 450], [5050, 390], [5160, 330],
            [6000, 530], [6060, 530], [6120, 530], [6180, 530]
        ],
        powerups: [
            [1700, 270, 'camera'],
            [2900, 270, 'coffee'],
            [3350, 280, 'ai'],
            [4030, 270, 'wacom']
        ],
        portals: [
            {
                x: 2290, y: 264,
                room: {
                    width: 1000,
                    platforms: [
                        [0, 520, 200], [250, 430, 80], [400, 350, 80], [550, 270, 80],
                        [700, 350, 80], [800, 430, 80], [800, 520, 200],
                        [370, 190, 100]
                    ],
                    coins: [
                        [50, 470], [100, 470], [270, 380], [420, 300], [570, 220],
                        [720, 300], [820, 380], [850, 470], [900, 470],
                        [390, 140], [440, 140]
                    ],
                    time: 10
                }
            },
            {
                x: 5130, y: 324,
                room: {
                    width: 600,
                    platforms: [[0, 520, 600], [100, 420, 80], [260, 330, 80], [420, 420, 80], [220, 240, 100]],
                    coins: [[120, 370], [280, 280], [440, 370], [240, 190], [300, 190], [50, 470], [100, 470], [450, 470], [500, 470]],
                    time: 10
                }
            }
        ],
        flagX: 6300
    },

    // ========== LEVEL 4: Revize Cehennemi (Very Hard) ==========
    {
        name: "Revize Cehennemi",
        width: 7000,
        groundY: 580,
        ground: [
            [0, 500],
            [650, 350],
            [1150, 350],
            [1650, 400],
            [2200, 350],
            [2700, 400],
            [3250, 350],
            [3750, 400],
            [4300, 350],
            [4800, 350],
            [5300, 400],
            [5850, 350],
            [6350, 650]
        ],
        floating: [
            // Gap 1: 0→1 (500-650) small platforms
            [530, 510, 60, 'spikes'], [610, 470, 60],
            // Steps from ground1
            [740, 500, 60], [830, 440, 60], [920, 380, 60], [1010, 320, 70],
            // Gap 2: 1→2 (1000-1150)
            [1030, 510, 60, 'trampoline'], [1110, 470, 60],
            // Steps from ground2
            [1240, 500, 60], [1340, 440, 55], [1440, 380, 55], [1540, 320, 60],
            // Gap 3: 2→3 (1500-1650)
            [1530, 510, 60, 'spikes'], [1610, 470, 60],
            // Steps from ground3
            [1750, 500, 55], [1850, 440, 55], [1950, 380, 55], [2050, 320, 60],
            // Gap 4: 3→4 (2050-2200)
            [2080, 510, 55, 'trampoline'], [2160, 470, 55],
            // Steps from ground4
            [2300, 500, 55], [2400, 440, 50], [2500, 380, 50], [2600, 320, 55],
            // Gap 5: 4→5 (2550-2700)
            [2580, 510, 55, 'spikes'], [2660, 470, 55],
            // Steps from ground5
            [2800, 500, 50], [2900, 440, 50], [3000, 380, 55], [3100, 320, 55],
            // Gap 6: 5→6 (3100-3250)
            [3130, 510, 55, 'trampoline'], [3210, 470, 55],
            // Steps from ground6
            [3350, 500, 50], [3450, 440, 50], [3550, 380, 55],
            // Gap 7: 6→7 (3600-3750)
            [3630, 510, 55, 'spikes'], [3710, 470, 55],
            // Steps from ground7
            [3850, 500, 50], [3950, 440, 50], [4050, 380, 55], [4150, 320, 55],
            // Gap 8: 7→8 (4150-4300)
            [4180, 510, 55, 'trampoline'], [4260, 470, 55],
            // Steps from ground8
            [4400, 500, 50], [4500, 440, 50], [4600, 380, 55],
            // Gap 9: 8→9 (4650-4800)
            [4680, 510, 55, 'spikes'], [4760, 470, 55],
            // Steps from ground9
            [4900, 500, 50], [5000, 440, 50], [5100, 380, 55],
            // Gap 10: 9→10 (5150-5300)
            [5180, 510, 55, 'trampoline'], [5260, 470, 55],
            // Steps from ground10
            [5400, 500, 50], [5500, 440, 50], [5600, 380, 55], [5700, 320, 55],
            // Gap 11: 10→11 (5700-5850)
            [5730, 510, 55, 'spikes'], [5810, 470, 55],
            // Steps from ground11 to final
            [5950, 500, 50], [6050, 440, 50], [6150, 380, 55],
            // Gap 12: 11→12 (6200-6350)
            [6230, 510, 55, 'trampoline'], [6310, 470, 55]
        ],
        enemies: [
            [300, 'walker'], [420, 'jumper'],
            [780, 'walker'], [900, 'jumper'],
            [1280, 'walker'], [1400, 'walker'],
            [1790, 'jumper'], [1900, 'walker'],
            [2340, 'walker'], [2480, 'jumper'],
            [2840, 'walker'], [2980, 'walker'],
            [3390, 'jumper'], [3520, 'walker'],
            [3890, 'walker'], [4020, 'jumper'],
            [4440, 'walker'], [4570, 'walker'],
            [4940, 'jumper'], [5070, 'walker'],
            [5440, 'walker'], [5580, 'jumper'],
            [5990, 'walker'], [6120, 'jumper'],
            [6500, 'walker'], [6600, 'jumper'], [6700, 'walker']
        ],
        coins: [
            [100, 530], [160, 530],
            [570, 460], [780, 450], [870, 390], [960, 330], [1050, 270],
            [1070, 460], [1280, 450], [1380, 390], [1480, 330], [1580, 270],
            [1570, 460], [1790, 450], [1890, 390], [1990, 330], [2090, 270],
            [2120, 460], [2340, 450], [2440, 390], [2540, 330], [2640, 270],
            [2620, 460], [2840, 450], [2940, 390], [3040, 330], [3140, 270],
            [3170, 460], [3390, 450], [3490, 390], [3590, 330],
            [3670, 460], [3890, 450], [3990, 390], [4090, 330], [4190, 270],
            [6450, 530], [6510, 530], [6570, 530], [6630, 530]
        ],
        powerups: [
            [1010, 270, 'camera'],
            [2600, 270, 'coffee'],
            [4150, 270, 'wacom'],
            [4900, 300, 'ai'],
            [5700, 270, 'coffee']
        ],
        portals: [
            {
                x: 3100, y: 264,
                room: {
                    width: 1000,
                    platforms: [
                        [0, 520, 150], [200, 430, 70], [330, 350, 70], [460, 270, 70],
                        [590, 350, 70], [720, 430, 70], [850, 520, 150],
                        [380, 190, 100]
                    ],
                    coins: [
                        [30, 470], [80, 470], [220, 380], [350, 300], [480, 220],
                        [610, 300], [740, 380], [880, 470], [930, 470],
                        [400, 140], [450, 140]
                    ],
                    time: 10
                }
            }
        ],
        flagX: 6800
    },

    // ========== LEVEL 5: Final Teslim (Ultra Hard) ==========
    {
        name: "Final Teslim",
        width: 7500,
        groundY: 580,
        ground: [
            [0, 450],
            [600, 300],
            [1050, 300],
            [1500, 350],
            [2000, 300],
            [2450, 350],
            [2950, 300],
            [3400, 350],
            [3900, 300],
            [4350, 350],
            [4850, 300],
            [5300, 350],
            [5800, 300],
            [6250, 350],
            [6750, 750]
        ],
        floating: [
            // Gap 1: 0→1 (450-600)
            [480, 510, 55, 'spikes'], [550, 470, 55],
            // Steps from ground1
            [690, 500, 55], [790, 440, 50], [890, 380, 50], [960, 320, 55],
            // Gap 2: 1→2 (900-1050)
            [930, 510, 55, 'trampoline'], [1010, 470, 55],
            // Steps from ground2
            [1140, 500, 50], [1240, 440, 50], [1340, 380, 55],
            // Gap 3: 2→3 (1350-1500)
            [1380, 510, 55, 'spikes'], [1460, 470, 55],
            // Steps from ground3
            [1590, 500, 50], [1690, 440, 50], [1790, 380, 50], [1890, 320, 55],
            // Gap 4: 3→4 (1850-2000)
            [1880, 510, 50, 'trampoline'], [1960, 470, 50],
            // Steps from ground4
            [2090, 500, 50], [2190, 440, 50], [2290, 380, 50],
            // Gap 5: 4→5 (2300-2450)
            [2330, 510, 50, 'spikes'], [2410, 470, 50],
            // Steps from ground5
            [2540, 500, 50], [2640, 440, 45], [2740, 380, 45], [2840, 320, 50],
            // Gap 6: 5→6 (2800-2950)
            [2830, 510, 50, 'trampoline'], [2910, 470, 50],
            // Steps from ground6
            [3040, 500, 50], [3140, 440, 45], [3240, 380, 50],
            // Gap 7: 6→7 (3250-3400)
            [3280, 510, 50, 'spikes'], [3360, 470, 50],
            // Steps from ground7
            [3490, 500, 50], [3590, 440, 45], [3690, 380, 45], [3790, 320, 50],
            // Gap 8: 7→8 (3750-3900)
            [3780, 510, 50, 'trampoline'], [3860, 470, 50],
            // Steps from ground8
            [3990, 500, 45], [4090, 440, 45], [4190, 380, 50],
            // Gap 9: 8→9 (4200-4350)
            [4230, 510, 50, 'spikes'], [4310, 470, 50],
            // Steps from ground9
            [4440, 500, 45], [4540, 440, 45], [4640, 380, 45], [4740, 320, 50],
            // Gap 10: 9→10 (4700-4850)
            [4730, 510, 50, 'trampoline'], [4810, 470, 50],
            // Steps from ground10
            [4940, 500, 45], [5040, 440, 45], [5140, 380, 50],
            // Gap 11: 10→11 (5150-5300)
            [5180, 510, 50, 'spikes'], [5260, 470, 50],
            // Steps from ground11
            [5390, 500, 45], [5490, 440, 45], [5590, 380, 45], [5690, 320, 50],
            // Gap 12: 11→12 (5650-5800)
            [5680, 510, 50, 'trampoline'], [5760, 470, 50],
            // Steps from ground12
            [5890, 500, 45], [5990, 440, 45], [6090, 380, 50],
            // Gap 13: 12→13 (6100-6250)
            [6130, 510, 50, 'spikes'], [6210, 470, 50],
            // Steps from ground13 to final
            [6340, 500, 50], [6440, 440, 50], [6540, 380, 50],
            // Gap 14: 13→14 (6600-6750)
            [6630, 510, 50, 'trampoline'], [6710, 470, 50],
            // Boss Battle Arena Platforms
            [6800, 460, 80, 'trampoline'], [6920, 360, 80, 'trampoline'], [7040, 260, 100, 'floating'], [7160, 360, 80, 'trampoline'], [7240, 460, 80, 'trampoline']
        ],
        enemies: [
            [280, 'walker'], [380, 'jumper'],
            [730, 'walker'], [870, 'jumper'],
            [1180, 'walker'], [1320, 'walker'],
            [1630, 'jumper'], [1770, 'walker'],
            [2130, 'walker'], [2270, 'jumper'],
            [2580, 'walker'], [2720, 'jumper'],
            [3080, 'walker'], [3220, 'walker'],
            [3530, 'jumper'], [3670, 'walker'],
            [4030, 'walker'], [4170, 'jumper'],
            [4480, 'walker'], [4620, 'jumper'],
            [4980, 'walker'], [5120, 'walker'],
            [5430, 'jumper'], [5570, 'walker'],
            [5930, 'walker'], [6070, 'jumper'],
            [6380, 'walker'], [6520, 'walker'],
            [6850, 'walker'], [6950, 'jumper'], [7050, 'walker'], [7200, 'jumper']
        ],
        coins: [
            [100, 530], [160, 530],
            [520, 460], [730, 450], [830, 390], [930, 330],
            [970, 460], [1180, 450], [1280, 390], [1380, 330],
            [1420, 460], [1630, 450], [1730, 390], [1830, 330], [1930, 270],
            [1920, 460], [2130, 450], [2230, 390], [2330, 330],
            [2370, 460], [2580, 450], [2680, 390], [2780, 330], [2880, 270],
            [2870, 460], [3080, 450], [3180, 390], [3280, 330],
            [3320, 460], [3530, 450], [3630, 390], [3730, 330], [3830, 270],
            [4270, 460], [4480, 450], [4580, 390], [4680, 330], [4780, 270],
            [6850, 530], [6910, 530], [6970, 530], [7030, 530], [7090, 530]
        ],
        powerups: [
            [960, 270, 'camera'],
            [1890, 270, 'coffee'],
            [2840, 270, 'wacom'],
            [3490, 250, 'ai'],
            [3790, 270, 'camera'],
            [4740, 270, 'coffee'],
            [5690, 270, 'wacom']
        ],
        portals: [
            {
                x: 2290, y: 324,
                room: {
                    width: 1000,
                    platforms: [
                        [0, 520, 120], [170, 430, 65], [300, 350, 65], [430, 270, 65],
                        [560, 190, 70], [690, 270, 65], [820, 350, 65], [880, 520, 120],
                        [470, 110, 80]
                    ],
                    coins: [
                        [30, 470], [70, 470], [190, 380], [320, 300], [450, 220],
                        [580, 140], [710, 220], [840, 300], [910, 470], [950, 470],
                        [490, 60], [530, 60]
                    ],
                    time: 10
                }
            },
            {
                x: 5140, y: 324,
                room: {
                    width: 700,
                    platforms: [
                        [0, 520, 180], [230, 420, 65], [360, 330, 65], [490, 420, 65],
                        [520, 520, 180], [310, 240, 80]
                    ],
                    coins: [
                        [40, 470], [90, 470], [250, 370], [380, 280], [510, 370],
                        [560, 470], [610, 470], [330, 190], [370, 190]
                    ],
                    time: 10
                }
            }
        ],
        flagX: 7300
    }
];

// ==========================================
// LEVEL LOADER
// ==========================================
function loadLevel(levelNum) {
    if (levelNum > 1 && levelNum % 5 === 0) {
        lives += 2;
        // Play powerup chiptune sound
        setTimeout(() => sound.play('powerup'), 100);
        screenShake = 10;
        spawnFloatingText(player.x + 20, player.y - 40, '+2 CAN ONAYLANDI!', '#ff3366');
    }

    platforms = [];
    enemies = [];
    sdCards = [];
    powerUps = [];
    portals = [];
    clouds = [];
    particles = [];
    floatingTexts = [];
    skillOrbs = [];
    playerProjectiles = [];
    inSecretDimension = false;
    powerUp.camera = 0;
    powerUp.coffee = 0;
    powerUp.wacom = 0;
    powerUp.ai = 0;
    powerUp.type = null;
    powerUp.timer = 0;

    // Reset boss, lasers, helper
    boss = null;
    bossActive = false;
    bossDefeated = false;
    lasers = [];
    aiHelperInstance = null;

    // Populate weather particles based on levelNum
    weatherParticles = [];
    let density = 0;
    if (levelNum === 1) density = 45;
    else if (levelNum === 2) density = 60;
    else if (levelNum === 3) density = 40;
    else if (levelNum === 4) density = 25;
    else if (levelNum === 5) density = 65;

    for (let i = 0; i < density; i++) {
        weatherParticles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            speedX: levelNum === 5 ? -(3 + Math.random() * 4) : levelNum === 2 ? -2 : 0,
            speedY: levelNum === 1 ? 1 + Math.random() * 2 : levelNum === 2 ? 6 + Math.random() * 4 : levelNum === 3 ? -(0.5 + Math.random() * 1.5) : levelNum === 5 ? 2 + Math.random() * 3 : 0,
            size: levelNum === 3 ? 2 + Math.random() * 3 : 1 + Math.random() * 2,
            char: levelNum === 1 ? (Math.random() < 0.5 ? '0' : '1') : '',
            color: levelNum === 1 ? 'rgba(0, 255, 68, ' + (0.15 + Math.random() * 0.4) + ')' : levelNum === 2 ? 'rgba(100, 200, 255, 0.4)' : levelNum === 3 ? 'rgba(255, 120, 0, ' + (0.2 + Math.random() * 0.5) + ')' : levelNum === 5 ? 'rgba(0, 240, 255, ' + (0.2 + Math.random() * 0.5) + ')' : '#fff'
        });
    }

    const data = LEVEL_DATA[Math.min(levelNum - 1, LEVEL_DATA.length - 1)];
    levelWidth = data.width;
    const gy = data.groundY;

    // Ground
    for (const gd of data.ground) {
        const x = gd[0], w = gd[1], type = gd[2] || 'ground';
        platforms.push({ x, y: gy, width: w, height: 60, type });
    }

    // Floating platforms
    for (const fp of data.floating) {
        const x = fp[0], y = fp[1], w = fp[2], type = fp[3] || 'floating';
        platforms.push({ x, y, width: w, height: 16, type });
    }

    // Enemies
    for (const [x, type] of data.enemies) {
        let ey = gy - 52;
        for (const p of platforms) {
            if (x >= p.x && x <= p.x + p.width) {
                ey = p.y - 52;
                break;
            }
        }
        enemies.push(new Enemy(x, ey, type));
    }

    // SD Cards
    for (const [x, y] of data.coins) {
        sdCards.push(new SDCard(x, y));
    }

    // Power-ups
    for (const [x, y, type] of data.powerups) {
        powerUps.push(new PowerUpItem(x, y, type));
    }

    // Skill Orbs (Auto-placed, colored by character)
    const activeChar = CHARACTERS[selectedCharIndex];
    if (activeChar && activeChar.orbColor) {
        let numOrbs = levelNum === 1 ? 2 : levelNum === 2 ? 2 : 1;
        for (let i = 1; i <= numOrbs; i++) {
            const xPos = (levelWidth / (numOrbs + 1)) * i;
            skillOrbs.push(new SkillOrb(xPos + (Math.random() * 200 - 100), gy - 80 - Math.random() * 80, activeChar.orbColor));
        }
    }

    // Portals
    for (const pd of data.portals) {
        portals.push(new Portal(pd.x, pd.y, pd.room));
    }

    // Finish flag
    finishFlag = new FinishFlag(data.flagX, gy - 130);

    // Clouds
    for (let i = 0; i < 20; i++) {
        clouds.push({
            x: Math.random() * levelWidth * 1.5,
            y: 15 + Math.random() * 120,
            width: 50 + Math.random() * 90,
            opacity: 0.15 + Math.random() * 0.2
        });
    }

    showLevelName(data.name);
}

// Secret dimension loader
let secretPlatforms = [];
let secretCoins = [];
let secretTimer = 0;

function enterSecretDimension(portal) {
    sound.play('portal');
    portalTransitionAlpha = 0;
    portalTransitionDir = 1;
    pendingPortal = portal;
    // Deactivate portal immediately so it can't be re-entered
    portal.active = false;
    gameState = GameState.PORTAL;
}

function doEnterSecret() {
    const room = pendingPortal.targetDimension;
    secretReturnX = player.x;
    secretReturnY = player.y;
    inSecretDimension = true;
    secretTimer = Math.min(10, room.time) * 1000;

    // Store main level state
    window._mainPlatforms = platforms;
    window._mainEnemies = enemies;
    window._mainSdCards = sdCards;
    window._mainPowerUps = powerUps;
    window._mainPortals = portals;
    window._mainSkillOrbs = skillOrbs;
    window._mainFinishFlag = finishFlag;
    window._mainLevelWidth = levelWidth;
    window._mainCameraX = cameraX;

    // Load secret room
    platforms = [];
    enemies = [];
    sdCards = [];
    powerUps = [];
    portals = [];
    skillOrbs = [];
    finishFlag = null;

    levelWidth = room.width;
    for (const [x, y, w] of room.platforms) {
        platforms.push({ x, y, width: w, height: 16, type: y > 500 ? 'ground' : 'floating' });
    }
    for (const [x, y] of room.coins) {
        sdCards.push(new SDCard(x, y));
    }

    // Auto-spawn Ctrl+Z shield above the highest floating platform in the secret room
    let highestPlat = null;
    let minY = 999;
    for (const p of platforms) {
        if (p.type === 'floating' && p.y < minY) {
            minY = p.y;
            highestPlat = p;
        }
    }
    if (highestPlat) {
        powerUps.push(new PowerUpItem(highestPlat.x + highestPlat.width / 2 - 16, highestPlat.y - 45, 'undoshield'));
    } else {
        powerUps.push(new PowerUpItem(room.width / 2 - 16, 200, 'undoshield'));
    }

    player.x = 50;
    player.y = 400;
    player.vx = 0;
    player.vy = 0;
    player.lastSafeX = 50;
    player.lastSafeY = 400;
    cameraX = 0;
}

function exitSecretDimension() {
    sound.play('portal');
    inSecretDimension = false;

    platforms = window._mainPlatforms;
    enemies = window._mainEnemies;
    sdCards = window._mainSdCards;
    powerUps = window._mainPowerUps;
    portals = window._mainPortals;
    skillOrbs = window._mainSkillOrbs;
    finishFlag = window._mainFinishFlag;
    levelWidth = window._mainLevelWidth;
    cameraX = window._mainCameraX;

    player.x = secretReturnX;
    player.y = secretReturnY - 10;
    player.vx = 0;
    player.vy = 0;
}

// Level name display
let levelNameDisplay = { text: '', alpha: 0, timer: 0, subtext: '' };
function showLevelName(name) {
    levelNameDisplay = { text: `LEVEL ${currentLevel}`, subtext: name, alpha: 1, timer: 3000 };
}

// ==========================================
// COLLISION
// ==========================================
function checkCollisions() {
    // SD Cards
    for (const card of sdCards) {
        if (card.collected) continue;
        if (player.x + player.width > card.x + 4 && player.x < card.x + card.width - 4 &&
            player.y + player.height > card.y + 4 && player.y < card.y + card.height - 4) {
            card.collected = true;
            sdCardsCollected++;
            score += 100;
            gameDeadlineTimer += 2000; // +2 seconds
            sound.play('coin');
            spawnParticles(card.x + 14, card.y + 14, 10, '#3388ff', 'burst');
            spawnFloatingText(card.x, card.y, '+2s', '#fff');
            updateHUD();
        }
    }

    // Skill Orbs
    for (const orb of skillOrbs) {
        if (orb.collected) continue;
        if (player.x + player.width > orb.x && player.x < orb.x + orb.width &&
            player.y + player.height > orb.y && player.y < orb.y + orb.height) {
            orb.collected = true;
            player.skillCharges++;
            score += 50;
            gameDeadlineTimer += 4000; // +4 seconds
            sound.play('powerup');
            spawnParticles(orb.x + 12, orb.y + 12, 15, orb.color.hex, 'burst');
            spawnFloatingText(orb.x, orb.y - 10, '+4s', orb.color.hex);
            updateHUD();
        }
    }

    // Power-ups
    for (const pu of powerUps) {
        if (pu.collected) continue;
        if (player.x + player.width > pu.x && player.x < pu.x + pu.width &&
            player.y + player.height > pu.y && player.y < pu.y + pu.height) {
            pu.collected = true;
            activatePowerUp(pu.type);
            updateHUD();
        }
    }

    // Portals (press down arrow to enter) - only if not already in secret dimension and portal is active (one-use only)
    if (!inSecretDimension && isPressed('DOWN')) {
        for (const portal of portals) {
            if (!portal.active) continue;
            if (player.x + player.width > portal.x && player.x < portal.x + portal.width &&
                player.y + player.height > portal.y && player.y < portal.y + portal.height) {
                enterSecretDimension(portal);
                break;
            }
        }
    }

    // Spike Hazards collision check
    if (player.invincible <= 0 && powerUp.camera <= 0 && !player.isDashing && !player.shieldActive) {
        for (const p of platforms) {
            if (p.type === 'spikes') {
                if (player.x + player.width > p.x + 4 && player.x < p.x + p.width - 4 &&
                    player.y + player.height > p.y && player.y < p.y + p.height - 4) {
                    player.die();
                    break;
                }
            }
        }
    }

    // Player Projectile - Enemy collision
    for (const p of playerProjectiles) {
        if (!p.active) continue;
        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            if (p.x + p.width > enemy.x && p.x < enemy.x + enemy.width &&
                p.y + p.height > enemy.y && p.y < enemy.y + enemy.height) {
                p.active = false;
                enemy.alive = false;
                score += 200;
                gameDeadlineTimer += 3000;
                sound.play('hit');
                spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 15, '#00ff88', 'burst');
                if (typeof updateHUD === 'function') updateHUD();
                break;
            }
        }
    }

    // Player Projectile - Boss collision
    if (bossActive && boss && boss.state !== 'defeat') {
        for (const p of playerProjectiles) {
            if (!p.active) continue;
            if (p.x + p.width > boss.x && p.x < boss.x + boss.width &&
                p.y + p.height > boss.y && p.y < boss.y + boss.height) {
                p.active = false;
                boss.takeDamage();
            }
        }
    }

    // Deflected Boss Projectile - Boss collision
    if (bossActive && boss && boss.state !== 'defeat') {
        for (const p of boss.projectiles) {
            if (p.active && p.deflected) {
                if (p.x + p.width > boss.x && p.x < boss.x + boss.width &&
                    p.y + p.height > boss.y && p.y < boss.y + boss.height) {
                    p.active = false;
                    boss.takeDamage();
                }
            }
        }
    }

    // Laser - Enemy collision
    for (const l of lasers) {
        if (!l.active) continue;
        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            if (l.x + l.width > enemy.x && l.x < enemy.x + enemy.width &&
                l.y + l.height > enemy.y && l.y < enemy.y + enemy.height) {
                l.active = false;
                enemy.alive = false;
                score += 200;
                gameDeadlineTimer += 3000; // +3 seconds
                sound.play('stomp');
                spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 15, '#00f0ff', 'burst');
                spawnFloatingText(enemy.x + enemy.width / 2, enemy.y, '+3s', '#00f0ff');
                updateHUD();
                break;
            }
        }
    }

    // Laser - Boss collision
    if (bossActive && boss) {
        for (const l of lasers) {
            if (!l.active) continue;
            if (l.x + l.width > boss.x && l.x < boss.x + boss.width &&
                l.y + l.height > boss.y && l.y < boss.y + boss.height) {
                l.active = false;
                boss.takeDamage();
            }
        }
    }

    // Boss Stomp & Body collision
    if (bossActive && boss && boss.state !== 'defeat') {
        const bLeft = boss.x + 10;
        const bRight = boss.x + boss.width - 10;
        const bTop = boss.y + 10;
        const bBottom = boss.y + boss.height - 5;
        const pLeft = player.x + 8;
        const pRight = player.x + player.width - 8;
        const pTop = player.y + 10;
        const pBottom = player.y + player.height - 2;

        if (pRight > bLeft && pLeft < bRight && pBottom > bTop && pTop < bBottom) {
            const isStomp = (player.vy > 0 && pBottom <= boss.y + boss.height * 0.6) || (player.y + player.height - player.vy <= boss.y + 20);
            if (isStomp) {
                boss.takeDamage();
                player.vy = -12;
                player.scaleY = 0.75;
                player.scaleX = 1.25;
            } else if (player.invincible <= 0 && powerUp.camera <= 0 && !player.isDashing && !player.shieldActive) {
                player.die();
                player.vx = player.x < boss.x ? -6 : 6;
                player.vy = -8;
            }
        }
    }

    // Enemies - tighter hitbox: must actually overlap with the sprite body
    if (player.isDashing || player.shieldActive) {
        // Coder is dashing or UI/UX shield is active: defeat any overlapping enemies
        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            if (player.x + player.width > enemy.x + 4 && player.x < enemy.x + enemy.width - 4 &&
                player.y + player.height > enemy.y + 4 && player.y < enemy.y + enemy.height - 4) {
                enemy.alive = false;
                score += 200;
                gameDeadlineTimer += 3000;
                sound.play('stomp');
                const pColor = player.isDashing ? '#00ff88' : '#00f0ff';
                spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 20, pColor, 'burst');
                spawnFloatingText(enemy.x + enemy.width / 2, enemy.y, '+3s', pColor);
                updateHUD();
            }
        }
    } else if (player.invincible <= 0 && !player.isDashing && !player.shieldActive) {
        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            const eLeft = enemy.x + 15;
            const eRight = enemy.x + enemy.width - 15;
            const eTop = enemy.y + 15;
            const eBottom = enemy.y + enemy.height - 4;
            const pLeft = player.x + 12;
            const pRight = player.x + player.width - 12;
            const pTop = player.y + 10;
            const pBottom = player.y + player.height - 2;

            if (pRight > eLeft && pLeft < eRight && pBottom > eTop && pTop < eBottom) {
                const isStomp = (player.vy > 0 && pBottom <= enemy.y + enemy.height * 0.75) || (player.y + player.height - player.vy <= enemy.y + 12);
                if (isStomp) {
                    enemy.alive = false;
                    player.vy = -10;
                    score += 200;
                    gameDeadlineTimer += 3000;
                    sound.play('stomp');
                    if (CHARACTERS[selectedCharIndex].key === 'modeler') {
                        player.triggerShockwave();
                    } else {
                        spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 15, '#ff4444', 'burst');
                        spawnFloatingText(enemy.x + enemy.width / 2, enemy.y, '+3s', '#ff4444');
                    }
                    updateHUD();
                } else if (powerUp.camera > 0) {
                    enemy.alive = false;
                    score += 300;
                    gameDeadlineTimer += 3000;
                    sound.play('stomp');
                    spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 20, '#ffdd00', 'burst');
                    spawnFloatingText(enemy.x + enemy.width / 2, enemy.y, '+3s', '#ffdd00');
                    updateHUD();
                } else {
                    player.die();
                    player.vx = player.x < enemy.x ? -5 : 5;
                    player.vy = -8;
                }
            }
        }
    }

    // Finish flag
    if (finishFlag && player.x + player.width > finishFlag.x && player.x < finishFlag.x + finishFlag.width &&
        player.y + player.height > finishFlag.y && player.y < finishFlag.y + finishFlag.height) {
        levelComplete();
    }
}

function activatePowerUp(type) {
    if (type === 'undoshield') {
        player.undoShield = true;
        player.lastSafeX = player.x;
        player.lastSafeY = player.y;

        // Show hud
        const undoHUD = document.getElementById('hud-undoshield');
        if (undoHUD) undoHUD.classList.remove('hidden');

        sound.play('powerup');
        spawnParticles(player.x + player.width / 2, player.y + player.height / 2, 20, '#ff33ff', 'burst');
        spawnFloatingText(player.x, player.y - 10, 'CTRL+Z SHIELD!', '#ff33ff');
        return;
    }

    powerUp[type] = PU_DURATIONS[type];
    if (type === 'coffee') powerUp.hasDoubleJumped = false;

    if (type === 'ai' && !aiHelperInstance) {
        aiHelperInstance = new AIHelper(player.x, player.y - 40);
    }

    sound.play('powerup');
    const labels = { camera: '📷 KAMERA!', coffee: '☕ ÇİFT ZIPLA!', wacom: '🖱️ SÜPER HIZ!', ai: '🤖 YAPAY ZEKA!' };
    spawnFloatingText(player.x, player.y - 10, labels[type], '#fff');
}

// ==========================================
// RENDERING
// ==========================================
function drawBackground() {
    let grad;
    if (inSecretDimension) {
        // Secret dimension - different color scheme
        grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#1a002e');
        grad.addColorStop(0.3, '#2e004e');
        grad.addColorStop(0.6, '#4a0066');
        grad.addColorStop(1, '#300040');
    } else {
        grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#0a0a2e');
        grad.addColorStop(0.3, '#1a1a4e');
        grad.addColorStop(0.6, '#2d2066');
        grad.addColorStop(1, '#1a1040');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars
    for (let i = 0; i < 80; i++) {
        const sx = ((i * 137 + 50) % canvas.width + cameraX * 0.03) % canvas.width;
        const sy = (i * 89 + 30) % (canvas.height * 0.5);
        const twinkle = 0.3 + Math.sin(gameTime * 0.002 + i * 1.7) * 0.4;
        ctx.fillStyle = inSecretDimension ? `rgba(200,100,255,${twinkle})` : `rgba(255,255,255,${twinkle})`;
        ctx.fillRect(sx, sy, (i % 3 === 0) ? 2 : 1, (i % 3 === 0) ? 2 : 1);
    }

    if (!inSecretDimension) {
        // Moon
        ctx.fillStyle = '#ffeedd';
        ctx.beginPath(); ctx.arc(canvas.width - 100 + cameraX * 0.01, 80, 35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0a0a2e';
        ctx.beginPath(); ctx.arc(canvas.width - 88 + cameraX * 0.01, 75, 30, 0, Math.PI * 2); ctx.fill();

        // Clouds
        for (const cloud of clouds) {
            const cx2 = ((cloud.x - cameraX * 0.15) % (canvas.width + 300)) - 100;
            if (cx2 < -200 || cx2 > canvas.width + 200) continue;
            ctx.fillStyle = `rgba(180, 170, 220, ${cloud.opacity})`;
            ctx.beginPath();
            ctx.arc(cx2, cloud.y, cloud.width * 0.25, 0, Math.PI * 2);
            ctx.arc(cx2 + cloud.width * 0.2, cloud.y - 8, cloud.width * 0.2, 0, Math.PI * 2);
            ctx.arc(cx2 + cloud.width * 0.45, cloud.y, cloud.width * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Mountains
        ctx.fillStyle = '#15103a';
        ctx.beginPath(); ctx.moveTo(0, canvas.height);
        for (let x = 0; x <= canvas.width; x += 40) {
            const h = 120 + Math.sin((x + cameraX * 0.05) * 0.008) * 60 + Math.sin((x + cameraX * 0.05) * 0.015) * 30;
            ctx.lineTo(x, canvas.height - h);
        }
        ctx.lineTo(canvas.width, canvas.height); ctx.fill();
        ctx.fillStyle = '#1d1548';
        ctx.beginPath(); ctx.moveTo(0, canvas.height);
        for (let x = 0; x <= canvas.width; x += 30) {
            const h = 80 + Math.sin((x + cameraX * 0.1) * 0.012) * 40;
            ctx.lineTo(x, canvas.height - h);
        }
        ctx.lineTo(canvas.width, canvas.height); ctx.fill();

        // Draw weather
        updateAndDrawWeather(deltaTime);
    } else {
        // Secret dimension swirl patterns
        for (let i = 0; i < 8; i++) {
            const a = gameTime * 0.001 + i * 0.8;
            const rx = canvas.width / 2 + Math.cos(a) * 300;
            const ry = canvas.height / 2 + Math.sin(a) * 200;
            ctx.fillStyle = `rgba(160, 60, 255, 0.08)`;
            ctx.beginPath(); ctx.arc(rx, ry, 80 + Math.sin(gameTime * 0.002 + i) * 30, 0, Math.PI * 2); ctx.fill();
        }
    }
}

function updateAndDrawWeather(dt) {
    if (inSecretDimension) return;
    ctx.save();

    const levelNum = currentLevel;

    for (const p of weatherParticles) {
        if (levelNum === 4) {
            if (Math.random() < 0.01) {
                ctx.fillStyle = 'rgba(160, 64, 255, 0.03)';
                ctx.fillRect(0, Math.random() * canvas.height, canvas.width, 5 + Math.random() * 20);
            }
            continue;
        }

        p.y += p.speedY * (dt / 16);
        p.x += p.speedX * (dt / 16);

        if (p.y > canvas.height) { p.y = 0; p.x = Math.random() * canvas.width; }
        if (p.y < 0) { p.y = canvas.height; p.x = Math.random() * canvas.width; }
        if (p.x > canvas.width) p.x = 0;
        if (p.x < 0) p.x = canvas.width;

        ctx.fillStyle = p.color;
        if (p.char !== '') {
            ctx.font = '8px monospace';
            ctx.fillText(p.char, p.x, p.y);
            if (Math.random() < 0.05) p.char = Math.random() < 0.5 ? '0' : '1';
        } else if (levelNum === 2) {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - 3, p.y + 10);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

function drawPlatforms() {
    for (const p of platforms) {
        const sx = p.x - cameraX;
        if (sx > canvas.width + 10 || sx + p.width < -10) continue;

        if (p.type === 'ground') {
            ctx.fillStyle = inSecretDimension ? '#2a1540' : '#3d2b1f';
            ctx.fillRect(sx, p.y, p.width, p.height);
            const gc = ctx.createLinearGradient(sx, p.y, sx, p.y + 12);
            gc.addColorStop(0, inSecretDimension ? '#8040c0' : '#5cb85c');
            gc.addColorStop(1, inSecretDimension ? '#5020a0' : '#3d8040');
            ctx.fillStyle = gc;
            ctx.fillRect(sx, p.y, p.width, 12);
            ctx.fillStyle = inSecretDimension ? '#a060e0' : '#6dd06d';
            for (let i = 0; i < p.width; i += 20) {
                const h = 3 + Math.sin(i * 0.5) * 2;
                ctx.fillRect(sx + i, p.y - h, 4, h);
            }
            ctx.fillStyle = inSecretDimension ? '#9050d0' : '#7ae07a';
            ctx.fillRect(sx, p.y, p.width, 2);
        } else if (p.type === 'spikes') {
            ctx.save();
            ctx.fillStyle = '#cc0000';
            ctx.fillRect(sx, p.y + 10, p.width, p.height - 10);
            ctx.fillStyle = '#990000';
            for (let i = 0; i < p.width; i += 16) {
                ctx.beginPath();
                ctx.moveTo(sx + i, p.y + 16);
                ctx.lineTo(sx + i + 8, p.y);
                ctx.lineTo(sx + i + 16, p.y + 16);
                ctx.fill();
            }
            ctx.fillStyle = '#ff4444';
            for (let i = 0; i < p.width; i += 16) {
                ctx.beginPath();
                ctx.moveTo(sx + i + 4, p.y + 8);
                ctx.lineTo(sx + i + 8, p.y);
                ctx.lineTo(sx + i + 12, p.y + 8);
                ctx.fill();
            }
            ctx.restore();
        } else if (p.type === 'trampoline') {
            ctx.save();
            ctx.fillStyle = '#7b1fa2';
            ctx.fillRect(sx, p.y + 6, p.width, p.height - 6);
            ctx.fillStyle = '#e040fb';
            ctx.fillRect(sx + 4, p.y, p.width - 8, 6);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            for (let i = 8; i < p.width - 8; i += 16) {
                ctx.beginPath();
                ctx.moveTo(sx + i, p.y + 6);
                ctx.lineTo(sx + i + 4, p.y + 11);
                ctx.lineTo(sx + i + 8, p.y + 6);
                ctx.stroke();
            }
            ctx.restore();
        } else {
            const bg = ctx.createLinearGradient(sx, p.y, sx, p.y + p.height);
            if (inSecretDimension) {
                bg.addColorStop(0, '#6020a0');
                bg.addColorStop(1, '#401088');
            } else {
                bg.addColorStop(0, '#8b6914');
                bg.addColorStop(1, '#6b5010');
            }
            ctx.fillStyle = bg;
            ctx.fillRect(sx, p.y, p.width, p.height);
            ctx.fillStyle = inSecretDimension ? '#9040d0' : '#5a4008';
            for (let i = 0; i < p.width; i += 20) ctx.fillRect(sx + i, p.y, 1, p.height);
            ctx.fillRect(sx, p.y + p.height / 2, p.width, 1);
            ctx.fillStyle = inSecretDimension ? '#a060e0' : '#c49a30';
            ctx.fillRect(sx, p.y, p.width, 2);
            ctx.fillStyle = inSecretDimension ? '#401088' : '#4a3808';
            ctx.fillRect(sx, p.y + p.height - 2, p.width, 2);
        }
    }
}

// ==========================================
// GAME FLOW
// ==========================================
const player = new Player();

function startGame() {
    gameState = GameState.PLAYING;
    const char = CHARACTERS[selectedCharIndex];
    score = 0;
    sdCardsCollected = 0;
    lives = char.maxLives;
    currentLevel = 1;
    gameDeadlineTimer = 40000; // 40 seconds
    cameraX = 0;
    bossActive = false;
    boss = null;
    lasers = [];
    aiHelperInstance = null;
    powerUp = { camera: 0, coffee: 0, wacom: 0, ai: 0, hasDoubleJumped: false };

    // Load active character sprites into global playerSprites reference
    Object.assign(playerSprites, playerSpritesData[char.key]);

    player.reset();

    // Apply character specific attributes
    player.speed = char.speed;
    player.jumpForce = char.jumpForce;
    player.isDashing = false;
    player.dashTimer = 0;
    player.dashCooldown = 0;
    player.undoShield = false;
    player.lastSafeX = 100;
    player.lastSafeY = 400;

    loadLevel(currentLevel);
    hideAllScreens();

    document.getElementById('hud').classList.remove('hidden');
    const prog = document.getElementById('progress-container');
    if (prog) prog.classList.remove('hidden');

    // Enable/disable Coder dash overlay hud indicator
    const hudDash = document.getElementById('hud-dash');
    if (hudDash) {
        if (char.key === 'coder') hudDash.classList.remove('hidden');
        else hudDash.classList.add('hidden');
    }

    // Ensure undoshield hud is hidden on start
    const hudUndo = document.getElementById('hud-undoshield');
    if (hudUndo) hudUndo.classList.add('hidden');

    sound.init();
    sound.startBGM();
    updateHUD();
}

function resetGame() {
    score = 0; sdCardsCollected = 0; lives = 3; currentLevel = 1; cameraX = 0;
    bossActive = false;
    bossDefeated = false;
    boss = null;
    lasers = [];
    aiHelperInstance = null;
    player.reset();
}

function levelComplete() {
    gameState = GameState.LEVELCOMPLETE;
    sound.stopBGM();
    sound.play('levelup');
    score += 1000;
    gameDeadlineTimer += 30000; // +30 seconds
    spawnFloatingText(player.x, player.y - 40, '+30 SÜRE BÜTÇESİ!', '#00ff88');
    showScreen('levelcomplete-screen');
    document.getElementById('level-score').textContent = score;
    document.getElementById('level-sdcards').textContent = sdCardsCollected;
}

function nextLevel() {
    currentLevel++;
    if (currentLevel > LEVEL_DATA.length) {
        // Game won!
        gameState = GameState.GAMEOVER;
        sound.stopBGM();
        showScreen('gameover-screen');
        document.querySelector('.gameover-title').textContent = 'TEBRİKLER! 🎉';
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

        // High score checks
        document.getElementById('gameover-highscore-value').textContent = highscore;
        const newRecordMsg = document.getElementById('new-highscore-msg');
        if (score >= highscore && score > 0) {
            if (newRecordMsg) newRecordMsg.classList.remove('hidden');
        } else {
            if (newRecordMsg) newRecordMsg.classList.add('hidden');
        }
        const startVal = document.getElementById('start-highscore-value');
        if (startVal) startVal.textContent = highscore;
        return;
    }
    cameraX = 0;
    bossActive = false;
    bossDefeated = false;
    boss = null;
    lasers = [];
    aiHelperInstance = null;
    player.reset();
    loadLevel(currentLevel);
    gameState = GameState.PLAYING;
    hideAllScreens();
    document.getElementById('hud').classList.remove('hidden');
    const prog = document.getElementById('progress-container');
    if (prog) prog.classList.remove('hidden');
    sound.startBGM();
    updateHUD();
}

function showScreen(id) {
    hideAllScreens();
    document.getElementById(id).classList.remove('hidden');
    const prog = document.getElementById('progress-container');
    if (prog) prog.classList.add('hidden');
}
function hideAllScreens() { ['start-screen', 'gameover-screen', 'levelcomplete-screen'].forEach(id => document.getElementById(id).classList.add('hidden')); }
let previousScore = 0;
let previousLives = 3;

function updateHUD() {
    const scoreVal = document.getElementById('score-value');
    if (score !== previousScore && scoreVal) {
        if (score > previousScore) {
            scoreVal.classList.remove('hud-pop');
            void scoreVal.offsetWidth; // reflow
            scoreVal.classList.add('hud-pop');
        }
        previousScore = score;
    }
    scoreVal.textContent = score;

    const livesVal = document.getElementById('lives-value');
    if (lives !== previousLives && livesVal) {
        if (lives < previousLives) {
            livesVal.classList.remove('hud-damage');
            void livesVal.offsetWidth; // reflow
            livesVal.classList.add('hud-damage');
        } else if (lives > previousLives) {
            livesVal.classList.remove('hud-pop');
            void livesVal.offsetWidth;
            livesVal.classList.add('hud-pop');
        }
        previousLives = lives;
    }
    livesVal.textContent = '❤️'.repeat(Math.max(0, lives));

    document.getElementById('sdcard-value').textContent = sdCardsCollected;
    document.getElementById('level-value').textContent = currentLevel;

    // High Score checking
    if (score > highscore) {
        highscore = score;
        localStorage.setItem('designer_run_highscore', highscore.toString());
        const highscoreLabel = document.getElementById('hud-highscore');
        if (highscoreLabel) {
            highscoreLabel.style.transform = 'scale(1.2)';
            setTimeout(() => highscoreLabel.style.transform = 'scale(1)', 150);
        }
        const cabVal = document.getElementById('cabinet-highscore-value');
        if (cabVal) cabVal.textContent = highscore.toString().padStart(5, '0');
    }
    const hudVal = document.getElementById('highscore-value');
    if (hudVal) hudVal.textContent = highscore;
}

function initHighScores() {
    highscore = parseInt(localStorage.getItem('designer_run_highscore') || '0');
    const startVal = document.getElementById('start-highscore-value');
    if (startVal) startVal.textContent = highscore;
    const hudVal = document.getElementById('highscore-value');
    if (hudVal) hudVal.textContent = highscore;
    const cabVal = document.getElementById('cabinet-highscore-value');
    if (cabVal) cabVal.textContent = highscore.toString().padStart(5, '0');
}

function updateProgressBar() {
    const progressFill = document.getElementById('progress-fill');
    const progressIcon = document.getElementById('progress-icon');
    if (progressFill && progressIcon && finishFlag) {
        const pct = Math.min(100, Math.max(0, (player.x / finishFlag.x) * 100));
        progressFill.style.width = `${pct}%`;
        progressIcon.style.left = `${pct}%`;
    }
}

function updateCamera() {
    if (bossActive) {
        const targetX = 6400 - canvas.width * 0.1;
        cameraX += (targetX - cameraX) * 0.08;
        cameraX = Math.max(0, Math.min(cameraX, levelWidth - canvas.width));
        return;
    }
    const targetX = player.x - canvas.width * 0.35;
    cameraX += (targetX - cameraX) * 0.08;
    cameraX = Math.max(0, Math.min(cameraX, levelWidth - canvas.width));
}

// ==========================================
// INTRO CUTSCENE
// ==========================================
function drawIntroOfficeBg() {
    const gbg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gbg.addColorStop(0, '#12102e');
    gbg.addColorStop(0.6, '#1d1240');
    gbg.addColorStop(1, '#0c0820');
    ctx.fillStyle = gbg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(100, 60, 180, 0.07)';
    for (let x = 0; x < canvas.width; x += 80) ctx.fillRect(x, 0, 1, canvas.height - 90);
    const winXs = [50, 330, 610];
    for (let i = 0; i < 3; i++) {
        const wx = winXs[i];
        ctx.fillStyle = 'rgba(40, 80, 200, 0.2)';
        ctx.fillRect(wx, 28, 170, 200);
        ctx.strokeStyle = '#3a2860'; ctx.lineWidth = 5; ctx.strokeRect(wx, 28, 170, 200);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(wx + 85, 28); ctx.lineTo(wx + 85, 228); ctx.moveTo(wx, 128); ctx.lineTo(wx + 170, 128); ctx.stroke();
        for (let d = 0; d < 14; d++) {
            const lx = wx + 8 + (d * 19) % 150, ly = 38 + (d * 23) % 175;
            const bright = 0.2 + Math.sin(gameTime * 0.001 + d * 0.8) * 0.12;
            ctx.fillStyle = `rgba(255,200,80,${bright})`; ctx.fillRect(lx, ly, 3, 3);
        }
    }
    const deskXs = [140, 380, 620];
    for (let i = 0; i < 3; i++) {
        const dx = deskXs[i];
        ctx.fillStyle = '#3a2515'; ctx.fillRect(dx, canvas.height - 140, 200, 55);
        ctx.fillStyle = '#4a3020'; ctx.fillRect(dx, canvas.height - 145, 200, 8);
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(dx + 55, canvas.height - 218, 90, 72);
        const sc = ['rgba(0,220,255,0.2)', 'rgba(80,255,80,0.2)', 'rgba(255,180,0,0.2)'][i];
        ctx.fillStyle = sc; ctx.fillRect(dx + 58, canvas.height - 215, 84, 66);
        const codeAlpha = sc.replace('0.2', '0.6');
        ctx.fillStyle = codeAlpha;
        for (let ln = 0; ln < 8; ln++) { const lw = 12 + (i * 7 + ln * 11) % 50; ctx.fillRect(dx + 62, canvas.height - 210 + ln * 8, lw, 2); }
        ctx.fillStyle = '#2a2a2a'; ctx.fillRect(dx + 92, canvas.height - 148, 16, 10); ctx.fillRect(dx + 82, canvas.height - 140, 36, 4);
    }
    ctx.fillStyle = '#1a1028'; ctx.fillRect(0, canvas.height - 90, canvas.width, 90);
    ctx.fillStyle = '#251535'; ctx.fillRect(0, canvas.height - 90, canvas.width, 5);
}

function drawIntroChar(charKey, cx, cy, scale, facing) {
    const sData = playerSpritesData[charKey];
    const frameIdx = Math.floor(gameTime * 0.0015) % sData.idle.length;
    ctx.save();
    ctx.shadowColor = charKey === 'uiux' ? '#7af3ff' : charKey === 'modeler' ? '#81c784' : '#ffb74d';
    ctx.shadowBlur = 12;
    ctx.translate(cx, cy); ctx.scale(facing * scale, scale); ctx.translate(-20, -56);
    ctx.drawImage(sData.idle[frameIdx], 0, 0, 40, 56);
    ctx.restore();
}

function drawIntroRunChar(charKey, cx, cy, scale, facing) {
    const sData = playerSpritesData[charKey];
    const runFrame = Math.floor(gameTime * 0.014) % sData.run.length;
    ctx.save();
    ctx.shadowColor = charKey === 'uiux' ? '#7af3ff' : charKey === 'modeler' ? '#81c784' : '#ffb74d';
    ctx.shadowBlur = 14;
    ctx.translate(cx, cy); ctx.scale(facing * scale, scale); ctx.translate(-20, -56);
    ctx.drawImage(sData.run[runFrame], 0, 0, 40, 56);
    ctx.restore();
}

function drawIntroEnemyAt(cx, cy, scale) {
    const frameIdx = Math.floor(gameTime * 0.007) % 4;
    ctx.save();
    ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 16;
    ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-22, -52);
    ctx.drawImage(enemySprites.walk[frameIdx], 0, 0, 44, 52);
    ctx.restore();
}

function drawIntroBubble(x, y, text, color, t = null, startTime = null) {
    let visibleLines = text.split('\n');
    if (t !== null && startTime !== null) {
        const elapsed = t - startTime;
        if (elapsed < 0) return;
        const charSpeed = 25; // 25ms per character
        const maxChars = Math.min(text.length, Math.floor(elapsed / charSpeed));

        if (speechProgress[text] === undefined) {
            speechProgress[text] = 0;
        }

        if (maxChars > speechProgress[text]) {
            for (let i = speechProgress[text]; i < maxChars; i++) {
                const char = text[i];
                if (char && char !== ' ' && char !== '\n') {
                    sound.play('talk');
                    break;
                }
            }
            speechProgress[text] = maxChars;
        }

        let charAccumulator = 0;
        const lines = text.split('\n');
        visibleLines = [];
        for (const line of lines) {
            if (charAccumulator >= maxChars) break;
            const lineRemaining = maxChars - charAccumulator;
            if (lineRemaining >= line.length) {
                visibleLines.push(line);
                charAccumulator += line.length + 1; // +1 for the newline
            } else {
                visibleLines.push(line.substring(0, lineRemaining));
                charAccumulator += lineRemaining;
            }
        }
    }

    if (visibleLines.length === 0) return;

    ctx.font = '8px "Press Start 2P", monospace';
    let maxW = 0;
    for (const l of visibleLines) maxW = Math.max(maxW, ctx.measureText(l).width);
    if (maxW === 0) return;

    const pad = 14, lh = 19;
    const bw = maxW + pad * 2, bh = visibleLines.length * lh + pad;
    const bx = Math.max(4, Math.min(x - bw / 2, canvas.width - bw - 4));
    const by = y - bh - 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.roundRect(bx + 3, by + 3, bw, bh, 10); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x - 8, by + bh); ctx.lineTo(x, by + bh + 14); ctx.lineTo(x + 8, by + bh);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#111'; ctx.textAlign = 'center';
    for (let i = 0; i < visibleLines.length; i++) ctx.fillText(visibleLines[i], bx + bw / 2, by + pad + i * lh + 5);
    ctx.restore();
}

const INTRO_SLIDES = [
    // ─── Sahne 0: Başlık Kartı ───
    {
        duration: 3400, render(t) {
            const gbg = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gbg.addColorStop(0, '#060412'); gbg.addColorStop(1, '#110d28');
            ctx.fillStyle = gbg; ctx.fillRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < 90; i++) {
                const sx = (i * 179 + 30) % canvas.width, sy = (i * 113 + 20) % (canvas.height * 0.7);
                const tw = 0.1 + Math.sin(gameTime * 0.002 + i * 1.5) * 0.35;
                ctx.fillStyle = `rgba(200,170,255,${tw})`; ctx.fillRect(sx, sy, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
            }
            for (let b = 0; b < 13; b++) {
                const bx2 = b * 76 + (b % 3 === 0 ? 5 : 0), bh2 = 55 + (b * 41) % 80;
                ctx.fillStyle = '#080614'; ctx.fillRect(bx2, canvas.height - 110 - bh2, 70, bh2 + 10);
                for (let wy = 5; wy < bh2 - 10; wy += 14) for (let wx2 = 5; wx2 < 60; wx2 += 14) {
                    if ((b + wy + wx2) % 3 !== 0) {
                        ctx.fillStyle = `rgba(255,200,80,${0.2 + Math.sin(gameTime * 0.001 + b + wy) * 0.1})`;
                        ctx.fillRect(bx2 + wx2, canvas.height - 110 - bh2 + wy, 8, 8);
                    }
                }
                ctx.fillStyle = '#080614';
            }
            const sg = ctx.createLinearGradient(0, canvas.height - 115, 0, canvas.height);
            sg.addColorStop(0, 'rgba(60,30,120,0.4)'); sg.addColorStop(1, 'rgba(10,5,25,0.95)');
            ctx.fillStyle = sg; ctx.fillRect(0, canvas.height - 115, canvas.width, 115);
            const alpha = Math.min(1, t * 0.002);
            ctx.save(); ctx.globalAlpha = alpha;
            ctx.fillStyle = 'rgba(4,0,18,0.88)';
            ctx.beginPath(); ctx.roundRect(canvas.width / 2 - 325, canvas.height / 2 - 92, 650, 165, 14); ctx.fill();
            ctx.strokeStyle = '#6c3fa0'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#b388ff'; ctx.font = '9px "Press Start 2P",monospace'; ctx.textAlign = 'center';
            ctx.fillText('İSTANBUL — KREATİF AJANS OFİSİ', canvas.width / 2, canvas.height / 2 - 50);
            ctx.fillStyle = '#ffffff'; ctx.font = '19px "Press Start 2P",monospace';
            ctx.shadowColor = '#8040ff'; ctx.shadowBlur = 22;
            ctx.fillText('Son Teslim Günü', canvas.width / 2, canvas.height / 2 - 5);
            ctx.fillStyle = '#ffcc00'; ctx.font = '12px "Press Start 2P",monospace';
            ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 12;
            ctx.fillText('⏰  Saat 17:59', canvas.width / 2, canvas.height / 2 + 40);
            ctx.restore();
        }
    },
    // ─── Sahne 1: Üç arkadaş ofiste kutluyor ───
    {
        duration: 6800, render(t) {
            drawIntroOfficeBg();
            const groundY = canvas.height - 90;
            const charXs = [240, 480, 720], charKeys = ['uiux', 'modeler', 'coder'];
            const entryOff = Math.max(0, 1 - t * 0.004) * 65;
            const a = Math.min(1, t * 0.003);
            ctx.save(); ctx.globalAlpha = a;
            for (let i = 0; i < 3; i++) drawIntroChar(charKeys[i], charXs[i], groundY - entryOff, 2.8, 1);
            ctx.restore();
            // İsim etiketleri
            ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center';
            const nData = [
                { n: 'AYŞE', r: 'UI/UX DESIGNER', c: '#7af3ff', x: 240 },
                { n: 'KEREM', r: '3D MODELER', c: '#81c784', x: 480 },
                { n: 'EMRE', r: 'FRONTEND CODER', c: '#ffb74d', x: 720 },
            ];
            for (const nd of nData) {
                ctx.fillStyle = nd.c; ctx.font = '8px "Press Start 2P",monospace'; ctx.fillText(nd.n, nd.x, groundY + 16);
                ctx.fillStyle = '#776688'; ctx.font = '8px "Press Start 2P",monospace'; ctx.fillText(nd.r, nd.x, groundY + 30);
            }
            ctx.restore();
            // Konfeti efekti
            if (t > 1000 && t % 400 < 20) {
                for (let i = 0; i < 3; i++) spawnParticles(charXs[i], groundY - 100, 5, ['#ffcc00', '#44ff44', '#00f0ff'][i], 'burst');
            }
            const cty = groundY - Math.round(56 * 2.8) - 6;
            if (t > 600) drawIntroBubble(240, cty, 'Sonunda!\nBugün son günümüz!', '#44ee55', t, 600);
            if (t > 2500) drawIntroBubble(480, cty, 'Pasta getirdim!\nProjeyi kapattık! 🎂', '#ffcc00', t, 2500);
            if (t > 4400) drawIntroBubble(720, cty, 'Kodları yolladım!\nYayındayız dostlar! 🚀', '#00f0ff', t, 4400);
        }
    },
    // ─── Sahne 2: Müşteri kapıyı kırarak giriyor ───
    {
        duration: 7000, render(t) {
            drawIntroOfficeBg();
            const groundY = canvas.height - 90;
            const scared = t > 1400;
            const charXs2 = [155, 258, 358], charKeys2 = ['uiux', 'modeler', 'coder'];
            for (let i = 0; i < 3; i++) {
                const sy2 = scared ? Math.sin(gameTime * 0.025 + i) * 3 : 0;
                drawIntroChar(charKeys2[i], charXs2[i], groundY + sy2, 2.4, scared ? -1 : 1);
            }
            // Müşteri sağdan kayarak giriyor
            const slideP = Math.max(0, Math.min(1, (t - 300) * 0.0013));
            const ease2 = 1 - Math.pow(1 - slideP, 3);
            const clientX = canvas.width + 120 + (655 - canvas.width - 120) * ease2;
            drawIntroEnemyAt(clientX, groundY, 2.8);
            // Kapı çarpma efekti
            if (t > 700 && t < 1100) {
                ctx.fillStyle = `rgba(255,200,0,${0.08 + Math.random() * 0.06})`; ctx.fillRect(0, 0, canvas.width, canvas.height);
                screenShake = Math.max(screenShake, 7);
            }
            // Tehlike kırmızısı
            if (scared) {
                const wa = 0.06 + Math.sin(gameTime * 0.008) * 0.04;
                ctx.fillStyle = `rgba(255,0,0,${wa})`; ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            const charTopY2 = groundY - Math.round(56 * 2.4) - 6;
            const clientTopY = groundY - Math.round(52 * 2.8) - 6;
            const cx2 = Math.min(clientX, 720);
            if (t > 900) drawIntroBubble(cx2, clientTopY, 'REVİZE İSTİYORUM!\nLOGO DAHA BÜYÜK OLMALI!', '#ff3333', t, 900);
            if (t > 3000) drawIntroBubble(cx2, clientTopY - 105, 'VE RENKLERİ DEĞİŞTİRİN!\nHEMEN ŞIMDI!!!', '#ff0000', t, 3000);
            if (t > 5000) drawIntroBubble(258, charTopY2, '...KAÇIN!!!', '#ff8800', t, 5000);
        }
    },
    // ─── Sahne 3: Kaçış başlıyor ───
    {
        duration: 4500, render(t) {
            const cbg = ctx.createLinearGradient(0, 0, canvas.width, 0);
            cbg.addColorStop(0, '#170a35'); cbg.addColorStop(0.5, '#260d5a'); cbg.addColorStop(1, '#170a35');
            ctx.fillStyle = cbg; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Hız çizgileri
            for (let i = 0; i < 30; i++) {
                const ly = (i * 27 + 3) % canvas.height, llen = 50 + (i * 47) % 220;
                ctx.fillStyle = `rgba(180,100,255,${0.03 + (i % 4 === 0 ? 0.05 : 0)})`;
                ctx.fillRect(0, ly, llen, 1); ctx.fillRect(canvas.width - llen, ly, llen, 1);
            }
            const groundY2 = canvas.height - 80;
            ctx.fillStyle = '#241240'; ctx.fillRect(0, groundY2, canvas.width, 80);
            ctx.fillStyle = '#4a9a4a'; ctx.fillRect(0, groundY2, canvas.width, 7);
            // Karakterler sağa koşuyor (coder önde)
            const runXs = [455, 325, 195], runKeys = ['coder', 'modeler', 'uiux'];
            for (let i = 0; i < 3; i++) {
                const bounce = Math.abs(Math.sin(gameTime * 0.018 + i * 1.1)) * 9;
                drawIntroRunChar(runKeys[i], runXs[i], groundY2 - bounce, 2.4, 1);
            }
            // Müşteri soldan takip ediyor (doğal olarak sola bakıyor)
            const clientX2 = 715 + Math.sin(t * 0.005) * 15;
            drawIntroEnemyAt(clientX2, groundY2, 2.5);
            const clientTopY2 = groundY2 - Math.round(52 * 2.5) - 6;
            if (t > 200) drawIntroBubble(clientX2, clientTopY2, 'REVİZE!\nRENK DEĞİŞ!', '#ff3333', t, 200);
            // Büyük başlık yazısı
            const ta = Math.min(1, t * 0.0025);
            ctx.save(); ctx.globalAlpha = ta; ctx.textAlign = 'center';
            ctx.fillStyle = '#ffcc00'; ctx.font = '22px "Press Start 2P",monospace';
            ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 22;
            ctx.fillText('KAÇIŞ BAŞLIYOR!', canvas.width / 2, 85);
            ctx.fillStyle = '#fff'; ctx.font = '9px "Press Start 2P",monospace'; ctx.shadowBlur = 0;
            ctx.fillText('Revizeyi Kabul Etmiyoruz! Müşteriden Kaç!', canvas.width / 2, 120);
            ctx.restore();
            // Patlama partikülleri
            if (t % 300 < 18) {
                for (let i = 0; i < 3; i++) spawnParticles(runXs[i], groundY2 - 60, 3, ['#ffcc00', '#44ff44', '#00f0ff'][i], 'sparkle');
            }
        }
    }
];

function startIntro() {
    introCurrentSlide = 0;
    introSlideTimer = 0;
    introFadeAlpha = 1.0;
    introFadingIn = true;
    speechProgress = {};
    gameState = GameState.INTRO;
    sound.init();
    hideAllScreens();
    document.getElementById('hud').classList.add('hidden');
    const prog = document.getElementById('progress-container');
    if (prog) prog.classList.add('hidden');
}

function updateIntro(dt) {
    introSlideTimer += dt;
    if (introFadingIn) {
        introFadeAlpha = Math.max(0, introFadeAlpha - dt * 0.004);
        if (introFadeAlpha <= 0) { introFadeAlpha = 0; introFadingIn = false; }
    }
    const cur = INTRO_SLIDES[introCurrentSlide];
    if (!cur) { startGame(); return; }
    if (!introFadingIn && introSlideTimer >= cur.duration - 700) {
        introFadeAlpha = Math.min(1, introFadeAlpha + dt * 0.005);
        if (introFadeAlpha >= 1) {
            introCurrentSlide++;
            introSlideTimer = 0;
            introFadeAlpha = 1.0;
            introFadingIn = true;
            if (introCurrentSlide >= INTRO_SLIDES.length) startGame();
        }
    }
}

function drawIntro() {
    const slide = INTRO_SLIDES[introCurrentSlide];
    if (slide) slide.render(introSlideTimer);
    if (introFadeAlpha > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${introFadeAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
    // Alt bilgi çubuğu
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, canvas.height - 28, canvas.width, 28);
    // Sahne göstergesi (noktalar)
    const dotSpacing = 18;
    const dotsTotal = INTRO_SLIDES.length;
    const dotsStartX = canvas.width / 2 - (dotsTotal - 1) * dotSpacing / 2;
    for (let i = 0; i < dotsTotal; i++) {
        ctx.fillStyle = i === introCurrentSlide ? '#ffcc00' : 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(dotsStartX + i * dotSpacing, canvas.height - 14, i === introCurrentSlide ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();
    }
    // Skip hint
    const sa = 0.35 + Math.sin(gameTime * 0.004) * 0.18;
    ctx.fillStyle = `rgba(255,255,255,${sa})`;
    ctx.font = '8px "Press Start 2P",monospace'; ctx.textAlign = 'right';
    ctx.fillText('ENTER → ATLA', canvas.width - 14, canvas.height - 10);
    ctx.restore();
}

const OUTRO_SLIDES = [
    // ─── Sahne 1: Boss Yerde, Biz Ayakta ───
    {
        duration: 4500, render(t) {
            const cbg = ctx.createLinearGradient(0, 0, canvas.width, 0);
            cbg.addColorStop(0, '#2d1b11'); cbg.addColorStop(0.5, '#402a1b'); cbg.addColorStop(1, '#2d1b11');
            ctx.fillStyle = cbg; ctx.fillRect(0, 0, canvas.width, canvas.height);
            const groundY = canvas.height - 90;
            ctx.fillStyle = '#111'; ctx.fillRect(0, groundY, canvas.width, 90);

            if (!this.notes) {
                this.notes = [];
                for (let i = 0; i < 40; i++) this.notes.push({ x: Math.random() * canvas.width, y: groundY + Math.random() * 80, c: ['#ffcc00', '#ff66aa', '#44eeff'][Math.floor(Math.random() * 3)] });
            }
            this.notes.forEach(n => { ctx.fillStyle = n.c; ctx.fillRect(n.x, n.y, 10, 10); });

            ctx.save();
            ctx.translate(650, groundY - 10);
            ctx.rotate(-Math.PI / 2);
            drawIntroEnemyAt(0, 0, 2.8);
            ctx.restore();

            const charKeys = ['uiux', 'modeler', 'coder'];
            const myChar = charKeys[selectedCharIndex];
            drawIntroChar(myChar, 300, groundY, 2.8, 1);

            const cty = groundY - Math.round(56 * 2.8) - 6;
            if (t > 1000) drawIntroBubble(300, cty, 'Bitti... Sonunda bitti!', '#44ee55', t, 1000);
        }
    },
    // ─── Sahne 2: İtiraf ───
    {
        duration: 5500, render(t) {
            const groundY = canvas.height - 90;
            const cbg = ctx.createLinearGradient(0, 0, canvas.width, 0);
            cbg.addColorStop(0, '#2d1b11'); cbg.addColorStop(0.5, '#402a1b'); cbg.addColorStop(1, '#2d1b11');
            ctx.fillStyle = cbg; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#111'; ctx.fillRect(0, groundY, canvas.width, 90);
            if (this.notes) this.notes.forEach(n => { ctx.fillStyle = n.c; ctx.fillRect(n.x, n.y, 10, 10); });

            ctx.save();
            ctx.translate(650, groundY - 10);
            ctx.rotate(-Math.PI / 2);
            const shake = Math.sin(t * 0.05) * 2;
            drawIntroEnemyAt(0, shake, 2.8);
            ctx.restore();

            const myChar = ['uiux', 'modeler', 'coder'][selectedCharIndex];
            drawIntroChar(myChar, 300, groundY, 2.8, 1);

            if (t > 500) drawIntroBubble(550, groundY - 100, 'Revizeler... haksızlıktı...\nTasarım... harika olmuş...', '#ffaa00', t, 500);
            if (t > 3000) drawIntroBubble(300, groundY - 150, 'Bunu duymak güzel.', '#00f0ff', t, 3000);
        }
    },
    // ─── Sahne 3: Ödeme Onaylandı & Kutlama ───
    {
        duration: 7000, render(t) {
            drawIntroOfficeBg();
            const groundY = canvas.height - 90;
            const charXs = [320, 480, 640], charKeys = ['uiux', 'modeler', 'coder'];

            if (!this.confetti) {
                this.confetti = [];
                for (let i = 0; i < 100; i++) this.confetti.push({ x: Math.random() * canvas.width, y: -Math.random() * 1000, vy: 3 + Math.random() * 4, c: ['#00ff00', '#ffcc00', '#ff00ff', '#ffffff'][Math.floor(Math.random() * 4)] });
            }
            this.confetti.forEach(c => {
                c.y += c.vy;
                ctx.fillStyle = c.c;
                ctx.fillRect(c.x, c.y, 8, 8);
            });

            for (let i = 0; i < 3; i++) {
                const bounce = Math.abs(Math.sin(t * 0.01 + i)) * 30;
                drawIntroChar(charKeys[i], charXs[i], groundY - bounce, 2.8, 1);
            }

            const dropY = Math.min(canvas.height / 2 - 40, -200 + t * 0.5);
            ctx.save();
            ctx.textAlign = 'center';
            ctx.fillStyle = '#00ff88'; ctx.font = '32px "Press Start 2P",monospace';
            ctx.shadowColor = '#00ff00'; ctx.shadowBlur = 20;
            ctx.fillText('ÖDEME ONAYLANDI!', canvas.width / 2, dropY);
            ctx.fillStyle = '#fff'; ctx.font = '12px "Press Start 2P",monospace'; ctx.shadowBlur = 0;
            ctx.fillText('Freelance Macerası Tamamlandı!', canvas.width / 2, dropY + 40);
            ctx.restore();

            if (t > 2000 && t % 200 < 20) {
                spawnParticles(canvas.width / 2 + (Math.random() - 0.5) * 400, canvas.height / 2 + (Math.random() - 0.5) * 200, 5, '#00ff88', 'sparkle');
            }
        }
    }
];

function startOutro() {
    outroCurrentSlide = 0;
    outroSlideTimer = 0;
    outroFadeAlpha = 1.0;
    outroFadingIn = true;
    outroSpeechProgress = {};
    gameState = GameState.OUTRO;
    sound.stopBGM();
    sound.play('powerup');
    document.getElementById('hud').classList.add('hidden');
}

function updateOutro(dt) {
    outroSlideTimer += dt;
    if (outroFadingIn) {
        outroFadeAlpha = Math.max(0, outroFadeAlpha - dt * 0.004);
        if (outroFadeAlpha <= 0) { outroFadeAlpha = 0; outroFadingIn = false; }
    }
    const cur = OUTRO_SLIDES[outroCurrentSlide];
    if (!cur) { returnToMenu(); return; }
    if (!outroFadingIn && outroSlideTimer >= cur.duration - 700) {
        outroFadeAlpha = Math.min(1, outroFadeAlpha + dt * 0.005);
        if (outroFadeAlpha >= 1) {
            outroCurrentSlide++;
            outroSlideTimer = 0;
            outroFadeAlpha = 1.0;
            outroFadingIn = true;
            if (outroCurrentSlide === 2) sound.play('coin');
            if (outroCurrentSlide >= OUTRO_SLIDES.length) returnToMenu();
        }
    }
}

function drawOutro() {
    const slide = OUTRO_SLIDES[outroCurrentSlide];
    if (slide) slide.render(outroSlideTimer);
    if (outroFadeAlpha > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${outroFadeAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, canvas.height - 28, canvas.width, 28);
    const sa = 0.35 + Math.sin(gameTime * 0.004) * 0.18;
    ctx.fillStyle = `rgba(255,255,255,${sa})`;
    ctx.font = '8px "Press Start 2P",monospace'; ctx.textAlign = 'right';
    ctx.fillText('ENTER → ATLA', canvas.width - 14, canvas.height - 10);
    ctx.restore();
}
// ==========================================
// MAIN LOOP
// ==========================================
function gameLoop(timestamp) {
    deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    if (deltaTime > 50) deltaTime = 50;
    gameTime += deltaTime;

    // Portal transition
    if (gameState === GameState.PORTAL) {
        portalTransitionAlpha += 0.04 * portalTransitionDir;
        if (portalTransitionDir === 1 && portalTransitionAlpha >= 1) {
            doEnterSecret();
            portalTransitionDir = 0;
            portalTransitionAlpha = 1;
            // Now fade out
            setTimeout(() => {
                portalTransitionDir = -1;
            }, 200);
        }
        if (portalTransitionDir === -1 && portalTransitionAlpha <= 0) {
            portalTransitionAlpha = 0;
            portalTransitionDir = 0;
            gameState = GameState.PLAYING;
        }
    }

    // Intro update
    if (gameState === GameState.INTRO) {
        updateIntro(deltaTime);
    }

    // Outro update
    if (gameState === GameState.OUTRO) {
        updateOutro(deltaTime);
    }

    if (gameState === GameState.PLAYING) {
        // Global Deadline Timer
        gameDeadlineTimer -= deltaTime;
        if (gameDeadlineTimer <= 0) {
            gameDeadlineTimer = 0;
            lives = 0; // Force game over
            player.die(false, true); // true for isTimeout if implemented, or just regular die
        }

        // Trigger Level 5 Boss Battle
        if (currentLevel === 5 && player.x >= 6400 && !inSecretDimension && !bossActive && !boss && !bossDefeated) {
            bossActive = true;
            boss = new Boss(cameraX + canvas.width + 100, 200);
            sound.stopBGM();
            sound.startBGM();
        }

        player.update(deltaTime);
        updateCamera();
        updateProgressBar();
        enemies = enemies.filter(e => e.update(deltaTime));
        sdCards.forEach(c => c.update(deltaTime));
        powerUps.forEach(p => p.update(deltaTime));
        portals.forEach(p => p.update(deltaTime));
        skillOrbs.forEach(o => o.update(deltaTime));
        playerProjectiles = playerProjectiles.filter(p => p.update(deltaTime));
        if (finishFlag) finishFlag.update(deltaTime);

        // Update Boss
        if (bossActive && boss) {
            if (!boss.update(deltaTime)) {
                boss = null;
            }
        }

        // Update lasers
        lasers = lasers.filter(l => l.update(deltaTime));

        updateParticles(deltaTime);
        checkCollisions();
        if (screenShake > 0) { screenShake *= 0.9; if (screenShake < 0.5) screenShake = 0; }

        // Power-up timer update
        for (const key of ['camera', 'coffee', 'wacom', 'ai']) {
            if (powerUp[key] > 0) {
                powerUp[key] -= deltaTime;
                if (powerUp[key] <= 0) {
                    powerUp[key] = 0;
                    if (key === 'ai') aiHelperInstance = null;
                }
            }
        }

        // Secret dimension timer
        if (inSecretDimension) {
            secretTimer -= deltaTime;
            if (secretTimer <= 0) {
                exitSecretDimension();
            }
        }

        // Level name display
        if (levelNameDisplay.timer > 0) {
            levelNameDisplay.timer -= deltaTime;
            if (levelNameDisplay.timer < 1000) levelNameDisplay.alpha = levelNameDisplay.timer / 1000;
        }

        // Update Class Ability HUD status dynamically
        const char = CHARACTERS[selectedCharIndex];
        const abilityHUD = document.getElementById('hud-ability');
        if (abilityHUD) {
            const label = document.getElementById('ability-label');
            const value = document.getElementById('ability-value');
            if (typeof bossActive !== 'undefined' && bossActive) {
                abilityHUD.classList.remove('hidden');
                if (label && value) {
                    label.textContent = 'AMMO';
                    value.textContent = `x${player.bossAmmo}`;
                    value.style.color = player.bossAmmo > 0 ? '#00ff88' : '#ff4444';
                }
            } else if (char.orbColor) {
                abilityHUD.classList.remove('hidden');
                if (label && value) {
                    label.textContent = 'SKILL';
                    value.textContent = `x${player.skillCharges}`;
                    value.style.color = player.skillCharges > 0 ? char.orbColor.hex : '#ff4444';
                }
            } else {
                abilityHUD.classList.add('hidden');
            }
        }

        // Update Timer HUD
        const timerVal = document.getElementById('timer-value');
        if (timerVal) {
            const totalSeconds = Math.ceil(gameDeadlineTimer / 1000);
            const m = Math.floor(totalSeconds / 60);
            const s = totalSeconds % 60;
            timerVal.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            if (gameDeadlineTimer <= 15000) {
                timerVal.classList.add('hud-timer-critical');
            } else {
                timerVal.classList.remove('hud-timer-critical');
            }
        }
    }

    // ---- DRAW ----
    ctx.save();
    if (screenShake > 0) ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);

    // Intro cutscene: draw and early return
    if (gameState === GameState.INTRO) {
        drawIntro();
        ctx.restore();
        requestAnimationFrame(gameLoop);
        return;
    }

    // Outro cutscene: draw and early return
    if (gameState === GameState.OUTRO) {
        drawOutro();
        ctx.restore();
        requestAnimationFrame(gameLoop);
        return;
    }

    drawBackground();
    drawPlatforms();

    if (gameState === GameState.PLAYING || gameState === GameState.LEVELCOMPLETE || gameState === GameState.PORTAL || gameState === GameState.PAUSED) {
        sdCards.forEach(c => c.draw());
        powerUps.forEach(p => p.draw());
        portals.forEach(p => p.draw());
        skillOrbs.forEach(o => o.draw());
        playerProjectiles.forEach(p => p.draw());
        enemies.forEach(e => e.draw());

        // Draw Boss
        if (bossActive && boss) {
            boss.draw();
        }

        // Draw lasers
        lasers.forEach(l => l.draw());

        if (finishFlag) finishFlag.draw();
        player.draw();
        drawParticles();

        // Secret dimension timer display
        if (inSecretDimension) {
            ctx.save();
            ctx.fillStyle = 'rgba(100, 0, 200, 0.4)';
            ctx.fillRect(0, 48, canvas.width, 36);
            ctx.fillStyle = '#e0b0ff';
            ctx.font = '10px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            const secs = Math.ceil(secretTimer / 1000);
            ctx.fillText(`🌀 GİZLİ BOYUT - ${secs}s KALDI`, canvas.width / 2, 70);

            // Timer bar
            const pct = secretTimer / (pendingPortal ? Math.min(10, pendingPortal.targetDimension.time) * 1000 : 10000);
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(canvas.width / 2 - 150, 74, 300, 5);
            ctx.fillStyle = pct > 0.3 ? '#a040ff' : '#ff4444';
            ctx.fillRect(canvas.width / 2 - 150, 74, 300 * pct, 5);
            ctx.restore();
        }

        // Power-up timer bar
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
        }
    }

    // Level name overlay
    if (levelNameDisplay.timer > 0) {
        ctx.save();
        ctx.globalAlpha = levelNameDisplay.alpha;
        ctx.fillStyle = '#fff';
        ctx.font = '24px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000'; ctx.shadowBlur = 10;
        ctx.fillText(levelNameDisplay.text, canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillStyle = '#aaa';
        ctx.fillText(levelNameDisplay.subtext, canvas.width / 2, canvas.height / 2 + 20);
        ctx.restore();
    }

    // Menu background
    if (gameState === GameState.MENU) {
        ctx.fillStyle = '#3d2b1f'; ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
        ctx.fillStyle = '#5cb85c'; ctx.fillRect(0, canvas.height - 40, canvas.width, 8);
        const dt2 = gameTime * 0.002;
        for (let i = 0; i < 3; i++) {
            const dx = ((dt2 * 60 + i * 350) % (canvas.width + 100)) - 50;
            ctx.drawImage(enemySprites.walk[Math.floor(dt2 * 3 + i) % 4], dx, canvas.height - 92, 44, 52);
        }
    }

    // Portal transition overlay
    if (portalTransitionAlpha > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(60, 0, 120, ${portalTransitionAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (portalTransitionAlpha > 0.5) {
            ctx.fillStyle = '#fff';
            ctx.font = '16px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.globalAlpha = portalTransitionAlpha;
            ctx.fillText('🌀 GİZLİ BOYUTA GEÇİŞ...', canvas.width / 2, canvas.height / 2);
        }
        ctx.restore();
    }

    // Scanline effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let i = 0; i < canvas.height; i += 4) {
        ctx.fillRect(0, i, canvas.width, 1);
    }

    // Glitch tearing filter
    if ((gameState === GameState.PORTAL || (player.invincible > 0 && Math.random() < 0.25)) && Math.random() < 0.3) {
        const numSlices = 4 + Math.floor(Math.random() * 6);
        for (let i = 0; i < numSlices; i++) {
            const sy = Math.random() * canvas.height;
            const sh = 8 + Math.random() * 32;
            const disp = (Math.random() - 0.5) * 20;
            ctx.drawImage(canvas, 0, sy, canvas.width, sh, disp, sy, canvas.width, sh);
        }
    }

    // Clear justPressed at the end of the frame
    for (const k in justPressed) justPressed[k] = false;

    ctx.restore();
    requestAnimationFrame(gameLoop);
}

function updateCharacterSelectionUI() {
    const cards = document.querySelectorAll('.char-card');
    cards.forEach((card, idx) => {
        if (idx === selectedCharIndex) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}

function updatePauseMenuUI() {
    const btnIds = ['btn-resume', 'btn-restart', 'btn-sound-pause', 'btn-mainmenu'];
    btnIds.forEach((id, idx) => {
        const btn = document.getElementById(id);
        if (btn) {
            if (idx === selectedPauseIndex) {
                btn.style.border = '2px solid #00ffff';
                btn.style.boxShadow = '0 0 10px #00ffff';
                btn.style.background = 'linear-gradient(180deg, #582494 0%, #2d0e52 100%)';
            } else {
                btn.style.border = '';
                btn.style.boxShadow = '';
                btn.style.background = '';
            }
        }
    });
}

function drawMenuAvatars() {
    const ids = ['canvas-uiux', 'canvas-modeler', 'canvas-coder'];
    const drawFuncs = [
        (cx) => drawDesignerBase(cx, 0, 0, 0, false),
        (cx) => drawModelerBase(cx, 0, 0, 0, false),
        (cx) => drawCoderBase(cx, 0, 0, 0, false)
    ];
    for (let i = 0; i < ids.length; i++) {
        const can = document.getElementById(ids[i]);
        if (can) {
            const ctx2 = can.getContext('2d');
            ctx2.clearRect(0, 0, can.width, can.height);
            // Draw directly onto the card canvas
            drawFuncs[i](ctx2);
        }
    }
}

function returnToMenu() {
    sound.stopBGM();
    gameState = GameState.MENU;
    hideAllScreens();
    showScreen('start-screen');
    document.getElementById('hud').classList.add('hidden');
    const prog = document.getElementById('progress-container');
    if (prog) prog.classList.add('hidden');
    updateCharacterSelectionUI();
    drawMenuAvatars();
}

// Pause and Settings UI Logic
document.getElementById('btn-settings')?.addEventListener('click', () => {
    gameState = GameState.SETTINGS;
    document.getElementById('settings-screen').classList.remove('hidden');
});

function closeSettings() {
    gameState = GameState.MENU;
    document.getElementById('settings-screen').classList.add('hidden');
}

document.getElementById('btn-close-settings')?.addEventListener('click', closeSettings);

document.getElementById('btn-sound-main')?.addEventListener('click', () => { sound.toggleSound(); });
document.getElementById('btn-sound-pause')?.addEventListener('click', () => { sound.toggleSound(); });

document.getElementById('btn-resume')?.addEventListener('click', () => {
    gameState = GameState.PLAYING;
    document.getElementById('pause-screen').classList.add('hidden');
});

document.getElementById('btn-restart')?.addEventListener('click', () => {
    document.getElementById('pause-screen').classList.add('hidden');
    resetGame();
    startGame();
});

document.getElementById('btn-mainmenu')?.addEventListener('click', () => {
    document.getElementById('pause-screen').classList.add('hidden');
    returnToMenu();
});

// Key bindings setup
let listeningForBind = null;
document.querySelectorAll('.key-bind-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Clear listening state from all other buttons
        document.querySelectorAll('.key-bind-btn').forEach(b => {
            b.classList.remove('listening');
            b.textContent = KeyBindings[b.dataset.action][0];
        });

        btn.classList.add('listening');
        btn.textContent = 'TUŞ BEKLENİYOR...';
        listeningForBind = btn.dataset.action;
        e.stopPropagation();
    });
});

document.addEventListener('keydown', (e) => {
    if (listeningForBind && e.code !== 'Escape') {
        KeyBindings[listeningForBind] = [e.code]; // Overwrite default with new primary key
        const btn = document.querySelector(`.key-bind-btn[data-action="${listeningForBind}"]`);
        if (btn) {
            btn.classList.remove('listening');
            btn.textContent = e.code;
        }
        listeningForBind = null;
    } else if (listeningForBind && e.code === 'Escape') {
        // Cancel binding
        const btn = document.querySelector(`.key-bind-btn[data-action="${listeningForBind}"]`);
        if (btn) {
            btn.classList.remove('listening');
            btn.textContent = KeyBindings[listeningForBind][0];
        }
        listeningForBind = null;
    }
});

// Register Character Selection Card Click Event Listeners
document.querySelectorAll('.char-card').forEach((card) => {
    card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.index);
        selectedCharIndex = idx;
        updateCharacterSelectionUI();
        drawMenuAvatars();
        sound.init();
        sound.play('coin');
    });
});


initHighScores();
updateCharacterSelectionUI();
setTimeout(drawMenuAvatars, 100); // Give DOM a brief split second to build
requestAnimationFrame(gameLoop);
