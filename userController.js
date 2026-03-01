const User = require('../models/User');

// @desc    Get my full profile
// @route   GET /api/users/me
// @access  Private
const getMyProfile = async (req, res) => {
  const user = await User.findById(req.user._id).populate('connections', 'name course avatarUrl skills availability');
  res.status(200).json({ success: true, user });
};

// @desc    Update my profile
// @route   PUT /api/users/update
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'course', 'skills', 'studyGoal', 'availability', 'bio', 'avatarUrl'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, message: 'Profile updated', user });
  } catch (err) {
    next(err);
  }
};

// @desc    Get a public profile by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.isActive) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, user: user.toPublicProfile() });
  } catch (err) {
    next(err);
  }
};

// @desc    Search/list users with filters + pagination
// @route   GET /api/users?skill=DSA&goal=Interview Prep&availability=Night&page=1&limit=12&q=rahul
// @access  Private
const getUsers = async (req, res, next) => {
  try {
    const { skill, goal, availability, q, page = 1, limit = 12 } = req.query;
    const query = { _id: { $ne: req.user._id }, isActive: true };

    if (skill) query.skills = { $in: [skill] };
    if (goal) query.studyGoal = goal;
    if (availability) query.availability = availability;
    if (q) query.$text = { $search: q };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password -connections')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      users: users.map((u) => u.toPublicProfile()),
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete my account
// @route   DELETE /api/users/me
// @access  Private
const deleteAccount = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive: false });
    res.status(200).json({ success: true, message: 'Account deactivated successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get valid options (skills, goals, availability)
// @route   GET /api/users/options
// @access  Public
const getOptions = (req, res) => {
  res.status(200).json({ success: true, options: User.validOptions() });
};

module.exports = { getMyProfile, updateProfile, getUserById, getUsers, deleteAccount, getOptions };
