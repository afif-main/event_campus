// Global variables for pagination
let currentPage = 1;
let totalPages = 1;

// Load events with filters
async function loadEvents(page = 1, filters = {}) {
    const eventsGrid = document.getElementById('eventsGrid');
    try {
        // Show loading state
        eventsGrid.innerHTML = '<div class="loading">Loading events...</div>';
        
        const queryParams = new URLSearchParams({
            page,
            ...filters
        });

        console.log('Fetching events with params:', queryParams.toString());

        const response = await apiCall(`${config.endpoints.events.list}?${queryParams}`);
        console.log('Events response:', response);
        
        currentPage = parseInt(response.currentPage);
        totalPages = parseInt(response.totalPages);
        
        if (!response.events || response.events.length === 0) {
            eventsGrid.innerHTML = '<div class="no-events">No events found</div>';
            return;
        }
        
        displayEvents(response.events, false);
        updatePagination();
    } catch (error) {
        console.error('Error loading events:', error);
        eventsGrid.innerHTML = `
            <div class="error-message">
                ${error.message || 'Error loading events. Please try again later.'}
            </div>
        `;
    }
}

// Display events in the grid
function displayEvents(events, isProfilePage = false) {
    console.log('Displaying events:', events.length);
    const eventsGrid = document.getElementById('eventsGrid');
    eventsGrid.innerHTML = '';

    events.forEach(event => {
        const eventCard = createEventCard(event, isProfilePage);
        eventsGrid.appendChild(eventCard);
    });
}

// Check if user has organizer privileges
function isOrganizer() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role === 'organizer' || user.role === 'admin';
}

// Get current user ID from localStorage
function getCurrentUserId() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || null;
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
    `;

    content.appendChild(title);
    content.appendChild(description);
    content.appendChild(meta);
    content.appendChild(details);

    if (isAuthenticated()) {
        const actions = document.createElement('div');
        actions.className = 'event-actions';
        
        if (isStaffMember() && event.organizerId === getCurrentUserId()) {
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.onclick = () => editEvent(event);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => deleteEvent(event.id);

            // Only show View Registrations button on profile page
            if (isProfilePage) {
                const viewRegistrationsButton = document.createElement('button');
                viewRegistrationsButton.textContent = 'View Registrations';
                viewRegistrationsButton.onclick = () => viewEventRegistrations(event.id);
                actions.appendChild(viewRegistrationsButton);
            }

            actions.appendChild(editButton);
            actions.appendChild(deleteButton);
        }

        // Check if user is already registered
        const registrationStatus = window.userRegistrations?.get(event.id);
        
        if (registrationStatus) {
            // Show registration status and cancel button if not already cancelled
            const statusText = document.createElement('p');
            statusText.className = 'registration-status';
            statusText.textContent = `Registration Status: ${registrationStatus}`;
            actions.appendChild(statusText);
            
            if (registrationStatus !== 'cancelled') {
                const cancelButton = document.createElement('button');
                cancelButton.textContent = 'Cancel Registration';
                cancelButton.onclick = () => cancelRegistration(event.id);
                actions.appendChild(cancelButton);
            }
        } else {
            const registerButton = document.createElement('button');
            registerButton.textContent = 'Register';
            registerButton.onclick = () => registerForEvent(event.id);
            
            // Check if registration deadline has passed
            if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
                registerButton.disabled = true;
                registerButton.title = 'Registration deadline has passed';
            }
            
            actions.appendChild(registerButton);
        }
        
        content.appendChild(actions);
    }

    card.appendChild(content);
    return card;
}

// Update pagination controls
function updatePagination() {
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    const currentPageSpan = document.getElementById('currentPage');

    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
    currentPageSpan.textContent = `Page ${currentPage}`;
}

// Handle event creation
async function handleCreateEvent(event) {
    event.preventDefault();
    
    if (!isStaffMember()) {
        alert('Only staff members can create events.');
        return;
    }
    
    try {
        const submitButton = event.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Creating...';
        
        const formData = new FormData();
        formData.append('title', document.getElementById('title').value);
        formData.append('description', document.getElementById('description').value);
        formData.append('category', document.getElementById('category').value);
        formData.append('date', document.getElementById('date').value);
        formData.append('startTime', document.getElementById('startTime').value);
        formData.append('endTime', document.getElementById('endTime').value);
        formData.append('location', document.getElementById('location').value);
        formData.append('status', document.getElementById('status').value);
        
        if (document.getElementById('capacity').value) {
            formData.append('capacity', document.getElementById('capacity').value);
        }
        
        if (document.getElementById('registrationDeadline').value) {
            formData.append('registrationDeadline', document.getElementById('registrationDeadline').value);
        }

        const imageFile = document.getElementById('image').files[0];
        if (imageFile) {
            // Validate file size (2MB max)
            if (imageFile.size > 2 * 1024 * 1024) {
                throw new Error('Image file size must be less than 2MB');
            }
            formData.append('image', imageFile);
        }

        const response = await fetch(`${config.apiUrl}${config.endpoints.events.create}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error creating event');
        }

        await response.json();
        closeModal();
        loadEvents();
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.textContent = 'Event created successfully!';
        document.querySelector('.events-header').appendChild(successMessage);
        
        // Remove success message after 3 seconds
        setTimeout(() => {
            successMessage.remove();
        }, 3000);
    } catch (error) {
        console.error('Error creating event:', error);
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = error.message || 'Error creating event. Please try again.';
        document.getElementById('createEventForm').insertBefore(errorMessage, document.querySelector('.form-group'));
    } finally {
        const submitButton = document.querySelector('#createEventForm button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Create Event';
        }
    }
}

