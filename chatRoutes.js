const express = require('express');
const router = express.Router();
const { getConversation, getInbox, getUnreadCount } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getInbox);
router.get('/unread', protect, getUnreadCount);
router.get('/:userId', protect, getConversation);

module.exports = router;
