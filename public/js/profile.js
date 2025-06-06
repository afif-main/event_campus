// Check authentication status
async function checkAuth() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found');
        }
        
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Invalid or expired token');
        }
        
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        redirectToLogin();
        return false;
    }
}

// Redirect to login page
function redirectToLogin() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
}

// Load and display profile data
async function loadProfile() {
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading';
    loadingIndicator.innerHTML = '<div class="spinner"></div><span>Loading profile...</span>';
    document.querySelector('.profile-container').prepend(loadingIndicator);

    try {
        // Check authentication first
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) return;

        const response = await apiCall(config.endpoints.auth.profile);
        const { user } = response;
        
        // Update profile information
        document.getElementById('profileName').textContent = `${user.firstName} ${user.lastName}`;
        document.getElementById('profileEmail').textContent = user.email || '';
        document.getElementById('profileRole').textContent = user.role || 'Student';
        
        // Update avatar
        updateAvatar(user);
        
        // Load registrations
        await loadRegistrations();
        
        // Show staff/organizer sections if applicable
        if (user.role === 'staff' || user.role === 'organizer') {
            const staffSection = document.getElementById('myEventsSection');
            if (staffSection) {
                staffSection.style.display = 'block';
                await loadMyEvents();
            }
        }

        // Remove loading indicator
        loadingIndicator.remove();
    } catch (error) {
        console.error('Error loading profile:', error);
        
        // Remove loading indicator
        loadingIndicator.remove();
        
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="error-icon">
                    <path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clip-rule="evenodd" />
                </svg>
                <span>${error.message}</span>
            </div>
            <button onclick="location.reload()" class="retry-button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="retry-icon">
                    <path fill-rule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z" clip-rule="evenodd" />
                </svg>
                Retry
            </button>
        `;
        document.querySelector('.profile-container').prepend(errorDiv);

        // If unauthorized, redirect to login after a short delay
        if (error.message.toLowerCase().includes('log in')) {
            setTimeout(redirectToLogin, 2000);
        }
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message visible';
    errorDiv.textContent = message;
    document.querySelector('main').prepend(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.opacity = '0';
        setTimeout(() => errorDiv.remove(), 300);
    }, 3000);
}

// Check if user has staff privileges
function isStaffMember() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role === 'staff' || user.role === 'organizer' || user.role === 'admin';
}

// Get user initials for avatar
function getInitials(firstName, lastName) {
    const first = (firstName || '').charAt(0);
    const last = (lastName || '').charAt(0);
    return (first + last).toUpperCase();
}

// Update profile avatar
function updateAvatar(user) {
    const avatar = document.getElementById('profileAvatar');
    if (!avatar) return;

    if (user.avatarUrl) {
        avatar.style.backgroundImage = `url(${user.avatarUrl})`;
        avatar.textContent = '';
    } else {
        avatar.style.backgroundImage = 'none';
        avatar.textContent = getInitials(user.firstName, user.lastName);
    }
}

// Display profile information
function displayProfile(user) {
    if (!user) {
        console.error('No user data provided to displayProfile');
        return;
    }

    // Update profile header
    const profileName = document.getElementById('profileName');
    const profileRole = document.getElementById('profileRole');
    const profileEmail = document.getElementById('profileEmail');
    const profileAvatar = document.getElementById('profileAvatar');

    if (profileName) {
        profileName.textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
    }
    
    if (profileRole) {
        profileRole.textContent = (user.role || '').charAt(0).toUpperCase() + (user.role || '').slice(1);
    }
    
    if (profileEmail) {
        profileEmail.textContent = user.email;
    }
    
    if (profileAvatar) {
        updateAvatar(user);
    }

    // Update edit form if it exists
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    if (firstNameInput) firstNameInput.value = user.firstName || '';
    if (lastNameInput) lastNameInput.value = user.lastName || '';
}

// Load events created by the user
async function loadMyEvents() {
    const myEventsList = document.getElementById('myEventsList');
    if (!myEventsList) return;

    try {
        myEventsList.innerHTML = '<div class="loading">Loading your events...</div>';
        const response = await apiCall(config.endpoints.events.myEvents);
        displayMyEvents(response);
    } catch (error) {
        console.error('Error loading my events:', error);
        myEventsList.innerHTML = '<div class="error-message visible">Error loading your events. Please try again later.</div>';
    }
}

// Display events created by the user
function displayMyEvents(events) {
    const myEventsList = document.getElementById('myEventsList');
    myEventsList.innerHTML = '';

    if (!events || events.length === 0) {
        myEventsList.innerHTML = '<div class="no-events">You haven\'t created any events yet.</div>';
        return;
    }

    events.forEach(event => {
        const eventCard = createEventCard(event, true);
        myEventsList.appendChild(eventCard);
    });
}

// Create event card element
function createEventCard(event, isProfilePage = false) {
    const card = document.createElement('div');
    card.className = 'event-card';

    // Add image if available
    if (event.image) {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'event-image-container';
        const image = document.createElement('img');
        // Handle both absolute and relative paths
        image.src = event.image.startsWith('/') ? event.image.substring(1) : event.image;
        image.alt = event.title;
        image.className = 'event-image';
        imageContainer.appendChild(image);
        card.appendChild(imageContainer);
    }

    const content = document.createElement('div');
    content.className = 'event-content';

    const title = document.createElement('h3');
    title.className = 'event-title';
    title.textContent = event.title;

    const description = document.createElement('p');
    description.className = 'event-description';
    description.textContent = event.description;

    const meta = document.createElement('div');
    meta.className = 'event-meta';
    meta.innerHTML = `
        <div class="event-category">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 2a1 1 0 0 1 1 1v2h2a1 1 0 1 1 0 2H9v2a1 1 0 1 1-2 0V7H5a1 1 0 1 1 0-2h2V3a1 1 0 0 1 1-1z"/>
            </svg>
            ${event.category}
        </div>
        <div class="event-location">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 1a3 3 0 0 1 3 3c0 2-3 5-3 5S5 6 5 4a3 3 0 0 1 3-3z"/>
            </svg>
            ${event.location}
        </div>
    `;

    const details = document.createElement('div');
    details.className = 'event-details';
    details.innerHTML = `
        <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
        <p><strong>Time:</strong> ${event.startTime} - ${event.endTime}</p>
        ${event.capacity ? `<p><strong>Capacity:</strong> ${event.capacity}</p>` : ''}
        ${event.registrationDeadline ? 
          `<p><strong>Registration Deadline:</strong> ${new Date(event.registrationDeadline).toLocaleDateString()}</p>` 
          : ''}
        <p><strong>Status:</strong> ${event.status}</p>
    `;

    content.appendChild(title);
    content.appendChild(description);
    content.appendChild(meta);
    content.appendChild(details);

    // Add action buttons
    const actions = document.createElement('div');
    actions.className = 'event-actions';

    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.onclick = () => window.location.href = `events.html?edit=${event.id}`;

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = () => deleteEvent(event.id);

    const viewRegistrationsButton = document.createElement('button');
    viewRegistrationsButton.textContent = 'View Registrations';
    viewRegistrationsButton.onclick = () => viewEventRegistrations(event.id);

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    actions.appendChild(viewRegistrationsButton);
    content.appendChild(actions);

    card.appendChild(content);
    return card;
}

// View event registrations
async function viewEventRegistrations(eventId) {
    try {
        const registrations = await apiCall(config.endpoints.registrations.event(eventId));
        showRegistrationsModal(registrations, eventId);
    } catch (error) {
        alert(error.message || 'Error fetching registrations');
    }
}

// Show registrations modal
function showRegistrationsModal(registrations, eventId) {
    const modal = document.createElement('div');
    modal.className = 'modal registrations-modal';
    modal.id = 'registrationsModal';
    modal.dataset.eventId = eventId;

    const content = document.createElement('div');
    content.className = 'modal-content';

    const header = document.createElement('div');
    header.className = 'modal-header';
    
    const title = document.createElement('h2');
    title.textContent = 'Event Registrations';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-button';
    closeBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clip-rule="evenodd" />
        </svg>
    `;
    closeBtn.onclick = () => modal.remove();

    header.appendChild(title);
    header.appendChild(closeBtn);

    const table = document.createElement('div');
    table.className = 'registrations-table';

    // Table header
    const tableHeader = document.createElement('div');
    tableHeader.className = 'table-header';
    tableHeader.innerHTML = `
        <div class="table-row header">
            <div class="table-cell">Name</div>
            <div class="table-cell">Email</div>
            <div class="table-cell">Status</div>
            <div class="table-cell">Registration Date</div>
            <div class="table-cell">Actions</div>
        </div>
    `;

    // Table body
    const tableBody = document.createElement('div');
    tableBody.className = 'table-body';

    registrations.forEach(reg => {
        const row = document.createElement('div');
        row.className = 'table-row';
        row.dataset.status = reg.status;

        const formattedDate = new Date(reg.registrationDate).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        row.innerHTML = `
            <div class="table-cell">${reg.User.firstName} ${reg.User.lastName}</div>
            <div class="table-cell">${reg.User.email}</div>
            <div class="table-cell">
                <select class="status-select status-${reg.status}" onchange="updateRegistrationStatus('${reg.id}', this.value)">
                    <option value="pending" ${reg.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="confirmed" ${reg.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="waitlisted" ${reg.status === 'waitlisted' ? 'selected' : ''}>Waitlisted</option>
                    <option value="cancelled" ${reg.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </div>
            <div class="table-cell">${formattedDate}</div>
            <div class="table-cell">
                <button class="action-button delete-button" onclick="updateRegistrationStatus('${reg.id}', 'cancelled')" title="Cancel registration">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path fill-rule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        `;

        tableBody.appendChild(row);
    });

    table.appendChild(tableHeader);
    table.appendChild(tableBody);
    
    content.appendChild(header);
    content.appendChild(table);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Close modal when clicking outside
    modal.onclick = (event) => {
        if (event.target === modal) {
            modal.remove();
        }
    };
}

