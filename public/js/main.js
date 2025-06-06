const API_BASE_URL = 'http://localhost:3000/api';

// API endpoints
const EVENTS_ENDPOINT = `${API_BASE_URL}${config.endpoints.events.list}`;

// Function to format date
function formatDate(dateString) {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Function to create event card HTML
function createEventCard(event) {
    const eventDate = new Date(`${event.date}T${event.startTime}`);
    
    return `
        <div class="event-card" data-event-id="${event.id}">
            ${event.image ? `
            <div class="event-image-container">
                <img src="${event.image}" alt="${event.title}" class="event-image">
            </div>
            ` : ''}
            <div class="event-content">
                <h3 class="event-title">${event.title}</h3>
                <p class="event-description">${event.description}</p>
                <div class="event-meta">
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
                </div>
                <div class="event-footer">
                    <div class="event-datetime">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                        </svg>
                        ${formatDate(eventDate)}
                    </div>
                    <div class="event-actions">
                        <button class="event-button primary" onclick="registerForEvent('${event.id}')">Register Now</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Function to fetch upcoming events
async function fetchUpcomingEvents() {
    try {
        const response = await fetch(`${EVENTS_ENDPOINT}?limit=3`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('Server response:', response.status, response.statusText);
            const errorData = await response.text();
            console.error('Error data:', errorData);
            throw new Error('Failed to fetch events');
        }
        
        const data = await response.json();
        console.log('Fetched events:', data);
        return data.events;
    } catch (error) {
        console.error('Error fetching upcoming events:', error);
        return [];
    }
}

// Function to load upcoming events
async function loadUpcomingEvents() {
    const eventsGrid = document.querySelector('.events-grid');
    if (!eventsGrid) return;

    // Show loading state
    eventsGrid.innerHTML = '<div class="loading">Loading events...</div>';

    try {
        const events = await fetchUpcomingEvents();
        
        if (!events || events.length === 0) {
            eventsGrid.innerHTML = '<div class="no-events">No upcoming events found</div>';
            return;
        }

        // Clear loading state and add events
        eventsGrid.innerHTML = '';
        events.forEach(event => {
            eventsGrid.innerHTML += createEventCard(event);
        });
    } catch (error) {
        console.error('Error:', error);
        eventsGrid.innerHTML = '<div class="error">Failed to load events. Please try again later.</div>';
    }
}

// Function to register for an event
async function registerForEvent(eventId) {
    try {
        if (!isAuthenticated()) {
            window.location.href = '/login.html';
            return;
        }

        const response = await apiCall(config.endpoints.registrations.register(eventId), 'POST');
        
        if (response.message) {
            alert(response.message); // Show waitlist message if applicable
        } else {
            alert('Successfully registered for the event!');
        }
        
        // Update the UI to reflect registration
        const registerButton = document.querySelector(`[data-event-id="${eventId}"] .event-button.primary`);
        if (registerButton) {
            registerButton.textContent = 'Registered';
            registerButton.disabled = true;
        }
        
        // Reload registrations to update UI
        await loadUserRegistrations();
    } catch (error) {
        alert(error.message || 'Failed to register for event');
        console.error('Error registering for event:', error);
    }
}

// Check if user is authenticated
function isAuthenticated() {
    return !!localStorage.getItem('token');
}

// Make an API call with authentication
async function apiCall(endpoint, method = 'GET', body = null) {
    try {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };

        const config = {
            method,
            headers,
            credentials: 'include'
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        if (response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return;
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }

        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Load user's registrations
async function loadUserRegistrations() {
    if (!isAuthenticated()) return;
    
    try {
        const registrations = await apiCall(config.endpoints.registrations.list);
        // Store registered event IDs for reference
        window.userRegistrations = new Map(
            registrations
                .filter(reg => reg.status !== 'cancelled') // Don't store cancelled registrations
                .map(reg => [reg.eventId, reg.status])
        );
        // Refresh the events display to update registration buttons
        loadEvents(currentPage);
    } catch (error) {
        console.error('Error loading registrations:', error);
        // Don't throw the error, just log it and continue
        window.userRegistrations = new Map();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadUpcomingEvents();
    
    // Add click handler for "View All" button
    const viewAllBtn = document.querySelector('.view-all-btn');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'events.html';
        });
    }
}); 