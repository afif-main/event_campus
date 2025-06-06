const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Event, User } = require('../models');
const { auth, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Image not accepted. Please upload a valid image file (JPEG, JPG, PNG, or GIF).'));
    }
  }
});

// Get all events with filtering
router.get('/', async (req, res) => {
  try {
    console.log('Fetching events with query:', req.query);
    
    const {
      category,
      date,
      search,
      page = 1,
      limit = 10
    } = req.query;

    const where = {};  // Removed status filter to show all events
    
    if (category) {
      where.category = category;
    }
    
    if (date) {
      where.date = date;
    }
    
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    console.log('Query conditions:', where);

    const offset = (page - 1) * limit;

    const events = await Event.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'organizer',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['date', 'ASC'], ['startTime', 'ASC']]
    });

    console.log(`Found ${events.count} total events`);
    console.log('Events:', events.rows.map(e => ({ 
      id: e.id, 
      title: e.title, 
      status: e.status 
    })));

    const response = {
      events: events.rows,
      total: events.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(events.count / limit)
    };

    console.log('Sending response:', {
      total: response.total,
      currentPage: response.currentPage,
      totalPages: response.totalPages
    });

    res.json(response);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ 
      error: 'Error fetching events',
      details: error.message 
    });
  }
});

// Get events created by the authenticated user (organizer only)
router.get('/my-events', auth, async (req, res) => {
  try {
    // Check if user is organizer or admin
    if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Organizer only.' });
    }

    const events = await Event.findAll({
      where: { organizerId: req.user.id },
      include: [{
        model: User,
        as: 'organizer',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }],
      order: [['date', 'ASC'], ['startTime', 'ASC']]
    });

    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching your events' });
  }
});

// Create new event
router.post('/',
  auth,
  upload.single('image'),
  [
    body('title').trim().notEmpty(),
    body('description').trim().notEmpty(),
    body('category').isIn(['academic', 'social', 'sports', 'cultural', 'other']),
    body('date').isDate(),
    body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('location').trim().notEmpty(),
    body('capacity').optional().isInt({ min: 1 }),
    body('registrationDeadline').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Delete uploaded file if validation fails
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ errors: errors.array() });
      }

      const eventData = {
        ...req.body,
        organizerId: req.user.id,
        status: 'published',
        image: req.file ? `/uploads/${req.file.filename}` : null
      };

      const event = await Event.create(eventData);
      
      const eventWithOrganizer = await Event.findByPk(event.id, {
        include: [{
          model: User,
          as: 'organizer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      });

      res.status(201).json(eventWithOrganizer);
    } catch (error) {
      // Delete uploaded file if event creation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'Error creating event' });
    }
  }
);

// Get single event
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'organizer',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching event' });
  }
});

// Update event
router.put('/:id',
  auth,
  async (req, res) => {
    try {
      const event = await Event.findByPk(req.params.id);

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (event.organizerId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to update this event' });
      }

      await event.update(req.body);
      
      const updatedEvent = await Event.findByPk(event.id, {
        include: [{
          model: User,
          as: 'organizer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      });

      res.json(updatedEvent);
    } catch (error) {
      res.status(500).json({ error: 'Error updating event' });
    }
  }
);

// Delete event
router.delete('/:id',
  auth,
  async (req, res) => {
    try {
      const event = await Event.findByPk(req.params.id);

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (event.organizerId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to delete this event' });
      }

      await event.destroy();
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Error deleting event' });
    }
  }
);

module.exports = router; 