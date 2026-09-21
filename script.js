// Mengambil elemen-elemen modal
const loginModal = document.getElementById('login-modal');
const forgotModal = document.getElementById('forgot-modal');
const resetModal = document.getElementById('reset-modal');
const modalOverlay = document.getElementById('modal-overlay'); // Sesuaikan jika ID overlay kamu berbeda

// Tombol navigasi antar modal
const showForgotLink = document.getElementById('show-forgot-modal');
const backToLoginLink = document.getElementById('back-to-login');
const btnSendReset = document.getElementById('btn-send-reset');
const btnSavePassword = document.getElementById('btn-save-password');

// 1. Klik "Lupa Password?" dari modal Login
if (showForgotLink) {
    showForgotLink.addEventListener('click', function(e) {
        e.preventDefault();
        if (loginModal) loginModal.style.display = 'none';
        if (forgotModal) forgotModal.style.display = 'block';
    });
}

// 2. Klik "Kembali ke Login" dari modal Lupa Password
if (backToLoginLink) {
    backToLoginLink.addEventListener('click', function(e) {
        e.preventDefault();
        if (forgotModal) forgotModal.style.display = 'none';
        if (loginModal) loginModal.style.display = 'block';
    });
}

// 3. Simulasi Kirim Link Reset (Pindah ke modal Buat Password Baru)
if (btnSendReset) {
    btnSendReset.addEventListener('click', function(e) {
        e.preventDefault();
        alert("Link reset password telah dikirim ke email kamu! (Simulasi)");
        if (forgotModal) forgotModal.style.display = 'none';
        if (resetModal) resetModal.style.display = 'block';
    });
}

// 4. Simulasi Simpan Password Baru
if (btnSavePassword) {
    btnSavePassword.addEventListener('click', function(e) {
        e.preventDefault();
        alert("Password baru berhasil disimpan! Silakan login kembali.");
        if (resetModal) resetModal.style.display = 'none';
        if (loginModal) loginModal.style.display = 'block';
    });
}

// 5. Tombol Close (X) untuk Lupa & Reset Password
const closeForgotBtn = document.getElementById('close-forgot');
if (closeForgotBtn) {
    closeForgotBtn.addEventListener('click', function() {
        if (forgotModal) forgotModal.style.display = 'none';
        if (modalOverlay) modalOverlay.style.display = 'none';
    });
}

const closeResetBtn = document.getElementById('close-reset');
if (closeResetBtn) {
    closeResetBtn.addEventListener('click', function() {
        if (resetModal) resetModal.style.display = 'none';
        if (modalOverlay) modalOverlay.style.display = 'none';
    });
}

// 6. Script untuk Navbar Transparan ke Merah (Sudah Aman)
window.addEventListener('scroll', function() {
    const navbar = document.getElementById('navbar');
    if (navbar) { // Cek agar tidak error jika di halaman login tidak ada navbar
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
});