// Update registration status
async function updateRegistrationStatus(registrationId, status) {
    try {
        await apiCall(config.endpoints.registrations.update(registrationId), 'PUT', { status });
        // Refresh the registrations list
        const eventId = document.querySelector('#registrationsModal').dataset.eventId;
        viewEventRegistrations(eventId);
    } catch (error) {
        alert(error.message || 'Error updating registration');
    }
}

// Load user registrations
async function loadRegistrations() {
    const registrationsList = document.getElementById('registrationsList');
    if (!registrationsList) return;

    try {
        registrationsList.innerHTML = '<div class="loading">Loading your registrations...</div>';
        const registrations = await apiCall(config.endpoints.registrations.list);
        displayRegistrations(registrations);
    } catch (error) {
        console.error('Error loading registrations:', error);
        registrationsList.innerHTML = '<div class="error-message visible">Error loading your registrations. Please try again later.</div>';
    }
}

// Display user registrations
function displayRegistrations(registrations) {
    const registrationsList = document.getElementById('registrationsList');
    if (!registrationsList) return;

    if (!registrations || registrations.length === 0) {
        registrationsList.innerHTML = '<div class="no-registrations">You haven\'t registered for any events yet.</div>';
        return;
    }

    registrationsList.innerHTML = '';
    registrations.forEach(registration => {
        const card = document.createElement('div');
        card.className = 'registration-card';
        
        const event = registration.Event;
        const status = registration.status || 'pending';
        
        // Only show cancel button if status is not 'cancelled'
        const cancelButton = status.toLowerCase() !== 'cancelled' ? `
            <div class="registration-actions">
                <button onclick="cancelRegistration('${event.id}')" class="cancel-button">
                    Cancel Registration
                </button>
            </div>
        ` : '';

        card.innerHTML = `
            <h3>${event.title}</h3>
            <div class="registration-details">
                <div class="registration-detail">
                    <span>Date</span>
                    <span>${new Date(event.date).toLocaleDateString()}</span>
                </div>
                <div class="registration-detail">
                    <span>Time</span>
                    <span>${event.startTime} - ${event.endTime}</span>
                </div>
                <div class="registration-detail">
                    <span>Location</span>
                    <span>${event.location}</span>
                </div>
                <div class="registration-detail">
                    <span>Status</span>
                    <span class="status-badge ${status.toLowerCase()}">${status}</span>
                </div>
            </div>
            ${cancelButton}
        `;
        
        registrationsList.appendChild(card);
    });
}

