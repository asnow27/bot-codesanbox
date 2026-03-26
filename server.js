const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const pvp = require('mineflayer-pvp').plugin;
const armorManager = require('mineflayer-armor-manager');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let bot;

io.on('connection', (socket) => {
    socket.on('start-bot', (data) => {
        if (bot) return;

        bot = mineflayer.createBot({
            host: data.host,
            port: parseInt(data.port),
            username: data.username,
        });

        // Load Plugins
        bot.loadPlugin(pathfinder);
        bot.loadPlugin(pvp);
        bot.loadPlugin(armorManager);

        bot.on('login', () => {
            socket.emit('status', 'Bot Berhasil Masuk & AI Aktif!');
            
            // Auto Login
            if(data.pass) {
                setTimeout(() => { bot.chat(`/login ${data.pass}`); }, 3000);
            }

            const defaultMove = new Movements(bot);
            bot.pathfinder.setMovements(defaultMove);
        });

        // --- FITUR AUTO PVP (HIT MONSTER) ---
        bot.on('physicsTick', () => {
            const entity = bot.nearestEntity((entity) => {
                return entity.type === 'mob' && 
                       (entity.mobType === 'Zombie' || entity.mobType === 'Skeleton' || entity.mobType === 'Spider') &&
                       entity.position.distanceTo(bot.entity.position) < 16;
            });

            if (entity && !bot.pvp.target) {
                bot.pvp.attack(entity);
                socket.emit('status', `Menyerang: ${entity.mobType}`);
            }
        });

        // --- FITUR WANDERING (BERKELILING WORLD) ---
        setInterval(() => {
            if (bot && bot.entity) {
                const rx = Math.floor(Math.random() * 20) - 10;
                const rz = Math.floor(Math.random() * 20) - 10;
                const targetPos = bot.entity.position.offset(rx, 0, rz);
                
                bot.pathfinder.setGoal(new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 1));
                socket.emit('status', 'Bot sedang menjelajah...');
            }
        }, 30000); // Jalan-jalan setiap 30 detik

        // --- FITUR AUTO BREAK/PLACE (LOGIKA SIMPEL) ---
        bot.on('chat', (username, message) => {
            if (message === 'break') {
                const block = bot.blockAtCursor(4);
                if (block) bot.dig(block);
            }
            if (message === 'place') {
                const block = bot.blockAtCursor(4);
                if (block) bot.placeBlock(block, require('vec3')(0, 1, 0));
            }
        });

        bot.on('message', (jsonMsg) => socket.emit('status', `CHAT: ${jsonMsg.toString()}`));
        bot.on('error', (err) => socket.emit('status', `Error: ${err.message}`));
        bot.on('end', () => { bot = null; socket.emit('status', 'Bot Terputus.'); });
    });

    socket.on('send-chat', (msg) => { if (bot) bot.chat(msg); });
});

server.listen(8080, () => console.log('GUI Pro Player Active'));
