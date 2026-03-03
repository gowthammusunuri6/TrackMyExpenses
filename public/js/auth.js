// ==========================================
// AUTHENTICATION - CLIENT SIDE
// ==========================================

// Check if user is already logged in
function checkAuth() {
    const user = sessionStorage.getItem('user');
    if (user) {
        const userData = JSON.parse(user);
        // If on login/signup page, redirect to dashboard
        if (window.location.pathname === '/index.html' || window.location.pathname === '/signup.html' || window.location.pathname === '/') {
            window.location.href = '/dashboard.html';
        }
        return userData;
    }
    return null;
}

// Redirect to login if not authenticated
function requireAuth() {
    const user = checkAuth();
    if (!user && window.location.pathname !== '/index.html' && window.location.pathname !== '/signup.html' && window.location.pathname !== '/') {
        window.location.href = '/index.html';
        return false;
    }
    return user;
}

// Logout function
function logout() {
    // Clear session storage immediately
    sessionStorage.removeItem('user');
    
    // Call logout API asynchronously without waiting
    fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }).catch(() => {
        // Ignore errors
    });
    
    // Redirect to login page immediately
    window.location.href = '/';
}

// Load custom branding
async function loadBranding() {
    try {
        const response = await fetch('/api/branding');
        if (response.ok) {
            const branding = await response.json();

            // Update logo if exists
            const logoElements = document.querySelectorAll('#brandLogo, .brand-logo');
            if (branding.logo && logoElements.length > 0) {
                logoElements.forEach(el => {
                    el.src = branding.logo;
                });
            }

            // Update title if exists
            const titleElements = document.querySelectorAll('#brandTitle, .brand-title');
            if (branding.title && titleElements.length > 0) {
                titleElements.forEach(el => {
                    el.textContent = branding.title;
                });
            }

            // Update page title
            if (branding.title) {
                document.title = document.title.replace('TrackMyExpenses', branding.title);
            }
        }
    } catch (error) {
        console.log('Using default branding');
    }
}

// ==========================================
// LOGIN PAGE
// ==========================================

if (window.location.pathname === '/index.html' || window.location.pathname === '/') {
    // Check if already logged in
    checkAuth();

    // Load custom branding
    loadBranding();

    // Password toggle
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    if (togglePassword) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const loginAlert = document.getElementById('loginAlert');

            // Hide previous alerts
            loginAlert.classList.add('hidden');

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    // Store user data in session
                    sessionStorage.setItem('user', JSON.stringify(data.user));

                    // Redirect based on role
                    if (data.user.role === 'admin') {
                        window.location.href = '/admin.html';
                    } else {
                        window.location.href = '/dashboard.html';
                    }
                } else {
                    // Show error
                    document.getElementById('loginAlertMessage').textContent = data.message || 'Invalid credentials';
                    loginAlert.classList.remove('hidden');
                }
            } catch (error) {
                document.getElementById('loginAlertMessage').textContent = 'Connection error. Please try again.';
                loginAlert.classList.remove('hidden');
            }
        });
    }

    // Forgot password link
    const forgotLink = document.getElementById('forgotPasswordLink');
    if (forgotLink) {
        forgotLink.addEventListener('click', function (e) {
            e.preventDefault();
            // navigate to reset page where user can enter details
            window.location.href = '/forgot.html';
        });
    }
}

