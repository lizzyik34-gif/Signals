async function startBot() {
    console.log('Starting WhatsApp connection...');
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Ubuntu', 'Chrome', '20.0.04']
    });

    // Request 8-digit pairing code if not yet registered
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                // Your WhatsApp phone number without '+' or spaces
                const phoneNumber = '2347074302726'; 
                const code = await sock.requestPairingCode(phoneNumber);
                console.log('\n====================================');
                console.log('👉 YOUR WHATSAPP PAIRING CODE:', code);
                console.log('====================================\n');
            } catch (err) {
                console.log('Failed to get pairing code:', err.message);
            }
        }, 5000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

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

    // 1-minute WinGo Signal Loop
    setInterval(async () => {
        if (!sock || sock.user == null) return;

        const now = new Date();
        const period = `${now.getUTCFullYear()}${String(now.getUTCMonth()+1).padStart(2,'0')}${String(now.getUTCDate()).padStart(2,'0')}0100${String(now.getUTCHours()*60 + now.getUTCMinutes()).padStart(4,'0')}`;
        
        if (period === lastPeriod) return;
        lastPeriod = period;

        const prediction = Math.random() < 0.5 ? 'BIG 🔴' : 'SMALL 🟢';
        const msg = `🤖 *WinGo 1 Min Signal*\n\nPeriod: ${period}\nPrediction: *${prediction}*\n\n⚠️ Play responsibly!`;

        for (const target of TARGETS) {
            try {
                await sock.sendMessage(target, { text: msg });
            } catch (e) {}
        }
    }, 10000);
}
