const express = require('express');
const { getDB } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/following/videos', authenticateToken, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const db = getDB();
  try {
    const followingIds = db.prepare(
      'SELECT followee_id FROM follows WHERE follower_id = ?'
    ).all(req.user.id).map(f => f.followee_id);

    if (followingIds.length === 0) {
      return res.json([]);
    }

    const sql = 'SELECT * FROM videos WHERE user_id IN (' + followingIds.map(() => '?').join(',') + ') AND status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const videos = db.prepare(sql).all(...followingIds, 'approved', parseInt(limit), offset);

    const result = videos.map(video => {
      const user = db.prepare('SELECT id, username, nickname, cover FROM users WHERE id = ?').get(video.user_id);
      return { ...video, userId: video.user_id, username: user.username, nickname: user.nickname, user_cover: user.cover };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/', (req, res) => {
  const { keyword, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let query = 'SELECT id, username, nickname, phone, cover, level, is_host FROM users WHERE status = ?';
  const params = ['active'];

  if (keyword) {
    query = 'SELECT id, username, nickname, phone, cover, level, is_host FROM users WHERE status = ? AND (username LIKE ? OR nickname LIKE ? OR phone LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const db = getDB();
  try {
    const users = db.prepare(query).all(...params);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/:userId', (req, res) => {
  const { userId } = req.params;

  const db = getDB();
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    delete user.password;
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.put('/:userId/host', authenticateToken, (req, res) => {
  const { userId } = req.params;

  const db = getDB();
  try {
    db.prepare('UPDATE users SET is_host = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
    res.json({ message: '升级为主播成功' });
  } catch (error) {
    res.status(500).json({ error: '升级失败' });
  }
});

router.post('/recharge', authenticateToken, (req, res) => {
  const { amount } = req.body;
  const diamonds = amount * 10;

  const db = getDB();
  try {
    db.prepare('UPDATE users SET diamonds = diamonds + ? WHERE id = ?').run(diamonds, req.user.id);
    db.prepare(
      'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, 'recharge', amount, 0, diamonds, `充值 ${amount} USD`);

    res.json({ message: '充值成功', diamonds });
  } catch (error) {
    res.status(500).json({ error: '充值失败' });
  }
});

router.post('/withdraw', authenticateToken, (req, res) => {
  const { amount } = req.body;

  const db = getDB();
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (user.coins < amount) {
      return res.status(400).json({ error: '金币不足' });
    }

    db.prepare('UPDATE users SET coins = coins - ? WHERE id = ?').run(amount, req.user.id);
    db.prepare(
      'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, 'withdraw', amount, user.coins, user.coins - amount, `提现 ${amount} 金币`);

    res.json({ message: '提现申请已提交', amount });
  } catch (error) {
    res.status(500).json({ error: '提现失败' });
  }
});

router.get('/:userId/transactions', authenticateToken, (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const db = getDB();
  try {
    const transactions = db.prepare(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(userId, parseInt(limit), offset);

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/:userId/videos', authenticateToken, (req, res) => {
  const { userId } = req.params;

  const db = getDB();
  try {
    const videos = db.prepare(
      'SELECT * FROM videos WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId);
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/:userId/streams', authenticateToken, (req, res) => {
  const { userId } = req.params;

  const db = getDB();
  try {
    const streams = db.prepare(
      'SELECT * FROM streams WHERE host_id = ? ORDER BY created_at DESC'
    ).all(userId);
    res.json(streams);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/:userId/contribution', authenticateToken, (req, res) => {
  const { userId } = req.params;

  const db = getDB();
  try {
    const giftRecords = db.prepare(
      'SELECT user_id, SUM(g.price * gr.count) as total_amount FROM gift_records gr JOIN gifts g ON gr.gift_id = g.id WHERE gr.stream_id IN (SELECT id FROM streams WHERE host_id = ?) GROUP BY user_id ORDER BY total_amount DESC LIMIT 10'
    ).all(userId);

    const result = giftRecords.map(record => {
      const user = db.prepare('SELECT id, username, nickname, cover FROM users WHERE id = ?').get(record.user_id);
      return { ...record, ...user, rank: 0 };
    }).map((record, index) => ({ ...record, rank: index + 1 }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/:userId/following/details', (req, res) => {
  const { userId } = req.params;

  const db = getDB();
  try {
    const followingIds = db.prepare(
      'SELECT followee_id FROM follows WHERE follower_id = ?'
    ).all(userId).map(f => f.followee_id);

    if (followingIds.length === 0) {
      return res.json({ followingHosts: [], followingVideos: [] });
    }

    const hosts = db.prepare(
      'SELECT u.id, u.username, u.nickname, u.cover FROM users u WHERE u.id IN (' + followingIds.map(() => '?').join(',') + ')'
    ).all(...followingIds);

    const videos = db.prepare(
      'SELECT v.id, v.title, v.cover, u.nickname as host_nickname FROM videos v JOIN users u ON v.user_id = u.id WHERE v.user_id IN (' + followingIds.map(() => '?').join(',') + ') AND v.status = ? ORDER BY v.created_at DESC'
    ).all(...followingIds, 'approved');

    res.json({ followingHosts: hosts, followingVideos: videos });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;