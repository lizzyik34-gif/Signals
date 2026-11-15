    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                // Ensure your phone number has country code without '+' symbols, e.g., '2347074302726'
                const phoneNumber = '2347074302726'; 
                console.log('Requesting pairing code from WhatsApp...');
                const code = await sock.requestPairingCode(phoneNumber);
                const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log('\n====================================');
                console.log('👉 YOUR WHATSAPP PAIRING CODE:', formattedCode);
                console.log('====================================\n');
            } catch (err) {
                console.log('Failed to get pairing code:', err.message);
            }
        }, 10000); // Increased delay to 10 seconds to ensure socket is fully ready
    }
