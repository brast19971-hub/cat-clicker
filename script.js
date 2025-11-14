const tg = window.Telegram.WebApp;
tg.ready(); tg.expand();
tg.MainButton.text = 'Extract 💎'; tg.MainButton.onClick(extract); tg.MainButton.show(); // Tarkov extract

// Game state
let game = {
    level: 1, xp: 0, maxXp: 100, hp: 100, maxHp: 100,
    atk: 10, def: 0, fat: 'Skinny',
    player: { x: 300, y: 300, size: 20, speed: 2 },
    poops: [], enemies: [], loots: [], // world objects
    stash: [], equipped: { hat: null, chest: null },
    inRaid: false, // Tarkov mode
    keys: {}, ctx: null, canvas: null, images: {} // preload imgs
};

// Items data (с картинками!)
const lootTable = [
    { id: 'poopCrown', name: 'Poop Crown', type: 'hat', bonus: { xp: 10 }, rarity: 'common', img: 'https://www.shutterstock.com/shutterstock/photos/1744416923/display_1500/stock-photo--pixel-art-king-crown-bit-game-item-on-white-background-1744416923.jpg' },
    { id: 'turboPill', name: 'Turbo Digest Pill', type: 'chest', bonus: { atk: 5, xpMult: 2 }, rarity: 'rare', img: 'https://img.itch.zone/aW1nLzIxMjAzMDg5LnBuZw==/original/DlkhN8.png' },
    { id: 'gothArmor', name: 'Goth Poop Armor', type: 'chest', bonus: { def: 10 }, rarity: 'epic', img: 'https://thumbs.dreamstime.com/z/isometric-pixel-art-armor-set-orange-black-medieval-knight-design-363274845.jpg' },
    // Добавь больше по вкусу
];

// Preload images
function preloadImages() {
    const imgs = ['cat', 'poop', 'enemy'].map(type => {
        const img = new Image(); img.onload = () => game.images[type] = img;
        img.onerror = () => console.log('Img fail, draw shape');
        img.src = {
            cat: 'https://img.itch.zone/aW1nLzE4MzI4OTEyLmdpZg==/original/GdrSG+.gif',
            poop: 'https://static.vecteezy.com/system/resources/thumbnails/054/983/908/small_2x/cheerful-cartoon-poop-emoji-with-a-smiling-face-and-shiny-brown-swirl-symbolizing-humor-and-fun-in-a-playful-animated-style-png.png',
            enemy: 'https://static.wikia.nocookie.net/pure-evil-wiki/images/9/95/RedNES.png/revision/latest?cb=20200227205009'
        }[type] || '';
        return img;
    });
}

// Load/Save with TG Cloud (Tarkov stash!)
async function loadSave() {
    try {
        const data = await tg.CloudStorage.get('poopSave');
        if (data) {
            const save = JSON.parse(data);
            Object.assign(game, save);
            game.stash = save.stash || [];
            game.equipped = save.equipped || { hat: null, chest: null };
        }
    } catch(e) { console.log('No save'); }
    updateStats();
}
async function saveGame() {
    const save = { ...game, stash: game.stash, equipped: game.equipped };
    await tg.CloudStorage.set('poopSave', JSON.stringify(save));
}

// Init
game.canvas = document.getElementById('game-canvas');
game.ctx = game.canvas.getContext('2d');
preloadImages();
loadSave();
updateUI();
gameLoop(); // RPG loop

