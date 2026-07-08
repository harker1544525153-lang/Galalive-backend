const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const { category, sort = 'hot', page = 1, limit = 20, keyword } = req.query;
  const offset = (page - 1) * limit;

  const db = getDB();
  try {
    let streams = db.tables['streams'] || [];

    if (category) {
      streams = streams.filter(s => s.category === category);
    }

    if (keyword) {
      const kw = keyword.toLowerCase();
      streams = streams.filter(s => 
        s.title.toLowerCase().includes(kw) || s.category.toLowerCase().includes(kw)
      );
    }

    streams = streams.filter(s => s.status === 'live');

    if (sort === 'latest') {
      streams.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
    } else {
      streams.sort((a, b) => b.viewers_count - a.viewers_count || new Date(b.start_time) - new Date(a.start_time));
    }

    streams = streams.slice(offset, offset + parseInt(limit));

    streams = streams.map(stream => {
      const user = db.prepare('SELECT username, nickname, phone, avatar, level, is_host FROM users WHERE id = ?').get(stream.host_id);
      return { ...stream, ...user };
    });

    res.json(streams);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/following', authenticateToken, (req, res) => {
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

    const followingUsers = db.prepare(
      'SELECT id, username, nickname, avatar, level, is_host FROM users WHERE id IN (' + followingIds.map(() => '?').join(',') + ')'
    ).all(...followingIds);

    const liveStreams = db.prepare(
      'SELECT * FROM streams WHERE host_id IN (' + followingIds.map(() => '?').join(',') + ') AND status = ?'
    ).all(...followingIds, 'live');

    const hostStreamMap = {};
    liveStreams.forEach(stream => {
      hostStreamMap[stream.host_id] = stream;
    });

    const result = followingUsers.map(user => {
      const stream = hostStreamMap[user.id];
      if (stream) {
        return { ...stream, ...user };
      }
      return {
        ...user,
        room_id: null,
        title: '暂无直播',
        cover: '',
        category: '',
        status: 'offline',
        viewers_count: 0,
        likes_count: 0,
        gifts_count: 0,
        start_time: null,
      };
    });

    result.sort((a, b) => {
      if (a.status === 'live' && b.status !== 'live') return -1;
      if (a.status !== 'live' && b.status === 'live') return 1;
      if (a.status === 'live' && b.status === 'live') {
        return b.viewers_count - a.viewers_count || new Date(b.start_time) - new Date(a.start_time);
      }
      return 0;
    });

    res.json(result.slice(offset, offset + parseInt(limit)));
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/:roomId', (req, res) => {
  const { roomId } = req.params;

  const db = getDB();
  try {
    const stream = db.prepare('SELECT * FROM streams WHERE room_id = ?').get(roomId);

    if (!stream) {
      return res.status(404).json({ error: '直播间不存在' });
    }

    const user = db.prepare('SELECT username, nickname, phone, avatar, level, is_host FROM users WHERE id = ?').get(stream.host_id);
    res.json({ ...stream, ...user });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/', authenticateToken, (req, res) => {
  const { title, cover, category, is_private, password, is_timed_charge, charge_rate } = req.body;
  const roomId = uuidv4().slice(0, 8);

  const db = getDB();
  try {
    const result = db.prepare(
      'INSERT INTO streams (room_id, host_id, title, cover, category, is_private, password, is_timed_charge, charge_rate, status, start_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
    ).run(roomId, req.user.id, title, cover || '', category || 'general', is_private || 0, password || '', is_timed_charge || 0, charge_rate || 0, 'live');

    res.json({
      message: '开播成功',
      roomId,
      stream: { id: result.lastInsertRowid, roomId, title, cover, category }
    });
  } catch (error) {
    res.status(500).json({ error: '开播失败' });
  }
});

router.put('/:roomId', authenticateToken, (req, res) => {
  const { roomId } = req.params;
  const { title, cover, category } = req.body;

  const db = getDB();
  try {
    db.prepare(
      'UPDATE streams SET title = ?, cover = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE room_id = ? AND host_id = ?'
    ).run(title, cover, category, roomId, req.user.id);

    res.json({ message: '直播间信息更新成功' });
  } catch (error) {
    res.status(500).json({ error: '更新失败' });
  }
});

router.put('/:roomId/end', authenticateToken, (req, res) => {
  const { roomId } = req.params;

  const db = getDB();
  try {
    db.prepare(
      'UPDATE streams SET status = ?, end_time = CURRENT_TIMESTAMP WHERE room_id = ? AND host_id = ?'
    ).run('ended', roomId, req.user.id);

    res.json({ message: '直播结束成功' });
  } catch (error) {
    res.status(500).json({ error: '结束直播失败' });
  }
});

router.post('/:roomId/enter', authenticateToken, (req, res) => {
  const { roomId, password } = req.body;

  const db = getDB();
  try {
    const stream = db.prepare('SELECT * FROM streams WHERE room_id = ?').get(roomId);
    
    if (!stream) {
      return res.status(404).json({ error: '直播间不存在' });
    }

    if (stream.is_private && stream.password !== password) {
      return res.status(403).json({ error: '密码错误' });
    }

    if (stream.status !== 'live') {
      return res.status(400).json({ error: '直播未开始' });
    }

    db.prepare('INSERT OR IGNORE INTO stream_viewers (stream_id, user_id) VALUES (?, ?)').run(stream.id, req.user.id);
    db.prepare('UPDATE streams SET viewers_count = viewers_count + 1 WHERE id = ?').run(stream.id);

    res.json({ message: '进入直播间成功', stream });
  } catch (error) {
    res.status(500).json({ error: '进入直播间失败' });
  }
});

router.post('/:roomId/leave', authenticateToken, (req, res) => {
  const { roomId } = req.params;

  const db = getDB();
  try {
    const stream = db.prepare('SELECT * FROM streams WHERE room_id = ?').get(roomId);
    
    if (!stream) {
      return res.status(404).json({ error: '直播间不存在' });
    }

    db.prepare('UPDATE stream_viewers SET left_at = CURRENT_TIMESTAMP WHERE stream_id = ? AND user_id = ?').run(stream.id, req.user.id);
    db.prepare('UPDATE streams SET viewers_count = MAX(viewers_count - 1, 0) WHERE id = ?').run(stream.id);

    res.json({ message: '离开直播间成功' });
  } catch (error) {
    res.status(500).json({ error: '离开直播间失败' });
  }
});

router.get('/:roomId/viewers', (req, res) => {
  const { roomId } = req.params;

  const db = getDB();
  try {
    const viewers = db.prepare(
      'SELECT u.id, u.username, u.nickname, u.avatar, u.level FROM stream_viewers sv JOIN users u ON sv.user_id = u.id JOIN streams s ON sv.stream_id = s.id WHERE s.room_id = ? AND sv.left_at IS NULL'
    ).all(roomId);

    res.json(viewers);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;