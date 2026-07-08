const express = require('express');
const { getDB } = require('../database');
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/submit', authenticateToken, (req, res) => {
  const { real_name, id_card, front_photo, back_photo, hand_photo } = req.body;

  if (!real_name || !id_card) {
    return res.status(400).json({ error: '请填写真实姓名和身份证号' });
  }

  const db = getDB();
  try {
    const existing = db.prepare('SELECT * FROM id_certifications WHERE user_id = ?').get(req.user.id);
    if (existing && existing.status === 'pending') {
      return res.status(400).json({ error: '已有审核中的认证申请，请等待审核完成' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const result = db.prepare(
      'INSERT INTO id_certifications (user_id, real_name, id_card, front_photo, back_photo, hand_photo, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, real_name, id_card, front_photo || '', back_photo || '', hand_photo || '', 'pending', now);

    res.json({ message: '实名认证已提交，等待审核', id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: '提交失败，请稍后重试' });
  }
});

router.get('/my', authenticateToken, (req, res) => {
  const db = getDB();
  try {
    const certification = db.prepare('SELECT * FROM id_certifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(req.user.id);
    res.json(certification || null);
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/', authenticateAdmin, (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let query = 'SELECT c.*, u.nickname, u.username, u.phone FROM id_certifications c JOIN users u ON c.user_id = u.id';
  const params = [];

  if (status) {
    query += ' WHERE c.status = ?';
    params.push(status);
  }

  query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const db = getDB();
  try {
    const certifications = db.prepare(query).all(...params);
    res.json(certifications);
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/:certId', authenticateAdmin, (req, res) => {
  const { certId } = req.params;

  const db = getDB();
  try {
    const certification = db.prepare('SELECT c.*, u.nickname, u.username, u.phone FROM id_certifications c JOIN users u ON c.user_id = u.id WHERE c.id = ?').get(certId);
    if (!certification) {
      return res.status(404).json({ error: '认证记录不存在' });
    }
    res.json(certification);
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.put('/:certId/approve', authenticateAdmin, (req, res) => {
  const { certId } = req.params;
  const { remark } = req.body;

  console.log('DEBUG - approve cert:', { certId: parseInt(certId), remark });

  const db = getDB();
  try {
    const certification = db.prepare('SELECT * FROM id_certifications WHERE id = ?').get(parseInt(certId));
    console.log('DEBUG - certification found:', certification);
    
    if (!certification) {
      return res.status(404).json({ error: '认证记录不存在' });
    }

    if (certification.status !== 'pending') {
      return res.status(400).json({ error: '该记录已审核' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const result = db.prepare(
      'UPDATE id_certifications SET status = ?, admin_id = ?, reviewed_at = ?, remark = ? WHERE id = ?'
    ).run('approved', req.admin.id, now, remark || '', parseInt(certId));
    console.log('DEBUG - update result:', result);

    db.prepare('UPDATE users SET is_host = 1, host_status = ? WHERE id = ?').run('approved', certification.user_id);

    res.json({ message: '审核通过' });
  } catch (error) {
    console.error('DEBUG - approve error:', error);
    res.status(500).json({ error: '审核失败' });
  }
});

router.put('/:certId/reject', authenticateAdmin, (req, res) => {
  const { certId } = req.params;
  const { remark } = req.body;

  const db = getDB();
  try {
    const certification = db.prepare('SELECT * FROM id_certifications WHERE id = ?').get(certId);
    if (!certification) {
      return res.status(404).json({ error: '认证记录不存在' });
    }

    if (certification.status !== 'pending') {
      return res.status(400).json({ error: '该记录已审核' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    db.prepare(
      'UPDATE id_certifications SET status = ?, admin_id = ?, reviewed_at = ?, remark = ? WHERE id = ?'
    ).run('rejected', req.admin.id, now, remark || '', certId);

    db.prepare('UPDATE users SET is_host = 0, host_status = ? WHERE id = ?').run('rejected', certification.user_id);

    res.json({ message: '已拒绝' });
  } catch (error) {
    res.status(500).json({ error: '操作失败' });
  }
});

module.exports = router;