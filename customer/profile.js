/**
 * PROFILE PAGE - JAGO COFFEE
 */

let userData = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!KJAuth.isAuthenticated()) {
        window.location.href = '../login.html';
        return;
    }
    await loadProfile();
});

async function loadProfile() {
    const container = document.getElementById('profile-container');
    showLoading(container);
    
    try {
        userData = await kjApi('profile');
        console.log('[Profile] Loaded:', userData);
        hideLoading(container);
        renderProfile();
    } catch (error) {
        console.error('[Profile] Error:', error);
        hideLoading(container);
        showErrorState(container, 'Gagal memuat profil: ' + error.message, loadProfile);
    }
}

function renderProfile() {
    const container = document.getElementById('profile-container');
    
    container.innerHTML = `
        <div class="profile-header">
            <div class="profile-avatar">${(userData.name || 'U')[0].toUpperCase()}</div>
            <div class="profile-info">
                <h2>${esc(userData.name || 'User')}</h2>
                <p>${esc(userData.email || '')}</p>
            </div>
        </div>
        
        <div class="profile-section">
            <h3>Informasi Pribadi</h3>
            <div class="profile-field">
                <label>Nama</label>
                <div class="field-value">${esc(userData.name || '-')}</div>
            </div>
            <div class="profile-field">
                <label>Email</label>
                <div class="field-value">${esc(userData.email || '-')}</div>
            </div>
            <div class="profile-field">
                <label>Telepon</label>
                <div class="field-value">${esc(userData.phone || '-')}</div>
            </div>
            <button class="btn btn-secondary" onclick="editProfile()">Edit Profil</button>
        </div>
        
        <div class="profile-section">
            <h3>Akun & Keamanan</h3>
            <button class="btn btn-secondary" onclick="changePassword()">Ubah Password</button>
            <button class="btn btn-danger" onclick="logout()" style="margin-top:12px">Logout</button>
        </div>
    `;
}

async function editProfile() {
    const html = `
        <div style="padding:8px 0">
            <div class="form-group">
                <label>Nama</label>
                <input type="text" id="edit-name" class="form-control" value="${esc(userData.name || '')}" required>
            </div>
            <div class="form-group">
                <label>Telepon</label>
                <input type="tel" id="edit-phone" class="form-control" value="${esc(userData.phone || '')}">
            </div>
        </div>
    `;
    
    const ok = await KJModal.show({
        title: 'Edit Profil',
        html,
        confirmText: 'Simpan'
    });
    
    if (!ok) return;
    
    const name = document.getElementById('edit-name').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();
    
    if (!name) {
        KJToast.warning('Nama wajib diisi');
        return;
    }
    
    try {
        await kjApi('profile', {
            method: 'PUT',
            body: JSON.stringify({ name, phone })
        });
        KJToast.success('Profil berhasil diperbarui');
        await loadProfile();
        KJAuth.updateUser({ ...userData, name, phone });
    } catch (error) {
        KJToast.error('Gagal memperbarui profil: ' + error.message);
    }
}

async function changePassword() {
    const html = `
        <div style="padding:8px 0">
            <div class="form-group">
                <label>Password Lama</label>
                <input type="password" id="old-password" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Password Baru</label>
                <input type="password" id="new-password" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Konfirmasi Password Baru</label>
                <input type="password" id="confirm-password" class="form-control" required>
            </div>
        </div>
    `;
    
    const ok = await KJModal.show({
        title: 'Ubah Password',
        html,
        confirmText: 'Ubah'
    });
    
    if (!ok) return;
    
    const oldPass = document.getElementById('old-password').value;
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-password').value;
    
    if (!oldPass || !newPass || !confirmPass) {
        KJToast.warning('Semua field wajib diisi');
        return;
    }
    
    if (newPass !== confirmPass) {
        KJToast.warning('Konfirmasi password tidak cocok');
        return;
    }
    
    if (newPass.length < 6) {
        KJToast.warning('Password minimal 6 karakter');
        return;
    }
    
    try {
        await kjApi('profile/password', {
            method: 'PUT',
            body: JSON.stringify({ old_password: oldPass, new_password: newPass })
        });
        KJToast.success('Password berhasil diubah');
    } catch (error) {
        KJToast.error('Gagal mengubah password: ' + error.message);
    }
}

async function logout() {
    const ok = await KJModal.confirm('Yakin ingin logout?', 'Konfirmasi Logout');
    if (!ok) return;
    
    try {
        await kjApi('auth/logout', { method: 'POST' });
    } catch (e) {
        console.log('Logout API error (ignored):', e);
    }
    
    KJAuth.logout();
    window.location.href = '../login.html';
}

window.editProfile = editProfile;
window.changePassword = changePassword;
window.logout = logout;
console.log('[Profile] Loaded');
