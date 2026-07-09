require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./database');

const app = express();

const allowedOrigins = [
  'http://localhost:5180',
  'http://localhost:5181',
  'http://localhost:5182',
  'http://localhost:5183',
  'http://localhost:5184',
  'http://localhost:5185',
  'http://localhost:5186',
  'https://galalive-client-n8xkkgtfw-harker1544.vercel.app',
  'https://galalive-bd9lylikz-harker1544.vercel.app',
  'https://galalive-client-mjckme0dh-harker1544.vercel.app',
  'https://galalive-21fil1q63-harker1544.vercel.app',
  'https://galalive-client-lutts11wq-harker1544.vercel.app',
  'https://galalive-m3uuwrt40-harker1544.vercel.app',
  'https://galalive-backend-hgvmv6jjb-harker1544.vercel.app',
  'https://galalive-client.vercel.app',
  'https://galalive-pc.vercel.app',
  'https://harker1544525153-lang.github.io'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (e) {
    console.warn('Cannot create uploads directory (read-only filesystem)');
  }
}

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});

app.use(express.static('public'));

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请选择文件' });
  }
  const ext = path.extname(req.file.originalname);
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
  const filepath = path.join(uploadsDir, filename);
  
  try {
    fs.writeFileSync(filepath, req.file.buffer);
    const url = `/uploads/${filename}`;
    res.json({ url });
  } catch (e) {
    console.error('Upload failed:', e);
    res.status(500).json({ error: '文件上传失败，服务器文件系统只读' });
  }
});

const authRoutes = require('./routes/auth');
const streamRoutes = require('./routes/streams');
const giftRoutes = require('./routes/gifts');
const followRoutes = require('./routes/follows');
const userRoutes = require('./routes/users');
const bannerRoutes = require('./routes/banners');
const adminRoutes = require('./routes/admin');
const certificationRoutes = require('./routes/certifications');
const favoriteRoutes = require('./routes/favorites');
const levelConfigRoutes = require('./routes/levelConfigs');

app.use('/api/auth', authRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/gifts', giftRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/users', userRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/certifications', certificationRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/level-configs', levelConfigRoutes);

const connectedUsers = new Map();
const streamRooms = new Map();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  socket.on('join', ({ roomId, userId }) => {
    socket.join(roomId);
    connectedUsers.set(socket.id, { userId, roomId });
    
    if (!streamRooms.has(roomId)) {
      streamRooms.set(roomId, new Set());
    }
    streamRooms.get(roomId).add(userId);
    
    socket.to(roomId).emit('user_join', { userId });
  });

  socket.on('leave', ({ roomId, userId }) => {
    socket.leave(roomId);
    connectedUsers.delete(socket.id);
    
    if (streamRooms.has(roomId)) {
      streamRooms.get(roomId).delete(userId);
    }
    
    socket.to(roomId).emit('user_leave', { userId });
  });

  socket.on('chat_message', ({ roomId, userId, content, username, nickname, avatar }) => {
    socket.to(roomId).emit('chat_message', {
      userId,
      username,
      nickname,
      avatar,
      content,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('danmaku', ({ roomId, userId, content, username, avatar }) => {
    socket.to(roomId).emit('danmaku', {
      userId,
      username,
      avatar,
      content,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('send_gift', ({ roomId, userId, gift, username, nickname, avatar }) => {
    socket.to(roomId).emit('send_gift', {
      userId,
      username,
      nickname,
      avatar,
      gift,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('heartbeat', () => {
    socket.emit('heartbeat_response');
  });

  socket.on('disconnect', () => {
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo) {
      connectedUsers.delete(socket.id);
      if (streamRooms.has(userInfo.roomId)) {
        streamRooms.get(userInfo.roomId).delete(userInfo.userId);
      }
      socket.to(userInfo.roomId).emit('user_leave', { userId: userInfo.userId });
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Gala Live API Server',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      streams: '/api/streams',
      gifts: '/api/gifts',
      users: '/api/users',
      banners: '/api/banners',
      admin: '/api/admin'
    }
  });
});

initDatabase();

if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
  module.exports = app;
} else if (process.env.NODE_ENV === 'production') {
  module.exports = app;
} else {
  server.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
    console.log(`Frontend: http://localhost:5180`);
    console.log(`Admin: http://localhost:5181`);
  });
}