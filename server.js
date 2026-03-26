const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mineflayer = require('mineflayer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let bot;

io.on('connection', (socket) => {
    socket.emit('status', 'Connected to GUI Control Panel');

    socket.on('start-bot', (data) => {
        if (bot) return socket.emit('status', 'Bot sudah berjalan!');
        
        socket.emit('status', `Mencoba login ke ${data.host}...`);
        
        bot = mineflayer.createBot({
            host: data.host,
            port: parseInt(data.port),
            username: data.username,
        });

        bot.on('login', () => {
            socket.emit('status', 'Bot Berhasil Masuk!');
            if(data.pass) bot.chat(`/register ${data.pass}`);
            if(data.pass) bot.chat(`/login ${data.pass}`);
        });

        bot.on('message', (jsonMsg) => {
            socket.emit('status', `CHAT: ${jsonMsg.toString()}`);
        });

        bot.on('error', (err) => socket.emit('status', `Error: ${err.message}`));
        bot.on('end', () => {
            socket.emit('status', 'Bot Terputus (Disconnected)');
            bot = null;
        });
    });

    socket.on('stop-bot', () => {
        if (bot) {
            bot.quit();
            bot = null;
            socket.emit('status', 'Bot dimatikan secara manual.');
        }
    });

    socket.on('send-chat', (msg) => {
        if (bot) bot.chat(msg);
    });
});

server.listen(8080, () => console.log('GUI aktif di port 8080'));
