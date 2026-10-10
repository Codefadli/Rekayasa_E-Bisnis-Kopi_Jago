// QR Generator Admin Page
// Dependencies: admin-shared.js (token, api, checkAdminAuth)

let currentQRData = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    initForm();
    loadActiveQRCodes();
});

function initForm() {
    const form = document.getElementById('qr-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await generateQR();
    });
}

async function generateQR() {
    const energyAmount = parseInt(document.getElementById('energy-amount').value);
    const scanLimit = parseInt(document.getElementById('scan-limit').value);
    const expiresHours = parseInt(document.getElementById('expires-hours').value);

    try {
        // Generate random token
        const token = 'JAGO-' + generateRandomString(8) + '-' + generateRandomString(8);
        const tokenHash = await sha256(token);

        // Calculate expiration
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expiresHours);

        // Save to database
        const res = await fetch(api('admin/qr-tokens'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({
                token: tokenHash,
                energy_amount: energyAmount,
                scan_limit: scanLimit,
                expires_at: expiresAt.toISOString()
            })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to generate QR');

        // Store QR data
        currentQRData = {
            token: token,
            token_hash: tokenHash,
            energy_amount: energyAmount,
            scan_limit: scanLimit,
            expires_at: expiresAt
        };

        // Display QR
        displayQR(currentQRData);

        // Reload active list
        loadActiveQRCodes();

    } catch (err) {
        console.error('Generate QR error:', err);
        alert('Error: ' + err.message);
    }
}

function displayQR(qrData) {
    // Generate QR code image
    const canvas = document.getElementById('qr-canvas');
    QRCode.toCanvas(canvas, qrData.token, {
        width: 300,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    });

    // Fill details
    document.getElementById('qr-token').textContent = qrData.token;
    document.getElementById('qr-energy').textContent = qrData.energy_amount;
    document.getElementById('qr-limit').textContent = qrData.scan_limit;
    document.getElementById('qr-expires').textContent = formatDateTime(qrData.expires_at);

    // Show display section
    document.getElementById('qr-display').style.display = 'block';
    document.getElementById('qr-display').scrollIntoView({ behavior: 'smooth' });
}

async function loadActiveQRCodes() {
    const container = document.getElementById('qr-list');
    
    try {
        const res = await fetch(api('admin/qr-tokens'), {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to load QR codes');

        if (data.length === 0) {
            container.innerHTML = '<p class="empty-text">Belum ada QR code aktif.</p>';
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Token (Hash)</th>
                        <th>Energy</th>
                        <th>Scan Limit</th>
                        <th>Scanned</th>
                        <th>Remaining</th>
                        <th>Expires</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(qr => {
                        const remaining = qr.scan_limit - qr.scan_count;
                        const isExpired = new Date(qr.expires_at) < new Date();
                        const isExhausted = remaining <= 0;
                        const status = isExpired ? 'Expired' : isExhausted ? 'Exhausted' : 'Active';
                        const statusClass = isExpired || isExhausted ? 'status-inactive' : 'status-active';

                        return `
                            <tr>
                                <td><code>${qr.token.substring(0, 16)}...</code></td>
                                <td>${qr.energy_amount} pts</td>
                                <td>${qr.scan_limit}</td>
                                <td>${qr.scan_count}</td>
                                <td>${remaining}</td>
                                <td>${formatDateTime(qr.expires_at)}</td>
                                <td><span class="status-badge ${statusClass}">${status}</span></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

    } catch (err) {
        console.error('Load QR codes error:', err);
        container.innerHTML = '<p class="error-text">Failed to load QR codes.</p>';
    }
}

function copyToken() {
    const token = document.getElementById('qr-token').textContent;
    navigator.clipboard.writeText(token).then(() => {
        alert('Token copied to clipboard!');
    });
}

function downloadQR() {
    const canvas = document.getElementById('qr-canvas');
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `jago-qr-${Date.now()}.png`;
    link.click();
}

function printQR() {
    const canvas = document.getElementById('qr-canvas');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Print QR Code</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 2rem;
                }
                h1 { color: #E31837; }
                img { margin: 2rem 0; }
                .details { 
                    margin-top: 2rem; 
                    text-align: left; 
                    max-width: 400px; 
                    margin-left: auto; 
                    margin-right: auto;
                    line-height: 1.8;
                }
            </style>
        </head>
        <body>
            <h1>JAGO COFFEE</h1>
            <h2>Scan untuk Energy Points!</h2>
            <img src="${canvas.toDataURL()}" />
            <div class="details">
                <p><strong>Energy:</strong> ${currentQRData.energy_amount} points</p>
                <p><strong>Valid untuk:</strong> ${currentQRData.scan_limit} customer pertama</p>
                <p><strong>Berlaku sampai:</strong> ${formatDateTime(currentQRData.expires_at)}</p>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

function generateAnother() {
    document.getElementById('qr-display').style.display = 'none';
    document.getElementById('qr-form').scrollIntoView({ behavior: 'smooth' });
}

// Helper: Generate random string
function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Helper: SHA256 hash (Web Crypto API)
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