// Input
document.addEventListener('keydown', e => game.keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', e => game.keys[e.key.toLowerCase()] = false);
game.canvas.addEventListener('click', attackNearby); // Space-like

// Tabs
document.querySelectorAll('#ui-tabs button').forEach((btn, i) => {
    btn.onclick = () => {
        document.querySelector('#ui-tabs .active')?.classList.remove('active');
        btn.classList.add('active');
        document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
        ['stats', 'stash', 'equip', 'raid'][i]?. + '-panel' && (document.getElementById('stats-panel').style.display = 'block'); // Default stats
        if (i === 1) showStash();
        if (i === 2) showEquip();
    };
});

// Movement
function updatePlayer() {
    if (game.keys['w'] || game.keys['arrowup']) game.player.y -= game.player.speed;
    if (game.keys['s'] || game.keys['arrowdown']) game.player.y += game.player.speed;
    if (game.keys['a'] || game.keys['arrowleft']) game.player.x -= game.player.speed;
    if (game.keys['d'] || game.keys['arrowright']) game.player.x += game.player.speed;
    // Borders
    game.player.x = Math.max(game.player.size, Math.min(600 - game.player.size, game.player.x));
    game.player.y = Math.max(game.player.size, Math.min(600 - game.player.size, game.player.y));
}

// Spawn stuff
function spawnPoop() { if (Math.random() < 0.02) game.poops.push({ x: Math.random()*580+10, y: Math.random()*580+10 }); }
function spawnEnemy() { if (!game.inRaid || Math.random() < 0.01) game.enemies.push({ x: Math.random()*580+10, y: Math.random()*580+10, hp: 20 + game.level*5, size: 18 }); }
function spawnLoot() { if (Math.random() < 0.005) { const item = lootTable[Math.floor(Math.random()*lootTable.length)]; game.loots.push({ ...item, x: Math.random()*580+10, y: Math.random()*580+10 }); } }

// Collisions
function checkCollide(a, b, dist=30) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx*dx + dy*dy) < dist;
}
function eatPoop() {
    for (let i = game.poops.length - 1; i >= 0; i--) {
        if (checkCollide(game.player, game.poops[i])) {
            let gain = 10;
            if (game.equipped.hat?.bonus?.xp) gain += game.equipped.hat.bonus.xp;
            if (game.equipped.chest?.bonus?.xpMult) gain *= game.equipped.chest.bonus.xpMult;
            game.xp += gain;
            if (game.xp >= game.maxXp) { game.level++; game.xp = 0; game.maxXp *= 1.2; game.player.size += 2; game.maxHp += 20; game.hp = game.maxHp; }
            game.poops.splice(i, 1);
            tg.showAlert('Nom nom! +' + gain + ' XP 😼');
        }
    }
}
function collectLoot() {
    for (let i = game.loots.length - 1; i >= 0; i--) {
        if (checkCollide(game.player, game.loots[i])) {
            if (game.inRaid) {
                // In raid: to equipped (limited slots? simplify add)
                alert('Looted: ' + game.loots[i].name);
            } else {
                game.stash.push(game.loots[i]);
                saveGame();
                showStash();
            }
            game.loots.splice(i, 1);
        }
    }
}
function updateEnemies() {
    for (let i = game.enemies.length - 1; i >= 0; i--) {
        const e = game.enemies[i];
        // Chase player
        const dx = game.player.x - e.x, dy = game.player.y - e.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 0) { e.x += (dx/dist) * 1; e.y += (dy/dist) * 1; }
        // Collide damage
        if (checkCollide(game.player, e)) {
            const dmg = (10 + game.level) - game.def;
            game.hp -= Math.max(1, dmg);
            if (game.hp <= 0) { die(); return; }
        }
        // Drop loot on kill? Wait attack
    }
}

// Attack (space/click)
function attackNearby() {
    for (let i = game.enemies.length - 1; i >= 0; i--) {
        if (checkCollide(game.player, game.enemies[i], 50)) {
            let dmg = game.atk;
            if (game.equipped.chest?.bonus?.atk) dmg += game.equipped.chest.bonus.atk;
            game.enemies[i].hp -= dmg;
            document.getElementById('battle-log').innerHTML += `Hit enemy for ${dmg}!<br>`;
            if (game.enemies[i].hp <= 0) {
                // Loot drop!
                if (Math.random() < 0.7) {
                    const drop = lootTable[Math.floor(Math.random() * lootTable.length)];
                    game.loots.push({ ...drop, x: game.enemies[i].x, y: game.enemies[i].y });
                }
                game.enemies.splice(i, 1);
                tg.showAlert('Enemy down! Loot nearby 💀');
            }
            break;
        }
    }
}

function die() {
    if (game.inRaid) {
        tg.showAlert('You died! Lost equipped gear 😭');
        game.equipped = { hat: null, chest: null };
        game.inRaid = false;
        tg.MainButton.hide();
    }
    game.hp = game.maxHp * 0.5;
    resetArena();
}

function extract() {
    if (game.inRaid) {
        tg.showAlert('Extracted! Loot saved to stash 🏆');
        // Transfer equipped to stash
        Object.values(game.equipped).forEach(item => { if (item) game.stash.push(item); });
        game.equipped = { hat: null, chest: null };
        game.inRaid = false;
        tg.MainButton.hide();
        resetArena();
    }
    saveGame();
}

function enterRaid() {
    if (!game.inRaid) {
        game.inRaid = true;
        tg.MainButton.show();
        alert('Entered Raid! Kill AI, loot, extract. Die = lose equipped.');
        resetArena();
    }
}

function resetArena() {
    game.poops = []; game.enemies = []; game.loots = [];
    game.player.x = 300; game.player.y = 300;
}

// UI Updates
function updateStats() {
    document.getElementById('level').textContent = game.level;
    document.getElementById('xp').textContent = Math.floor(game.xp) + '/' + Math.floor(game.maxXp);
    document.getElementById('hp').textContent = Math.floor(game.hp) + '/' + game.maxHp;
    const fats = ['Skinny', 'Chubby', 'Blob', 'Emperor'];
    game.fat = fats[Math.min(Math.floor(game.level/5), 3)];
    document.getElementById('fat').textContent = game.fat;
    game.player.size = 15 + game.level * 1.5; // Fat grow
    game.atk = 10 + game.level * 2;
    if (game.equipped.hat) game.atk += 5;
    if (game.equipped.chest?.bonus?.atk) game.atk += game.equipped.chest.bonus.atk;
    game.def = game.equipped.chest?.bonus?.def || 0;
    document.getElementById('atk').textContent = game.atk;
    document.getElementById('def').textContent = game.def;
}

