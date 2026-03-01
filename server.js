require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const Message = require('./models/Message');
const User = require('./models/User');

connectDB();

const app = express();
const server = http.createServer(app);

// ---- CORS config ----
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',').map(o => o.trim());

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true
};

// ---- Socket.io ----
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Socket auth middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return next(new Error('User not found'));
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Auth failed'));
  }
});

// Track online users
const onlineUsers = new Map();

io.on('connection', (socket) => {
  const userId = socket.user._id.toString();
  onlineUsers.set(userId, socket.id);
  console.log(`🟢 ${socket.user.name} connected`);

  // Broadcast online status
  io.emit('user_online', { userId, online: true });

  // Join personal room
  socket.join(userId);

  // Send message
  socket.on('send_message', async (data) => {
    try {
      const { receiverId, text } = data;
      if (!text?.trim() || !receiverId) return;

      const message = await Message.create({
        sender: socket.user._id,
        receiver: receiverId,
        text: text.trim()
      });

      const populated = await message.populate([
        { path: 'sender', select: 'name avatarUrl' },
        { path: 'receiver', select: 'name avatarUrl' }
      ]);

      // Send to receiver's room
      io.to(receiverId).emit('receive_message', populated);
      // Confirm to sender
      socket.emit('message_sent', populated);

    } catch (err) {
      socket.emit('message_error', { error: err.message });
    }
  });

  // Typing indicators
  socket.on('typing', ({ receiverId }) => {
    io.to(receiverId).emit('user_typing', { userId, name: socket.user.name });
  });
  socket.on('stop_typing', ({ receiverId }) => {
    io.to(receiverId).emit('user_stop_typing', { userId });
  });

  // Mark messages read
  socket.on('mark_read', async ({ senderId }) => {
    await Message.updateMany(
      { sender: senderId, receiver: socket.user._id, read: false },
      { read: true }
    );
    io.to(senderId).emit('messages_read', { by: userId });
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    io.emit('user_online', { userId, online: false });
    console.log(`🔴 ${socket.user.name} disconnected`);
  });
});

// ---- Middleware ----
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ---- Rate Limiting ----
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 20, message: { success: false, message: 'Too many requests' } });
const generalLimiter = rateLimit({ windowMs: 15*60*1000, max: 200, message: { success: false, message: 'Too many requests' } });

// ---- Health ----
app.get('/health', (req, res) => res.json({ success: true, status: 'OK', timestamp: new Date().toISOString() }));

// ---- API Info ----
app.get('/api', (req, res) => res.json({
  success: true, name: 'StudyBuddy API', version: '2.0.0',
  features: ['Authentication', 'Profile Matching', 'Connections', 'Real-time Chat']
}));

// ---- Routes ----
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/users', generalLimiter, require('./routes/userRoutes'));
app.use('/api/match', generalLimiter, require('./routes/matchRoutes'));
app.use('/api/chat', generalLimiter, require('./routes/chatRoutes'));

// ---- 404 ----
app.use('*', (req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));

// ---- Error Handler ----
app.use(errorHandler);

// ---- Start ----
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 StudyBuddy API v2.0 running on port ${PORT}`);
  console.log(`💬 Real-time chat enabled via Socket.io`);
  console.log(`📖 API: http://localhost:${PORT}/api\n`);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED:', err.message);
  server.close(() => process.exit(1));
});

module.exports = { app, io };