// Cancel registration
async function cancelRegistration(eventId) {
    if (!confirm('Are you sure you want to cancel this registration?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/registrations/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to cancel registration');
        }

        // Update the registration status cache
        if (window.userRegistrations) {
            window.userRegistrations.set(eventId, 'cancelled');
        }

        // Reload registrations to update the list
        await loadRegistrations();
        
        // Show success message
        alert('Registration cancelled successfully');
    } catch (error) {
        console.error('Error cancelling registration:', error);
        alert('Error cancelling registration. Please try again.');
    }
}

// Delete event
async function deleteEvent(eventId) {
    if (confirm('Are you sure you want to delete this event?')) {
        try {
            await apiCall(config.endpoints.events.delete(eventId), 'DELETE');
            loadMyEvents();
        } catch (error) {
            alert(error.message);
        }
    }
}

// Handle profile edit
async function handleProfileEdit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.style.display = 'none';
    
    try {
        submitButton.disabled = true;
        submitButton.textContent = 'Saving...';
        
        // Get form data
        const formData = {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            currentPassword: document.getElementById('currentPassword').value,
            newPassword: document.getElementById('newPassword').value,
            confirmPassword: document.getElementById('confirmPassword').value
        };

        // Validate password fields
        if (formData.newPassword && !formData.currentPassword) {
            throw new Error('Current password is required to change password');
        }

        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            throw new Error('New passwords do not match');
        }

        // Prepare data for API call
        const updateData = {
            firstName: formData.firstName,
            lastName: formData.lastName
        };

        // Add password data if changing password
        if (formData.newPassword) {
            updateData.currentPassword = formData.currentPassword;
            updateData.newPassword = formData.newPassword;
        }

        const response = await apiCall(config.endpoints.profiles.update, 'PUT', updateData);
        
        // Update stored user data
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userData.firstName = formData.firstName;
        userData.lastName = formData.lastName;
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Update display
        displayProfile(userData);
        closeModal();
        showError('Profile updated successfully');
    } catch (error) {
        errorMessage.textContent = error.message || 'Error updating profile';
        errorMessage.style.display = 'block';
        form.insertBefore(errorMessage, form.firstChild);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Save Changes';
    }
}

// Modal functions
function openModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
    modal.style.display = 'block';
        setTimeout(() => modal.classList.add('visible'), 10);
    }
}

function closeModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

// Initialize theme and profile on page load
document.addEventListener('DOMContentLoaded', () => {
    // Update navigation first
    updateNavigation();
    
    // Load profile data
    loadProfile();

    // Set up modal events
    const editBtn = document.getElementById('editProfileBtn');
    const closeBtn = document.querySelector('.modal .close');
    const modal = document.getElementById('editProfileModal');
    const form = document.getElementById('editProfileForm');

    if (editBtn) editBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
    if (form) form.addEventListener('submit', handleProfileEdit);
});

// Check if user is authenticated
function isAuthenticated() {
    return !!localStorage.getItem('token');
}

// Get current user ID from localStorage
function getCurrentUserId() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || null;
} 