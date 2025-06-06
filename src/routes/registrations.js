const express = require('express');
const { Registration, Event, User } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get registrations for a specific event (staff only)
router.get('/event/:eventId', auth, async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.eventId);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user is the event organizer or admin
    if (event.organizerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view registrations' });
    }

    const registrations = await Registration.findAll({
      where: { eventId: req.params.eventId },
      include: [{
        model: User,
        attributes: ['id', 'firstName', 'lastName', 'email']
      }],
      order: [['registrationDate', 'ASC']]
    });

    res.json(registrations);
  } catch (error) {
    console.error('Error fetching event registrations:', error);
    res.status(500).json({ error: 'Error fetching registrations' });
  }
});

// Update registration status (staff only)
router.put('/:registrationId', auth, async (req, res) => {
  try {
    const registration = await Registration.findByPk(req.params.registrationId, {
      include: [{ model: Event }]
    });

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    // Check if user is the event organizer or admin
    if (registration.Event.organizerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update registration' });
    }

    const { status } = req.body;
    if (!['pending', 'confirmed', 'cancelled', 'waitlisted'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await registration.update({ status });
    
    const updatedRegistration = await Registration.findByPk(registration.id, {
      include: [{
        model: User,
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });

    res.json(updatedRegistration);
  } catch (error) {
    console.error('Error updating registration:', error);
    res.status(500).json({ error: 'Error updating registration' });
  }
});

// Get user's registrations
router.get('/my-registrations', auth, async (req, res) => {
  try {
    console.log('Fetching registrations for user:', req.user.id); // Debug log
    const registrations = await Registration.findAll({
      where: { userId: req.user.id },
      include: [{
        model: Event,
        required: true,
        include: [{
          model: User,
          as: 'organizer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      }],
      order: [['registrationDate', 'DESC']]
    });

    console.log('Found registrations:', registrations.length); // Debug log
    res.json(registrations);
  } catch (error) {
    console.error('Error fetching user registrations:', error);
    res.status(500).json({ error: 'Error fetching registrations' });
  }
});

// Register for an event
router.post('/:eventId', auth, async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.eventId);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if registration deadline has passed
    if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ error: 'Registration deadline has passed' });
    }

    // Check if event is at capacity
    if (event.capacity) {
      const registrationCount = await Registration.count({
        where: { 
          eventId: event.id,
          status: 'confirmed'
        }
      });

      if (registrationCount >= event.capacity) {
        // If event is at capacity, add to waitlist
        const registration = await Registration.create({
          userId: req.user.id,
          eventId: event.id,
          status: 'waitlisted'
        });
        return res.status(201).json({
          ...registration.toJSON(),
          message: 'Event is at capacity. You have been added to the waitlist.'
        });
      }
    }

    // Check for existing registration
    const existingRegistration = await Registration.findOne({
      where: {
        userId: req.user.id,
        eventId: event.id
      }
    });

    if (existingRegistration) {
      // If the existing registration is cancelled, allow re-registration
      if (existingRegistration.status === 'cancelled') {
        await existingRegistration.update({ status: 'confirmed' });
        return res.status(200).json(existingRegistration);
      }
      return res.status(400).json({ error: 'Already registered for this event' });
    }

    const registration = await Registration.create({
      userId: req.user.id,
      eventId: event.id,
      status: 'confirmed'
    });

    res.status(201).json(registration);
  } catch (error) {
    console.error('Error creating registration:', error);
    res.status(500).json({ error: 'Error creating registration' });
  }
});

// Cancel registration
router.delete('/:eventId', auth, async (req, res) => {
  try {
    const registration = await Registration.findOne({
      where: {
        userId: req.user.id,
        eventId: req.params.eventId
      }
    });

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    await registration.update({ status: 'cancelled' });

    // If there are waitlisted registrations, promote the first one
    if (registration.status === 'confirmed') {
      const waitlistedRegistration = await Registration.findOne({
        where: {
          eventId: req.params.eventId,
          status: 'waitlisted'
        },
        order: [['registrationDate', 'ASC']]
      });

      if (waitlistedRegistration) {
        await waitlistedRegistration.update({ status: 'confirmed' });
      }
    }

    res.status(200).json(registration);
  } catch (error) {
    console.error('Error cancelling registration:', error);
    res.status(500).json({ error: 'Error cancelling registration' });
  }
});

module.exports = router; 