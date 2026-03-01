const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getMyProfile, updateProfile, getUserById,
  getUsers, deleteAccount, getOptions,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Public
router.get('/options', getOptions);

// Protected
router.get('/me', protect, getMyProfile);
router.delete('/me', protect, deleteAccount);

router.put(
  '/update',
  protect,
  [
    body('name').optional().trim().isLength({ min: 2, max: 60 }),
    body('skills').optional().isArray({ max: 10 }).withMessage('Skills must be an array of max 10'),
    body('bio').optional().isLength({ max: 300 }),
  ],
  validate,
  updateProfile
);

// Search/list users
router.get('/', protect, getUsers);

// Public profile
router.get('/:id', protect, getUserById);

module.exports = router;