// Handle event deletion
async function deleteEvent(eventId) {
    if (confirm('Are you sure you want to delete this event?')) {
        try {
            await apiCall(config.endpoints.events.delete(eventId), 'DELETE');
            loadEvents(currentPage);
        } catch (error) {
            console.error('Error deleting event:', error);
        }
    }
}

// Modal functions
function openModal() {
    const modal = document.getElementById('createEventModal');
    modal.style.display = 'block';
    modal.querySelector('h2').textContent = 'Create New Event';
    
    // Reset form
    document.getElementById('createEventForm').reset();
    const submitButton = modal.querySelector('button[type="submit"]');
    submitButton.textContent = 'Create Event';
}

function closeModal() {
    const modal = document.getElementById('createEventModal');
    modal.style.display = 'none';
    modal.querySelector('h2').textContent = 'Create New Event';
    
    // Reset form
    document.getElementById('createEventForm').reset();
    const submitButton = modal.querySelector('button[type="submit"]');
    submitButton.textContent = 'Create Event';
    
    // Reset form submission handler
    const form = document.getElementById('createEventForm');
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    newForm.addEventListener('submit', handleCreateEvent);
}

// Register for event
async function registerForEvent(eventId) {
    try {
        const response = await apiCall(config.endpoints.registrations.register(eventId), 'POST');
        if (response.message) {
            alert(response.message); // Show waitlist message if applicable
        } else {
            alert('Successfully registered for the event!');
        }
        await loadUserRegistrations(); // Reload registrations to update UI
    } catch (error) {
        alert(error.message || 'Error registering for event');
    }
}

// Cancel registration
async function cancelRegistration(eventId) {
    if (confirm('Are you sure you want to cancel your registration?')) {
        try {
            await apiCall(config.endpoints.registrations.cancel(eventId), 'DELETE');
            
            // Update the registration status cache
            if (window.userRegistrations) {
                window.userRegistrations.set(eventId, 'cancelled');
            }
            
            alert('Registration cancelled successfully');
            loadEvents(currentPage);
        } catch (error) {
            alert(error.message);
        }
    }
}

// Load user's registrations
async function loadUserRegistrations() {
    if (!isAuthenticated()) return;
    
    try {
        const registrations = await apiCall(config.endpoints.registrations.list);
        // Store registered event IDs for reference
        window.userRegistrations = new Map(registrations.map(reg => [reg.eventId, reg.status]));
        // Refresh the events display to update registration buttons
        loadEvents(currentPage);
    } catch (error) {
        console.error('Error loading registrations:', error);
        // Don't throw the error, just log it and continue
        window.userRegistrations = new Map();
    }
}

