const User = require('../models/User');
const Connection = require('../models/Connection');

// ---- Core matching algorithm ----
const calculateMatchScore = (userA, userB) => {
  let score = 0;
  const breakdown = { skills: 0, goal: 0, availability: 0 };

  // 1. Skills overlap — Jaccard similarity (50 pts)
  const setA = new Set(userA.skills);
  const setB = new Set(userB.skills);
  const intersection = [...setA].filter((s) => setB.has(s)).length;
  const union = new Set([...setA, ...setB]).size;
  if (union > 0) {
    breakdown.skills = Math.round((intersection / union) * 50);
    score += breakdown.skills;
  }

  // 2. Study goal match (30 pts)
  if (userA.studyGoal === userB.studyGoal) {
    breakdown.goal = 30;
    score += 30;
  }

  // 3. Availability match (20 pts)
  if (userA.availability === userB.availability) {
    breakdown.availability = 20;
    score += 20;
  }

  return { score: Math.min(score, 100), breakdown };
};

// @desc    Get matched users sorted by compatibility score
// @route   GET /api/match?minScore=30&page=1&limit=12
// @access  Private
const getMatches = async (req, res, next) => {
  try {
    const { minScore = 0, page = 1, limit = 12 } = req.query;
    const currentUser = req.user;

    // Fetch all other active users
    const allUsers = await User.find({
      _id: { $ne: currentUser._id },
      isActive: true,
    }).select('-password -connections');

    // Score + filter
    const scored = allUsers
      .map((u) => {
        const { score, breakdown } = calculateMatchScore(currentUser, u);
        return { ...u.toPublicProfile(), matchScore: score, matchBreakdown: breakdown };
      })
      .filter((u) => u.matchScore >= parseInt(minScore))
      .sort((a, b) => b.matchScore - a.matchScore);

    // Pagination
    const total = scored.length;
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = scored.slice(start, start + parseInt(limit));

    // Attach connection status
    const myConnections = await Connection.find({
      $or: [{ requester: currentUser._id }, { recipient: currentUser._id }],
    });

    const enriched = paginated.map((u) => {
      const conn = myConnections.find(
        (c) =>
          c.requester.toString() === u._id.toString() ||
          c.recipient.toString() === u._id.toString()
      );
      return {
        ...u,
        connectionStatus: conn ? conn.status : null,
        connectionId: conn ? conn._id : null,
      };
    });

    res.status(200).json({
      success: true,
      count: enriched.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      currentUser: {
        skills: currentUser.skills,
        studyGoal: currentUser.studyGoal,
        availability: currentUser.availability,
      },
      matches: enriched,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get match score between me and another user
// @route   GET /api/match/:userId
// @access  Private
const getMatchScore = async (req, res, next) => {
  try {
    const otherUser = await User.findById(req.params.userId);
    if (!otherUser || !otherUser.isActive) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const { score, breakdown } = calculateMatchScore(req.user, otherUser);
    res.status(200).json({
      success: true,
      matchScore: score,
      breakdown,
      user: otherUser.toPublicProfile(),
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Send connection request
// @route   POST /api/match/connect/:userId
// @access  Private
const sendConnection = async (req, res, next) => {
  try {
    const recipientId = req.params.userId;
    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "You can't connect with yourself" });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient || !recipient.isActive) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check existing
    const existing = await Connection.findOne({
      $or: [
        { requester: req.user._id, recipient: recipientId },
        { requester: recipientId, recipient: req.user._id },
      ],
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Connection already ${existing.status}`,
        connection: existing,
      });
    }

    const { score } = calculateMatchScore(req.user, recipient);
    const connection = await Connection.create({
      requester: req.user._id,
      recipient: recipientId,
      matchScore: score,
    });

    res.status(201).json({ success: true, message: 'Connection request sent', connection });
  } catch (err) {
    next(err);
  }
};

// @desc    Accept / decline connection request
// @route   PUT /api/match/connect/:connectionId
// @access  Private
const respondConnection = async (req, res, next) => {
  try {
    const { action } = req.body; // 'accept' | 'decline'
    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be accept or decline' });
    }

    const connection = await Connection.findById(req.params.connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Connection not found' });
    }
    if (connection.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    connection.status = action === 'accept' ? 'accepted' : 'declined';
    await connection.save();

    // Add to both users' connections array if accepted
    if (connection.status === 'accepted') {
      await User.findByIdAndUpdate(connection.requester, { $addToSet: { connections: connection.recipient } });
      await User.findByIdAndUpdate(connection.recipient, { $addToSet: { connections: connection.requester } });
    }

    res.status(200).json({ success: true, message: `Connection ${connection.status}`, connection });
  } catch (err) {
    next(err);
  }
};

// @desc    Get my connections
// @route   GET /api/match/connections
// @access  Private
const getMyConnections = async (req, res, next) => {
  try {
    const connections = await Connection.find({
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
    })
      .populate('requester', 'name course avatarUrl skills availability studyGoal')
      .populate('recipient', 'name course avatarUrl skills availability studyGoal')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, count: connections.length, connections });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMatches, getMatchScore, sendConnection, respondConnection, getMyConnections };
