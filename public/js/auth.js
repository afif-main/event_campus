// Show error message with animation
function showError(message, errorElement) {
    errorElement.textContent = message;
    errorElement.classList.add('visible');
    errorElement.style.animation = 'none';
    errorElement.offsetHeight; // Trigger reflow
    errorElement.style.animation = 'slideIn 0.3s ease-out';
}

// Set loading state for form button
function setLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.classList.add('loading');
    } else {
        button.disabled = false;
        button.classList.remove('loading');
    }
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorMessage = document.getElementById('errorMessage');
    
    try {
        setLoading(submitButton, true);
        errorMessage.classList.remove('visible');
        
        const formData = {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value
        };

        if (!formData.email) {
            throw new Error('Please enter your email address');
        }

        const response = await apiCall(config.endpoints.auth.login, 'POST', formData);
        
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Update navigation before redirecting
        updateNavigation();
        
        window.location.href = 'events.html';
    } catch (error) {
        showError(error.message, errorMessage);
    } finally {
        setLoading(submitButton, false);
    }
}

// Handle registration form submission
async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorMessage = document.getElementById('errorMessage');
    
    try {
        setLoading(submitButton, true);
        errorMessage.classList.remove('visible');
        
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const email = document.getElementById('email').value.trim();
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const role = document.getElementById('role').value;

        // Validation
        if (!email) throw new Error('Please enter your email address');
        if (!firstName) throw new Error('Please enter your first name');
        if (!lastName) throw new Error('Please enter your last name');
        if (!role) throw new Error('Please select your role');
        if (!password) throw new Error('Please enter a password');
        if (password.length < 6) throw new Error('Password must be at least 6 characters long');
        if (password !== confirmPassword) throw new Error('Passwords do not match');

        const formData = {
            email,
            password,
            firstName,
            lastName,
            role
        };

        const response = await apiCall(config.endpoints.auth.register, 'POST', formData);
        
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Update navigation before redirecting
        updateNavigation();
        
        window.location.href = 'events.html';
    } catch (error) {
        showError(error.message, errorMessage);
    } finally {
        setLoading(submitButton, false);
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Update navigation before redirecting
    updateNavigation();
    window.location.href = 'index.html';
}

// Update navigation based on auth status
function updateNavigation() {
    const isAuth = isAuthenticated();
    const loginLink = document.getElementById('loginLink');
    const registerLink = document.getElementById('registerLink');
    const profileLink = document.getElementById('profileLink');
    const logoutLink = document.getElementById('logoutLink');
    const createEventBtn = document.getElementById('createEventBtn');

    if (isAuth) {
        if (loginLink) loginLink.style.display = 'none';
        if (registerLink) registerLink.style.display = 'none';
        if (profileLink) {
            profileLink.style.display = 'inline-block';
            profileLink.href = 'profile.html';
        }
        if (logoutLink) logoutLink.style.display = 'inline-block';
        if (createEventBtn && isStaffMember()) {
            createEventBtn.style.display = 'block';
        }
    } else {
        if (loginLink) loginLink.style.display = 'inline-block';
        if (registerLink) registerLink.style.display = 'inline-block';
        if (profileLink) profileLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'none';
        if (createEventBtn) createEventBtn.style.display = 'none';
    }
}

// Check if user is authenticated
function isAuthenticated() {
    return !!localStorage.getItem('token');
}

// Check if user is staff member
function isStaffMember() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role === 'staff' || user.role === 'admin';
}

// Initialize auth-related elements
document.addEventListener('DOMContentLoaded', () => {
    // Call updateNavigation immediately
    updateNavigation();

    // Set up event listeners
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }

    // Add profile link handler
    const profileLink = document.getElementById('profileLink');
    if (profileLink) {
        profileLink.addEventListener('click', (e) => {
            if (!isAuthenticated()) {
                e.preventDefault();
                window.location.href = 'login.html';
            }
        });
    }

    // Add input validation handlers
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (passwordInput && confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', () => {
            if (passwordInput.value !== confirmPasswordInput.value) {
                confirmPasswordInput.setCustomValidity('Passwords do not match');
            } else {
                confirmPasswordInput.setCustomValidity('');
            }
        });

        passwordInput.addEventListener('input', () => {
            if (confirmPasswordInput.value && passwordInput.value !== confirmPasswordInput.value) {
                confirmPasswordInput.setCustomValidity('Passwords do not match');
            } else {
                confirmPasswordInput.setCustomValidity('');
            }
        });
    }
}); 