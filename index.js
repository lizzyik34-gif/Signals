const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');
const qrcode = require('qrcode-terminal');

// Render port requirement
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WinGo Bot Active\n');
});
server.listen(process.env.PORT || 3000);

const ADMIN_JID = '2347074302726@s.whatsapp.net';
const TARGETS = [
    '2347074302726@s.whatsapp.net',
    '120363411622026272@g.us'
];

let isBotRunning = true;
let lastPeriod = null;

function getNextPeriod() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes();
    const totalMinutes = (hours * 60) + minutes + 1; 
    const periodIndex = String(totalMinutes).padStart(4, '0');
    
    return `${dateStr}1000${periodIndex}`;
}

async function startBot() {
    console.log('Starting WhatsApp connection...');
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // This prints a scannable QR code directly in your Render logs!
        logger: pino({ level: 'silent' }),
        browser: ['Ubuntu', 'Chrome', '20.0.04']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('Scan this QR code with WhatsApp:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`Connection closed (Status: ${statusCode}). Reconnecting...`);
            if (statusCode !== DisconnectReason.loggedOut) {
                setTimeout(startBot, 3000);
            }
        } else if (connection === 'open') {
            console.log('✅ Connected to WhatsApp successfully!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || !m.key.remoteJid) return;

        const sender = m.key.remoteJid;
        const text = m.message.conversation || m.message.extendedTextMessage?.text;

        if (!text || sender !== ADMIN_JID) return;

        const command = text.trim().toLowerCase();
        if (command === 'stop') {
            isBotRunning = false;
            await sock.sendMessage(sender, { text: '🛑 WinGo Signal Bot has been **STOPPED**.' });
            console.log('Bot stopped by admin command.');
        } else if (command === 'start') {
            isBotRunning = true;
            await sock.sendMessage(sender, { text: '✅ WinGo Signal Bot has been **STARTED**.' });
            console.log('Bot started by admin command.');
        }
    });

    setInterval(async () => {
        if (!isBotResolutionRunningIfNeeded() && (!isBotRunning || !sock || sock.user == null)) return;

        const period = getNextPeriod();
        
        if (period === lastPeriod) return;
        lastPeriod = period;

        const prediction = Math.random() < 0.5 ? 'BIG 🔴' : 'SMALL 🟢';
        const msg = `🤖 *WinGo 1 Min Signal*\n\nPeriod: ${period}\nPrediction: *${prediction}*\n\n⚠️ Play responsibly!`;

        for (const target of TARGETS) {
            try {
                await sock.sendMessage(target, { text: msg });
                console.log(`Successfully sent to ${target}`);
            } catch (e) {
                console.log(`Failed to send to ${target}:`, e.message);
            }
        }
    }, 10000);
}

function isBotResolutionRunningIfNeeded() {
    return false;
}

startBot();
