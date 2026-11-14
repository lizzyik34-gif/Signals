const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

const TARGETS = [
    '2347074302726@s.whatsapp.net', // Your private chat
    '120363411622026272@g.us'        // Free feed group
];

let isRunning = true;
let lastProcessedPeriod = null;
let sock = null;

function getCurrentPeriod() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes();
    const totalMinutes = (hours * 60) + minutes;
    const periodIndex = String(totalMinutes).padStart(4, '0');

    return `${dateStr}0100${periodIndex}`;
}

async function startBot() {
    console.log('Initializing WhatsApp session...');
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n==============================');
            console.log('SCAN THIS QR CODE WITH WHATSAPP:');
            console.log('==============================\n');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const errorMessage = lastDisconnect?.error?.message;
            console.log(`❌ Connection closed due to:`, errorMessage, `| Status Code:`, statusCode);
            
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('🔄 Reconnecting in 3 seconds...');
                setTimeout(startBot, 3000);
            } else {
                console.log('⚠️ Logged out. Clear auth_info folder to rescan.');
            }
        } else if (connection === 'open') {
            console.log('✅ Bot successfully connected to WhatsApp!');
        }
    });

    // 1-minute WinGo signal broadcast loop
    setInterval(async () => {
        if (!isRunning || !sock) return;

        const currentPeriod = getCurrentPeriod();
        if (currentPeriod === lastProcessedPeriod) return;
        lastProcessedPeriod = currentPeriod;

        const prediction = Math.random() < 0.5 ? 'BIG 🔴' : 'SMALL 🟢';
        const message = `🤖 *WinGo 1 Min Signal*\n\nPeriod: ${currentPeriod}\nPrediction: *${prediction}*\n\n⚠️ Play responsibly!`;

        for (const target of TARGETS) {
            try {
                await sock.sendMessage(target, { text: message });
            } catch (err) {
                // Skips silently if not yet linked
            }
        }
    }, 15000);
}

startBot();