// View event registrations (staff only)
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

// Edit event
async function editEvent(event) {
    // Populate the modal with event data
    const modal = document.getElementById('createEventModal');
    modal.style.display = 'block';
    
    // Update modal title
    modal.querySelector('h2').textContent = 'Edit Event';
    
    // Populate form fields
    document.getElementById('title').value = event.title;
    document.getElementById('description').value = event.description;
    document.getElementById('category').value = event.category;
    document.getElementById('date').value = event.date;
    document.getElementById('startTime').value = event.startTime;
    document.getElementById('endTime').value = event.endTime;
    document.getElementById('location').value = event.location;
    document.getElementById('capacity').value = event.capacity || '';
    document.getElementById('registrationDeadline').value = event.registrationDeadline ? new Date(event.registrationDeadline).toISOString().slice(0, 16) : '';

    // Change form submission handler for edit
    const form = document.getElementById('createEventForm');
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.textContent = 'Update Event';
    
    // Remove any existing event listeners
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // Add new submit handler for edit
    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleEditEvent(event.id);
    });
}

// Handle event edit
async function handleEditEvent(eventId) {
    try {
        const submitButton = document.querySelector('#createEventForm button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Updating...';
        
        const formData = {
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            category: document.getElementById('category').value,
            date: document.getElementById('date').value,
            startTime: document.getElementById('startTime').value,
            endTime: document.getElementById('endTime').value,
            location: document.getElementById('location').value,
            capacity: document.getElementById('capacity').value || null,
            registrationDeadline: document.getElementById('registrationDeadline').value || null
        };

        await apiCall(config.endpoints.events.update(eventId), 'PUT', formData);
        closeModal();
        loadEvents(currentPage);
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.textContent = 'Event updated successfully!';
        document.querySelector('.events-header').appendChild(successMessage);
        
        // Remove success message after 3 seconds
        setTimeout(() => {
            successMessage.remove();
        }, 3000);
    } catch (error) {
        console.error('Error updating event:', error);
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = error.message || 'Error updating event. Please try again.';
        document.getElementById('createEventForm').insertBefore(errorMessage, document.querySelector('.form-group'));
    } finally {
        const submitButton = document.querySelector('#createEventForm button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Update Event';
        }
    }
}

// Initialize events page
document.addEventListener('DOMContentLoaded', () => {
    // Show/hide create event button based on role
    const createEventBtn = document.getElementById('createEventBtn');
    if (createEventBtn) {
        if (isAuthenticated() && isStaffMember()) {
            createEventBtn.style.display = 'block';
        } else {
            createEventBtn.style.display = 'none';
        }
    }

    updateNavigation();
    loadEvents();
    loadUserRegistrations();

    // Event listeners for pagination
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            loadEvents(currentPage - 1);
        }
    });

    document.getElementById('nextPage').addEventListener('click', () => {
        if (currentPage < totalPages) {
            loadEvents(currentPage + 1);
        }
    });

    // Event listeners for create event modal
    const createEventModal = document.getElementById('createEventModal');
    const closeBtn = document.querySelector('.close');
    const createEventForm = document.getElementById('createEventForm');

    if (createEventBtn) {
        createEventBtn.addEventListener('click', () => {
            if (isAuthenticated() && isStaffMember()) {
                openModal();
            } else if (isAuthenticated()) {
                alert('Only staff members can create events.');
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    // Add form submit event listener
    if (createEventForm) {
        createEventForm.addEventListener('submit', handleCreateEvent);
    }

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === createEventModal) {
            closeModal();
        }
    });

    // Event listeners for filters
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const dateFilter = document.getElementById('dateFilter');

    const applyFilters = () => {
        const filters = {
            search: searchInput.value,
            category: categoryFilter.value,
            date: dateFilter.value
        };
        loadEvents(1, filters);
    };

    searchInput.addEventListener('input', applyFilters);
    categoryFilter.addEventListener('change', applyFilters);
    dateFilter.addEventListener('change', applyFilters);
}); 