// ==========================================
// FORGOT/RESET PAGE HANDLER
// ==========================================
if (window.location.pathname === '/forgot.html') {
    // make sure we aren't already logged in
    checkAuth();
    loadBranding();

    const toggleNew = document.getElementById('toggleNewPassword');
    const toggleConfirm = document.getElementById('toggleConfirmPassword');
    const newInput = document.getElementById('newPassword');
    const confirmInput = document.getElementById('confirmPassword');

    if (toggleNew && newInput) {
        toggleNew.addEventListener('click', () => {
            const type = newInput.getAttribute('type') === 'password' ? 'text' : 'password';
            newInput.setAttribute('type', type);
            toggleNew.querySelector('i').classList.toggle('fa-eye');
            toggleNew.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }
    if (toggleConfirm && confirmInput) {
        toggleConfirm.addEventListener('click', () => {
            const type = confirmInput.getAttribute('type') === 'password' ? 'text' : 'password';
            confirmInput.setAttribute('type', type);
            toggleConfirm.querySelector('i').classList.toggle('fa-eye');
            toggleConfirm.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    const forgotForm = document.getElementById('forgotForm');
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');

    if (sendCodeBtn) {
        sendCodeBtn.addEventListener('click', async () => {
            const email = document.getElementById('forgotEmail').value.trim();
            const alertEl = document.getElementById('forgotAlert');
            const alertMsg = document.getElementById('forgotAlertMessage');
            alertEl.classList.add('hidden');

            if (!email) {
                alertMsg.textContent = 'Please provide your email';
                alertEl.classList.remove('hidden');
                return;
            }

            try {
                const resp = await fetch('/api/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await resp.json();
                if (resp.ok) {
                    alert(data.message);
                    // show next step
                    step1.style.display = 'none';
                    step2.style.display = 'block';
                } else {
                    alertMsg.textContent = data.message || 'Error sending code';
                    alertEl.classList.remove('hidden');
                }
            } catch (err) {
                alertMsg.textContent = 'Connection error';
                alertEl.classList.remove('hidden');
            }
        });
    }

    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgotEmail').value.trim();
            const code = document.getElementById('verificationCode').value.trim();
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const alertEl = document.getElementById('forgotAlert');
            const alertMsg = document.getElementById('forgotAlertMessage');

            alertEl.classList.add('hidden');
            if (!code) {
                alertMsg.textContent = 'Please enter the verification code';
                alertEl.classList.remove('hidden');
                return;
            }
            if (newPassword !== confirmPassword) {
                alertMsg.textContent = 'Passwords do not match';
                alertEl.classList.remove('hidden');
                return;
            }

            try {
                const resp = await fetch('/api/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, code, newPassword, confirmPassword })
                });
                const data = await resp.json();
                if (resp.ok) {
                    alert('Password has been reset. You can now log in with your new password.');
                    window.location.href = '/';
                } else {
                    alertMsg.textContent = data.message || 'Error resetting password';
                    alertEl.classList.remove('hidden');
                }
            } catch (err) {
                alertMsg.textContent = 'Connection error';
                alertEl.classList.remove('hidden');
            }
        });
    }
}

// ==========================================
// SIGNUP PAGE
// ==========================================

if (window.location.pathname === '/signup.html') {
    // Load custom branding
    loadBranding();

    // Password toggles
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    if (togglePassword) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    if (toggleConfirmPassword) {
        toggleConfirmPassword.addEventListener('click', function () {
            const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            confirmPasswordInput.setAttribute('type', type);
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    // Password strength checker
    if (passwordInput) {
        passwordInput.addEventListener('input', function () {
            const password = this.value;
            const strengthBar = document.getElementById('passwordStrengthBar');
            const strengthText = document.getElementById('passwordStrengthText');
            const strengthContainer = document.getElementById('passwordStrength');

            if (password.length === 0) {
                strengthContainer.classList.remove('active');
                return;
            }

            strengthContainer.classList.add('active');

            let strength = 0;
            if (password.length >= 6) strength++;
            if (password.length >= 10) strength++;
            if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
            if (/[0-9]/.test(password)) strength++;
            if (/[^a-zA-Z0-9]/.test(password)) strength++;

            // Remove all classes
            strengthBar.classList.remove('weak', 'medium', 'strong');

            if (strength <= 2) {
                strengthBar.classList.add('weak');
                strengthText.innerHTML = '<span style="color: var(--danger)">Weak</span>';
            } else if (strength <= 4) {
                strengthBar.classList.add('medium');
                strengthText.innerHTML = '<span style="color: #f57c00">Medium</span>';
            } else {
                strengthBar.classList.add('strong');
                strengthText.innerHTML = '<span style="color: #00838f">Strong</span>';
            }
        });
    }

    // Signup form submission
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const agreeTerms = document.getElementById('agreeTerms').checked;

            // Validation
            let hasError = false;

            if (!fullName.trim()) {
                document.getElementById('nameError').classList.add('active');
                hasError = true;
            } else {
                document.getElementById('nameError').classList.remove('active');
            }

            if (!email.includes('@')) {
                document.getElementById('emailError').classList.add('active');
                hasError = true;
            } else {
                document.getElementById('emailError').classList.remove('active');
            }

            if (password.length < 6) {
                document.getElementById('passwordError').classList.add('active');
                hasError = true;
            } else {
                document.getElementById('passwordError').classList.remove('active');
            }

            if (password !== confirmPassword) {
                document.getElementById('confirmPasswordError').classList.add('active');
                hasError = true;
            } else {
                document.getElementById('confirmPasswordError').classList.remove('active');
            }

            if (!agreeTerms) {
                alert('Please agree to the terms and conditions');
                hasError = true;
            }

            if (hasError) return;

            const signupAlert = document.getElementById('signupAlert');
            signupAlert.classList.add('hidden');

            try {
                const response = await fetch('/api/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ fullName, email, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    // Show success message
                    document.getElementById('signupFormContainer').classList.add('hidden');
                    document.getElementById('successMessage').classList.remove('hidden');

                    // Redirect to login after 2 seconds
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                } else {
                    // Show error
                    document.getElementById('signupAlertMessage').textContent = data.message || 'Error creating account';
                    signupAlert.classList.remove('hidden');
                }
            } catch (error) {
                document.getElementById('signupAlertMessage').textContent = 'Connection error. Please try again.';
                signupAlert.classList.remove('hidden');
            }
        });
    }
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { checkAuth, requireAuth, logout, loadBranding };
}
