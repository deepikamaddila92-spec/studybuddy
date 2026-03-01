const express = require('express');
const router = express.Router();
const {
  getMatches, getMatchScore, sendConnection,
  respondConnection, getMyConnections,
} = require('../controllers/matchController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getMatches);
router.get('/connections', protect, getMyConnections);
router.get('/:userId', protect, getMatchScore);
router.post('/connect/:userId', protect, sendConnection);
router.put('/connect/:connectionId', protect, respondConnection);

module.exports = router;