function showStash() {
    const list = document.getElementById('stash-list');
    list.innerHTML = '';
    game.stash.forEach((item, i) => {
        const slot = document.createElement('div');
        slot.className = 'item-slot';
        slot.innerHTML = `<img src="${item.img}" width="50" height="50" onerror="this.src='https://via.placeholder.com/50/ff69b4/111?text=${item.name[0]}'">`;
        slot.title = item.name;
        slot.onclick = () => equipItem(item, i);
        list.appendChild(slot);
    });
}

function showEquip() {
    document.getElementById('equipped-hat').textContent = game.equipped.hat?.name || 'None';
    document.getElementById('equipped-chest').textContent = game.equipped.chest?.name || 'None';
}

function equipItem(item, stashIndex) {
    if (item.type === 'hat' && !game.equipped.hat) {
        game.equipped.hat = item;
        game.stash.splice(stashIndex, 1);
    } else if (item.type === 'chest' && !game.equipped.chest) {
        game.equipped.chest = item;
        game.stash.splice(stashIndex, 1);
    } else {
        alert('Slot full or wrong type!');
        return;
    }
    saveGame();
    updateStats();
    showEquip();
    showStash();
}

document.getElementById('unequip-hat').onclick = () => { if (game.equipped.hat) game.stash.push(game.equipped.hat); game.equipped.hat = null; saveGame(); showEquip(); };
document.getElementById('unequip-chest').onclick = () => { if (game.equipped.chest) game.stash.push(game.equipped.chest); game.equipped.chest = null; saveGame(); showEquip(); };
document.getElementById('enter-raid').onclick = enterRaid;

// Render
function render() {
    game.ctx.clearRect(0, 0, 600, 600);
    game.ctx.fillStyle = game.inRaid ? '#440' : '#220'; // Raid green hell
    game.ctx.fillRect(0, 0, 600, 600);

    // Player cat (fat circle + eyes + gear)
    game.ctx.save();
    game.ctx.translate(game.player.x, game.player.y);
    game.ctx.fillStyle = '#000'; // Black goth fur
    game.ctx.beginPath();
    game.ctx.arc(0, 0, game.player.size, 0, Math.PI*2);
    game.ctx.fill();
    // Eyes
    game.ctx.fillStyle = '#00f';
    game.ctx.beginPath();
    game.ctx.arc(-8, -5, 4, 0, Math.PI*2);
    game.ctx.arc(8, -5, 4, 0, Math.PI*2);
    game.ctx.fill();
    // Gear overlay
    if (game.equipped.hat && game.images.cat) { /* drawImage hat */ game.ctx.fillStyle = '#ffd700'; game.ctx.fillRect(-12, -game.player.size-5, 24, 10); } // Crown stub
    if (game.equipped.chest) { game.ctx.strokeStyle = '#ff69b4'; game.ctx.lineWidth = 3; game.ctx.strokeRect(-game.player.size/2, -5, game.player.size, 20); } // Armor
    game.ctx.restore();

    // Poops
    game.poops.forEach(p => {
        if (game.images.poop) game.ctx.drawImage(game.images.poop, p.x-15, p.y-15, 30, 30);
        else { game.ctx.fillStyle = '#8b4513'; game.ctx.beginPath(); game.ctx.arc(p.x, p.y, 12, 0, Math.PI*2); game.ctx.fill(); }
    });

    // Enemies
    game.enemies.forEach(e => {
        if (game.images.enemy) game.ctx.drawImage(game.images.enemy, e.x-20, e.y-20, 40, 40);
        else { game.ctx.fillStyle = '#f00'; game.ctx.beginPath(); game.ctx.arc(e.x, e.y, e.size, 0, Math.PI*2); game.ctx.fill(); }
        // HP bar
        game.ctx.fillStyle = '#f00'; game.ctx.fillRect(e.x-15, e.y-25, 30, 3);
        game.ctx.fillStyle = '#0f0'; game.ctx.fillRect(e.x-15, e.y-25, 30 * (e.hp / (20 + game.level*5)), 3);
    });

    // Loots
    game.loots.forEach(l => {
        game.ctx.fillStyle = ['common','#888', 'rare','#00f', 'epic','#f0f'][['common','rare','epic'].indexOf(l.rarity)+1] || '#fff';
        game.ctx.fillRect(l.x-10, l.y-10, 20, 20);
        game.ctx.fillStyle = '#fff'; game.ctx.font = '8px monospace'; game.ctx.fillText(l.name[0], l.x-8, l.y+2);
    });
}

// Game loop
function gameLoop() {
    updatePlayer();
    if (!game.inRaid) spawnPoop(); else spawnEnemy();
    spawnLoot();
    eatPoop();
    collectLoot();
    updateEnemies();
    render();
    updateStats();
    requestAnimationFrame(gameLoop);
}

function updateUI() { updateStats(); showStash(); showEquip(); }

// Auto-save every 30s
setInterval(saveGame, 30000);
