const express = require('express');
const { getDB } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDB();
  try {
    const gifts = db.prepare('SELECT * FROM gifts ORDER BY price ASC').all();
    res.json(gifts);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/send', authenticateToken, (req, res) => {
  const { roomId, giftId, count = 1 } = req.body;

  const db = getDB();
  try {
    const gift = db.prepare('SELECT * FROM gifts WHERE id = ?').get(giftId);
    if (!gift) {
      return res.status(404).json({ error: '礼物不存在' });
    }

    const totalPrice = gift.price * count;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (user.diamonds < totalPrice) {
      return res.status(400).json({ error: '钻石不足' });
    }

    let receiverId = null;
    let streamId = null;
    let contentType = 'stream';

    if (roomId.startsWith('video_')) {
      const videoId = parseInt(roomId.split('_')[1]);
      const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(videoId);
      if (!video) {
        return res.status(404).json({ error: '视频不存在' });
      }
      receiverId = video.user_id;
      contentType = 'video';
    } else {
      const stream = db.prepare('SELECT * FROM streams WHERE room_id = ?').get(roomId);
      if (!stream) {
        return res.status(404).json({ error: '直播间不存在' });
      }
      receiverId = stream.host_id;
      streamId = stream.id;
      contentType = 'stream';
    }

    db.prepare('UPDATE users SET diamonds = diamonds - ? WHERE id = ?').run(totalPrice, req.user.id);
    db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(totalPrice, receiverId);

    if (streamId) {
      db.prepare(
        'INSERT INTO gift_records (stream_id, sender_id, receiver_id, gift_id, count, total_price) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(streamId, req.user.id, receiverId, giftId, count, totalPrice);
    }

    db.prepare(
      'INSERT INTO transactions (user_id, type, amount, description, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, 'gift', totalPrice, `赠送礼物 ${gift.name} x${count}`, receiverId, contentType);

    res.json({
      message: '礼物发送成功',
      gift: { ...gift, count, totalPrice },
      sender: { id: req.user.id, username: user.username, nickname: user.nickname, avatar: user.avatar }
    });
  } catch (error) {
    res.status(500).json({ error: '发送礼物失败' });
  }
});

router.get('/:roomId/records', (req, res) => {
  const { roomId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  const db = getDB();
  try {
    const records = db.prepare(
      `SELECT gr.*, g.name, g.icon, g.price, u.username AS sender_username, u.nickname AS sender_nickname, u.avatar AS sender_avatar
       FROM gift_records gr
       JOIN gifts g ON gr.gift_id = g.id
       JOIN users u ON gr.sender_id = u.id
       JOIN streams s ON gr.stream_id = s.id
       WHERE s.room_id = ?
       ORDER BY gr.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(roomId, parseInt(limit), offset);

    res.json(records);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/:roomId/ranking', (req, res) => {
  const { roomId } = req.params;

  const db = getDB();
  try {
    const ranking = db.prepare(
      `SELECT u.id, u.username, u.nickname, u.avatar, SUM(gr.total_price) AS total_contribution
       FROM gift_records gr
       JOIN users u ON gr.sender_id = u.id
       JOIN streams s ON gr.stream_id = s.id
       WHERE s.room_id = ?
       GROUP BY gr.sender_id
       ORDER BY total_contribution DESC
       LIMIT 20`
    ).all(roomId);

    res.json(ranking);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;