const config = {
    apiUrl: 'http://localhost:3000/api',
    endpoints: {
        auth: {
            login: '/auth/login',
            register: '/auth/register',
            profile: '/auth/me'
        },
        events: {
            list: '/events',
            create: '/events',
            get: (id) => `/events/${id}`,
            update: (id) => `/events/${id}`,
            delete: (id) => `/events/${id}`,
            myEvents: '/events/my-events'
        },
        registrations: {
            list: '/registrations/my-registrations',
            register: (eventId) => `/registrations/${eventId}`,
            cancel: (eventId) => `/registrations/${eventId}`,
            event: (eventId) => `/registrations/event/${eventId}`,
            update: (registrationId) => `/registrations/${registrationId}`
        },
        profiles: {
            get: '/profiles/me',
            update: '/profiles/me'
        }
    }
};

// Helper function to handle API calls
async function apiCall(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem('token');
    
    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${config.apiUrl}${endpoint}`;
    console.log('Making API call to:', url);

    const options = {
        method,
        headers
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        console.log('API call options:', { url, method, headers });
        const response = await fetch(url, options);
        
        // Handle 401 Unauthorized by redirecting to login
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            throw new Error('Please log in again');
        }
        
        const result = await response.json();
        console.log('API response:', { status: response.status, data: result });

        if (!response.ok) {
            throw new Error(result.error || 'Something went wrong');
        }

        return result;
    } catch (error) {
        console.error('API Call Error:', error);
        throw error;
    }
}

// Check authentication status
function isAuthenticated() {
    return !!localStorage.getItem('token');
}

// Get user role
function getUserRole() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role;
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
        loginLink.style.display = 'none';
        registerLink.style.display = 'none';
        profileLink.style.display = 'inline-block';
        logoutLink.style.display = 'inline-block';
        if (createEventBtn) {
            createEventBtn.style.display = 'block';
        }
    } else {
        loginLink.style.display = 'inline-block';
        registerLink.style.display = 'inline-block';
        profileLink.style.display = 'none';
        logoutLink.style.display = 'none';
        if (createEventBtn) {
            createEventBtn.style.display = 'none';
        }
    }
} 