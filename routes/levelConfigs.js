const express = require('express');
const { getDB } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const { type } = req.query;

  const db = getDB();
  try {
    let query = 'SELECT * FROM level_configs ORDER BY type, level ASC';
    const params = [];

    if (type) {
      query = 'SELECT * FROM level_configs WHERE type = ? ORDER BY level ASC';
      params.push(type);
    }

    const configs = db.prepare(query).all(...params);
    res.json(configs);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/:id', (req, res) => {
  const { id } = req.params;

  const db = getDB();
  try {
    const config = db.prepare('SELECT * FROM level_configs WHERE id = ?').get(id);
    if (!config) {
      return res.status(404).json({ error: '配置不存在' });
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/', authenticateToken, (req, res) => {
  const { type, level, min_exp, max_exp, name, icon, color, benefits } = req.body;

  if (!type || !level || !min_exp || !max_exp || !name) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const db = getDB();
  try {
    const existing = db.prepare(
      'SELECT * FROM level_configs WHERE type = ? AND level = ?'
    ).get(type, level);

    if (existing) {
      return res.status(400).json({ error: '该等级已存在' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const result = db.prepare(
      'INSERT INTO level_configs (type, level, min_exp, max_exp, name, icon, color, benefits, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(type, level, min_exp, max_exp, name, icon || '', color || '#a855f7', benefits || '', now);

    res.json({ message: '创建成功', id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: '创建失败' });
  }
});

router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { type, level, min_exp, max_exp, name, icon, color, benefits } = req.body;

  const db = getDB();
  try {
    const config = db.prepare('SELECT * FROM level_configs WHERE id = ?').get(id);
    if (!config) {
      return res.status(404).json({ error: '配置不存在' });
    }

    db.prepare(
      'UPDATE level_configs SET type = ?, level = ?, min_exp = ?, max_exp = ?, name = ?, icon = ?, color = ?, benefits = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(type || config.type, level || config.level, min_exp || config.min_exp, max_exp || config.max_exp, name || config.name, icon || config.icon, color || config.color, benefits || config.benefits, id);

    res.json({ message: '更新成功' });
  } catch (error) {
    res.status(500).json({ error: '更新失败' });
  }
});

router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const db = getDB();
  try {
    const result = db.prepare('DELETE FROM level_configs WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: '配置不存在' });
    }
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;