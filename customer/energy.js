/**
 * ENERGY PAGE - JAGO COFFEE
 * Production-ready
 */

let energyData = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!KJAuth.isAuthenticated()) {
        const ok = await KJModal.confirm('Login diperlukan untuk mengakses Energy. Login sekarang?', 'Login Required');
        if (ok) window.location.href = '../login.html';
        else window.location.href = 'home.html';
        return;
    }
    
    await loadEnergy();
});

async function loadEnergy() {
    const container = document.getElementById('energy-container');
    showLoading(container);
    
    try {
        energyData = await kjApi('energy');
        console.log('[Energy] Loaded:', energyData);
        hideLoading(container);
        renderEnergy();
    } catch (error) {
        console.error('[Energy] Error:', error);
        hideLoading(container);
        showErrorState(container, 'Gagal memuat Energy: ' + error.message, loadEnergy);
    }
}

function renderEnergy() {
    const container = document.getElementById('energy-container');
    const balance = energyData.balance || 0;
    const history = energyData.history || [];
    
    container.innerHTML = `
        <div class="energy-balance-card">
            <div class="energy-icon">⚡</div>
            <div class="energy-balance-info">
                <p class="energy-label">Energy Balance</p>
                <h2 class="energy-balance">${balance.toLocaleString('id-ID')} Points</h2>
                <p class="energy-hint">Dapatkan 1 point setiap pembelian Rp 1.000</p>
            </div>
        </div>
        
        <div class="energy-actions">
            <button class="btn btn-primary" onclick="scanQR()">
                <span style="font-size:20px">📱</span> Scan Energy QR
            </button>
            <button class="btn btn-secondary" onclick="redeemEnergy()">
                <span style="font-size:20px">🎁</span> Tukar Reward
            </button>
        </div>
        
        <div class="energy-history">
            <h3>Riwayat Energy</h3>
            ${history.length === 0 ? `
                <div class="empty-state-mini">
                    <p>Belum ada aktivitas Energy</p>
                </div>
            ` : `
                <div class="history-list">
                    ${history.map(item => `
                        <div class="history-item">
                            <div class="history-icon ${item.type === 'earn' ? 'earn' : 'redeem'}">
                                ${item.type === 'earn' ? '➕' : '➖'}
                            </div>
                            <div class="history-info">
                                <p class="history-title">${esc(item.description || item.source)}</p>
                                <p class="history-date">${formatDate(item.created_at)}</p>
                            </div>
                            <div class="history-points ${item.type === 'earn' ? 'earn' : 'redeem'}">
                                ${item.type === 'earn' ? '+' : '-'}${item.points}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;
}

async function scanQR() {
    KJToast.info('Fitur scan QR akan segera tersedia!');
    // TODO: Integrate QR scanner
}

async function redeemEnergy() {
    try {
        const rewards = await kjApi('energy/rewards');
        
        if (!rewards || rewards.length === 0) {
            KJToast.info('Belum ada reward tersedia saat ini');
            return;
        }
        
        const rewardOptions = rewards.map(r => 
            `<div class="reward-option" data-id="${r.id}" style="padding:12px;border:1px solid #ddd;border-radius:8px;margin:8px 0;cursor:pointer">
                <strong>${esc(r.name)}</strong>
                <p style="margin:4px 0;font-size:13px;color:#666">${esc(r.description)}</p>
                <p style="margin:4px 0;font-weight:700;color:var(--jago-red)">${r.points_required} points</p>
            </div>`
        ).join('');
        
        KJModal.show({
            title: 'Pilih Reward',
            html: `<div>${rewardOptions}</div>`,
            showConfirm: false,
            cancelText: 'Tutup'
        });
        
        document.querySelectorAll('.reward-option').forEach(opt => {
            opt.addEventListener('click', async () => {
                const rewardId = opt.dataset.id;
                const reward = rewards.find(r => r.id == rewardId);
                
                if (reward.points_required > energyData.balance) {
                    KJToast.warning('Energy tidak cukup!');
                    return;
                }
                
                const confirm = await KJModal.confirm(
                    `Tukar ${reward.points_required} points untuk ${reward.name}?`,
                    'Konfirmasi Tukar'
                );
                
                if (!confirm) return;
                
                try {
                    await kjApi('energy/redeem', {
                        method: 'POST',
                        body: JSON.stringify({ reward_id: rewardId })
                    });
                    KJToast.success('Reward berhasil ditukar!');
                    await loadEnergy();
                } catch (error) {
                    KJToast.error('Gagal menukar reward: ' + error.message);
                }
            });
        });
        
    } catch (error) {
        KJToast.error('Gagal memuat reward: ' + error.message);
    }
}

window.scanQR = scanQR;
window.redeemEnergy = redeemEnergy;
console.log('[Energy] Loaded');
