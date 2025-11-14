// Init TG WebApp
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Game vars
let level = 1;
let xp = 0;
let health = 100;
let fatness = 'Skinny';
let equippedGear = 'None';
const canvas = document.getElementById('cat-canvas');
const ctx = canvas.getContext('2d');

// Draw cat (simple circle for body, grows with fatness)
function drawCat() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let size = 50 + (level * 5); // Grows fatter
    ctx.fillStyle = '#000'; // Black fur
    ctx.beginPath();
    ctx.arc(150, 150, size, 0, Math.PI * 2); // Body
    ctx.fill();
    ctx.fillStyle = '#00f'; // Blue eyes
    ctx.beginPath();
    ctx.arc(130, 130, 5, 0, Math.PI * 2);
    ctx.arc(170, 130, 5, 0, Math.PI * 2);
    ctx.fill();
    // Poop munch animation? Add later with requestAnimationFrame
}

drawCat(); // Initial draw

// Update UI
function updateStats() {
    document.getElementById('level').textContent = level;
    document.getElementById('xp').textContent = xp;
    document.getElementById('health').textContent = health;
    let fatLevels = ['Skinny', 'Chubby', 'Fluffy Ball', 'Emperor Blob'];
    fatness = fatLevels[Math.min(level / 10, 3)];
    document.getElementById('fatness').textContent = fatness;
    drawCat();
}

// Eat button
document.getElementById('eat-btn').addEventListener('click', () => {
    let xpGain = 10;
    if (equippedGear === 'Poop Crown') xpGain += 10;
    if (equippedGear === 'Turbo Digest') xpGain *= 2;
    xp += xpGain;
    if (xp >= 100) {
        xp -= 100;
        level++;
        health += 20; // Level up buff
    }
    updateStats();
    alert('Nom nom! Gained ' + xpGain + ' XP. 😼'); // Or use TG toast
});

// Equip gear
document.getElementById('equip-btn').addEventListener('click', () => {
    equippedGear = document.getElementById('gear-select').value;
    alert('Equipped: ' + equippedGear);
});

// PVP vs AI
document.getElementById('pvp-btn').addEventListener('click', () => {
    let aiLevel = Math.floor(Math.random() * level) + 1; // Random AI strength
    let playerAttack = level * 5 + (equippedGear === 'Poop Crown' ? 10 : 0);
    let aiHealth = aiLevel * 20;
    let battleLog = document.getElementById('battle-log');
    battleLog.innerHTML = 'Battling AI Level ' + aiLevel + '!<br>';

    // Simple turn-based sim
    while (health > 0 && aiHealth > 0) {
        aiHealth -= playerAttack;
        if (aiHealth <= 0) {
            battleLog.innerHTML += 'You win! Bonus 50 XP.<br>';
            xp += 50;
            if (xp >= 100) {
                xp -= 100;
                level++;
            }
            updateStats();
            return;
        }
        health -= aiLevel * 3; // AI attack
        battleLog.innerHTML += 'AI hits! Your health: ' + health + '<br>';
    }
    if (health <= 0) {
        battleLog.innerHTML += 'You lose! Health reset to 50.<br>';
        health = 50;
        updateStats();
    }
});

updateStats(); // Init
