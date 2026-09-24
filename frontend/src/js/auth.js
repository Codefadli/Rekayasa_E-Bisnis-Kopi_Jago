function kjRoleDestination(role) {
    if (role === 'admin') return KJ_ROUTES.admin;
    if (role === 'seller') return KJ_ROUTES.seller;
    return KJ_ROUTES.home;
}

async function kjLogin(email, password) {
    const response = await kjRequest('auth/login.php', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    const { token, role, user } = response.data;
    localStorage.setItem('kj_token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('kj_user', JSON.stringify(user));
    localStorage.setItem('kj_role', role);
    return response.data;
}

async function kjRegister(name, email, password, phone = null) {
    const day = Number(document.getElementById('birth_day')?.value);
    const month = Number(document.getElementById('birth_month')?.value);
    const year = Number(document.getElementById('birth_year')?.value);
    if (!day || !month || !year) throw new Error('Tanggal lahir wajib dipilih.');
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        throw new Error('Tanggal lahir tidak valid.');
    }
    return kjRequest('auth/register.php', {
        method: 'POST',
        body: JSON.stringify({
            name, email, password, phone,
            birth_date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        })
    });
}

function kjPopulateBirthDateFields() {
    const day = document.getElementById('birth_day');
    const month = document.getElementById('birth_month');
    const year = document.getElementById('birth_year');
    if (!day || !month || !year || day.options.length > 1) return;
    for (let value = 1; value <= 31; value += 1) day.add(new Option(String(value).padStart(2, '0'), value));
    for (let value = 1; value <= 12; value += 1) month.add(new Option(String(value), value));
    for (let value = new Date().getFullYear() - 13; value >= new Date().getFullYear() - 100; value -= 1) {
        year.add(new Option(String(value), value));
    }
}

function kjBindAuthForms() {
    kjPopulateBirthDateFields();
    const loginButton = document.getElementById('btn-login');
    const registerButton = document.getElementById('btn-register');
    loginButton?.addEventListener('click', async () => {
        const email = document.getElementById('login-email')?.value.trim();
        const password = document.getElementById('login-password')?.value || '';
        if (!email || !password) return alert('Email dan password wajib diisi.');
        loginButton.disabled = true;
        try {
            const result = await kjLogin(email, password);
            window.location.assign(kjRoleDestination(result.role));
        } catch (error) {
            alert(error.message);
        } finally {
            loginButton.disabled = false;
        }
    });
    registerButton?.addEventListener('click', async () => {
        const name = document.getElementById('register-name')?.value.trim();
        const email = document.getElementById('register-email')?.value.trim();
        const password = document.getElementById('register-password')?.value || '';
        if (!name || !email || !password) return alert('Nama, email, dan password wajib diisi.');
        registerButton.disabled = true;
        try {
            await kjRegister(name, email, password);
            alert('Akun berhasil dibuat. Silakan login.');
            if (typeof openLogin === 'function') openLogin();
        } catch (error) {
            alert(error.message);
        } finally {
            registerButton.disabled = false;
        }
    });
}
