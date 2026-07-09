const express = require('express');
const { getDB } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/follow', authenticateToken, (req, res) => {
  const { followeeId } = req.body;

  if (req.user.id === followeeId) {
    return res.status(400).json({ error: '不能关注自己' });
  }

  const db = getDB();
  try {
    const existing = db.prepare('SELECT * FROM follows WHERE follower_id = ? AND followee_id = ?').get(req.user.id, followeeId);
    
    if (existing) {
      return res.json({ message: '已关注', followed: true });
    }
    
    const result = db.prepare('INSERT INTO follows (follower_id, followee_id) VALUES (?, ?)').run(req.user.id, followeeId);
    res.json({ message: '关注成功', followed: result.changes > 0 });
  } catch (error) {
    res.status(500).json({ error: '关注失败' });
  }
});

router.post('/unfollow', authenticateToken, (req, res) => {
  const { followeeId } = req.body;

  const db = getDB();
  try {
    const result = db.prepare('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?').run(req.user.id, followeeId);
    res.json({ message: '取消关注成功', unfollowed: result.changes > 0 });
  } catch (error) {
    res.status(500).json({ error: '取消关注失败' });
  }
});

router.get('/following', authenticateToken, (req, res) => {
  const db = getDB();
  try {
    const users = db.prepare(
      'SELECT u.id, u.username, u.nickname, u.phone, u.cover, u.is_host, u.level FROM follows f JOIN users u ON f.followee_id = u.id WHERE f.follower_id = ?'
    ).all(req.user.id);

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/followers', authenticateToken, (req, res) => {
  const db = getDB();
  try {
    const users = db.prepare(
      'SELECT u.id, u.username, u.nickname, u.phone, u.cover FROM follows f JOIN users u ON f.follower_id = u.id WHERE f.followee_id = ?'
    ).all(req.user.id);

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/:userId/following', (req, res) => {
  const { userId } = req.params;

  const db = getDB();
  try {
    const users = db.prepare(
      'SELECT u.id, u.username, u.nickname, u.phone, u.cover, u.is_host, u.level FROM follows f JOIN users u ON f.followee_id = u.id WHERE f.follower_id = ?'
    ).all(userId);

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/:userId/followers', (req, res) => {
  const { userId } = req.params;

  const db = getDB();
  try {
    const users = db.prepare(
      'SELECT u.id, u.username, u.nickname, u.phone, u.cover FROM follows f JOIN users u ON f.follower_id = u.id WHERE f.followee_id = ?'
    ).all(userId);

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/check', authenticateToken, (req, res) => {
  const { followeeId } = req.query;

  const db = getDB();
  try {
    const follow = db.prepare(
      'SELECT * FROM follows WHERE follower_id = ? AND followee_id = ?'
    ).get(req.user.id, followeeId);

    res.json({ isFollowing: !!follow });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;