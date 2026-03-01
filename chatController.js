const Message = require('../models/Message');
const User = require('../models/User');

// @desc  Get conversation between me and another user
// @route GET /api/chat/:userId
const getConversation = async (req, res, next) => {
  try {
    const other = req.params.userId;
    const me = req.user._id;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find({
      $or: [
        { sender: me, receiver: other },
        { sender: other, receiver: me }
      ]
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('sender', 'name avatarUrl')
      .populate('receiver', 'name avatarUrl');

    // Mark messages as read
    await Message.updateMany(
      { sender: other, receiver: me, read: false },
      { read: true }
    );

    res.status(200).json({ success: true, count: messages.length, messages });
  } catch (err) { next(err); }
};

// @desc  Get all my conversations (inbox)
// @route GET /api/chat
const getInbox = async (req, res, next) => {
  try {
    const me = req.user._id;

    // Get latest message per conversation
    const messages = await Message.aggregate([
      { $match: { $or: [{ sender: me }, { receiver: me }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ['$sender', me] }, '$receiver', '$sender']
          },
          lastMessage: { $first: '$$ROOT' },
          unread: {
            $sum: { $cond: [{ $and: [{ $eq: ['$receiver', me] }, { $eq: ['$read', false] }] }, 1, 0] }
          }
        }
      },
      { $sort: { 'lastMessage.createdAt': -1 } }
    ]);

    // Populate user info
    const populated = await Promise.all(messages.map(async (m) => {
      const user = await User.findById(m._id).select('name course avatarUrl skills availability');
      return { user, lastMessage: m.lastMessage, unread: m.unread };
    }));

    res.status(200).json({ success: true, conversations: populated.filter(p => p.user) });
  } catch (err) { next(err); }
};

// @desc  Get unread count
// @route GET /api/chat/unread
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Message.countDocuments({ receiver: req.user._id, read: false });
    res.status(200).json({ success: true, unread: count });
  } catch (err) { next(err); }
};

module.exports = { getConversation, getInbox, getUnreadCount };
