const express = require('express');
const { getDB } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/video', authenticateToken, (req, res) => {
  const { videoId } = req.body;

  const db = getDB();
  try {
    const existing = db.prepare(
      'SELECT * FROM video_favorites WHERE user_id = ? AND video_id = ?'
    ).get(req.user.id, videoId);

    if (existing) {
      return res.status(400).json({ error: '已收藏该视频' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const result = db.prepare(
      'INSERT INTO video_favorites (user_id, video_id, created_at) VALUES (?, ?, ?)'
    ).run(req.user.id, videoId, now);

    res.json({ message: '收藏成功', id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: '收藏失败' });
  }
});

router.delete('/video/:videoId', authenticateToken, (req, res) => {
  const { videoId } = req.params;

  const db = getDB();
  try {
    const result = db.prepare(
      'DELETE FROM video_favorites WHERE user_id = ? AND video_id = ?'
    ).run(req.user.id, videoId);

    res.json({ message: '取消收藏成功', removed: result.changes > 0 });
  } catch (error) {
    res.status(500).json({ error: '取消收藏失败' });
  }
});

router.get('/videos', authenticateToken, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const db = getDB();
  try {
    const favoriteIds = db.prepare(
      'SELECT video_id FROM video_favorites WHERE user_id = ? ORDER BY created_at DESC'
    ).all(req.user.id).map(f => f.video_id);

    if (favoriteIds.length === 0) {
      return res.json([]);
    }

    const videos = db.prepare(
      'SELECT * FROM videos WHERE id IN (' + favoriteIds.map(() => '?').join(',') + ') AND status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(...favoriteIds, 'approved', parseInt(limit), offset);

    const result = videos.map(video => {
      const user = db.prepare('SELECT id, username, nickname, avatar FROM users WHERE id = ?').get(video.user_id);
      return { ...video, userId: video.user_id, ...user };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/video/:videoId/check', authenticateToken, (req, res) => {
  const { videoId } = req.params;

  const db = getDB();
  try {
    const favorite = db.prepare(
      'SELECT * FROM video_favorites WHERE user_id = ? AND video_id = ?'
    ).get(req.user.id, videoId);

    res.json({ isFavorited: !!favorite });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;