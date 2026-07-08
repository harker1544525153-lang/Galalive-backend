﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿const express = require('express');
const { getDB } = require('../database');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', authenticateAdmin, (req, res) => {
  const db = getDB();
  try {
    const users = db.tables['users'] || [];
    const streams = db.tables['streams'] || [];
    const transactions = db.tables['transactions'] || [];
    const certifications = db.tables['id_certifications'] || [];
    
    const memberCount = users.length;
    const hostCount = users.filter(u => u.is_host === 1).length;
    const liveStreamCount = streams.filter(s => s.status === 'live').length;
    
    const rechargeTransactions = transactions.filter(t => t.type === 'recharge');
    const withdrawTransactions = transactions.filter(t => t.type === 'withdraw');
    const totalRecharge = rechargeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalWithdraw = withdrawTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const today = new Date().toISOString().split('T')[0];
    const todayRecharge = transactions.filter(t => t.type === 'recharge' && t.created_at?.startsWith(today)).reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const pendingReview = users.filter(u => u.is_host === 1 && u.host_status === 'pending').length;
    const approvedReview = users.filter(u => u.is_host === 1 && u.host_status === 'approved').length;
    const rejectedReview = users.filter(u => u.is_host === 1 && u.host_status === 'rejected').length;
    
    const todayTransactions = transactions.filter(t => t.created_at?.startsWith(today)).length;
    
    const normalUsers = users.filter(u => u.is_host === 0 && (u.level < 10 || u.level === undefined)).length;
    const vipUsers = users.filter(u => u.level >= 10).length;
    
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    
    const pendingCert = certifications.filter(c => c.status === 'pending').length;
    const approvedCert = certifications.filter(c => c.status === 'approved').length;
    const rejectedCert = certifications.filter(c => c.status === 'rejected').length;
    
    const totalIncome = transactions.filter(t => t.type === 'recharge').reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const userTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = users.filter(u => u.created_at?.startsWith(dateStr)).length;
      userTrend.push({ date: dateStr, count });
    }
    
    const result = {
      memberCount,
      hostCount,
      liveStreamCount,
      totalRecharge,
      totalWithdraw,
      todayRevenue: todayRecharge,
      todayTransactions,
      totalIncome,
      
      pendingReview,
      approvedReview,
      rejectedReview,
      
      pendingCert,
      approvedCert,
      rejectedCert,
      
      activeUsers,
      totalUsers,
      
      userTypes: [
        { label: '普通用户', value: memberCount > 0 ? Math.round(normalUsers / memberCount * 100) : 85, count: normalUsers, color: 'bg-blue-500' },
        { label: '主播', value: memberCount > 0 ? Math.round(hostCount / memberCount * 100) : 10, count: hostCount, color: 'bg-purple-500' },
        { label: 'VIP用户', value: memberCount > 0 ? Math.round(vipUsers / memberCount * 100) : 5, count: vipUsers, color: 'bg-yellow-500' },
      ],
      userTrend,
    };
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/users', authenticateAdmin, (req, res) => {
  const { page = 1, limit = 20, keyword } = req.query;
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?';
  const params = [parseInt(limit), offset];

  if (keyword) {
    query = 'SELECT * FROM users WHERE username LIKE ? OR nickname LIKE ? OR phone LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.unshift(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  const db = getDB();
  try {
    const users = db.prepare(query).all(...params);
    users.forEach(u => delete u.password);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/users/:userId', authenticateAdmin, (req, res) => {
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

router.put('/users/:userId', authenticateAdmin, (req, res) => {
  const { userId } = req.params;
  const { status, is_host, host_status, nickname, phone, level, host_level, coins, diamonds, gender, address, signature, avatar } = req.body;

  const db = getDB();
  try {
    if (nickname) {
      const existingByNickname = db.prepare('SELECT id FROM users WHERE nickname = ? AND id != ?').get(nickname, userId);
      if (existingByNickname) {
        return res.status(400).json({ error: '昵称已被使用' });
      }
    }

    if (phone) {
      const existingByPhone = db.prepare('SELECT id FROM users WHERE phone = ? AND id != ?').get(phone, userId);
      if (existingByPhone) {
        return res.status(400).json({ error: '手机号已被注册' });
      }
    }

    let updateFields = [];
    let updateParams = [];

    if (status !== undefined) { updateFields.push('status = ?'); updateParams.push(status); }
    if (is_host !== undefined) { updateFields.push('is_host = ?'); updateParams.push(is_host); }
    if (host_status !== undefined) { updateFields.push('host_status = ?'); updateParams.push(host_status); }
    if (nickname !== undefined) { updateFields.push('nickname = ?'); updateParams.push(nickname); }
    if (phone !== undefined) { updateFields.push('phone = ?'); updateParams.push(phone); }
    if (level !== undefined) { updateFields.push('level = ?'); updateParams.push(level); }
    if (host_level !== undefined) { updateFields.push('host_level = ?'); updateParams.push(host_level); }
    if (coins !== undefined) { updateFields.push('coins = ?'); updateParams.push(coins); }
    if (diamonds !== undefined) { updateFields.push('diamonds = ?'); updateParams.push(diamonds); }
    if (gender !== undefined) { updateFields.push('gender = ?'); updateParams.push(gender); }
    if (address !== undefined) { updateFields.push('address = ?'); updateParams.push(address); }
    if (signature !== undefined) { updateFields.push('signature = ?'); updateParams.push(signature); }
    if (avatar !== undefined) { updateFields.push('avatar = ?'); updateParams.push(avatar); }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateParams.push(userId);

    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...updateParams);

    res.json({ message: '用户更新成功' });
  } catch (error) {
    res.status(500).json({ error: '更新失败' });
  }
});

router.get('/streams', authenticateAdmin, (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (page - 1) * limit;

  const db = getDB();
  try {
    let streams = db.tables['streams'] || [];
    const users = db.tables['users'] || [];

    if (status) {
      streams = streams.filter(s => s.status === status);
    }

    streams.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB - dateA;
    });

    const paginatedStreams = streams.slice(offset, offset + parseInt(limit));

    const result = paginatedStreams.map(stream => {
      const user = users.find(u => u.id === stream.host_id);
      return {
        ...stream,
        username: user?.username || '',
        nickname: user?.nickname || '',
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/transactions', authenticateAdmin, (req, res) => {
  const { page = 1, limit = 20, type } = req.query;
  const offset = (page - 1) * limit;

  const db = getDB();
  try {
    let transactions = db.tables['transactions'] || [];
    const users = db.tables['users'] || [];

    if (type) {
      transactions = transactions.filter(t => t.type === type);
    }

    transactions.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB - dateA;
    });

    const paginatedTransactions = transactions.slice(offset, offset + parseInt(limit));

    const result = paginatedTransactions.map(transaction => {
      const user = users.find(u => u.id === transaction.user_id);
      return {
        ...transaction,
        username: user?.username || '',
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/gifts', authenticateAdmin, (req, res) => {
  const db = getDB();
  try {
    const gifts = db.prepare('SELECT * FROM gifts ORDER BY price ASC').all();
    res.json(gifts);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/gifts', authenticateAdmin, (req, res) => {
  const { name, icon, price, can_multiply } = req.body;

  const db = getDB();
  try {
    const result = db.prepare('INSERT INTO gifts (name, icon, price, can_multiply) VALUES (?, ?, ?, ?)').run(name, icon, price, can_multiply || 1);
    res.json({ message: '礼物创建成功', id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: '创建礼物失败' });
  }
});

router.put('/gifts/:giftId', authenticateAdmin, (req, res) => {
  const { giftId } = req.params;
  const { name, icon, price, can_multiply } = req.body;

  const db = getDB();
  try {
    db.prepare('UPDATE gifts SET name = ?, icon = ?, price = ?, can_multiply = ? WHERE id = ?').run(name, icon, price, can_multiply, giftId);
    res.json({ message: '礼物更新成功' });
  } catch (error) {
    res.status(500).json({ error: '更新礼物失败' });
  }
});

router.delete('/gifts/:giftId', authenticateAdmin, (req, res) => {
  const { giftId } = req.params;

  const db = getDB();
  try {
    db.prepare('DELETE FROM gifts WHERE id = ?').run(giftId);
    res.json({ message: '礼物删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除礼物失败' });
  }
});

router.get('/categories', authenticateAdmin, (req, res) => {
  const db = getDB();
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/categories', authenticateAdmin, (req, res) => {
  const { name, icon, sort_order } = req.body;

  const db = getDB();
  try {
    const result = db.prepare('INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)').run(name, icon || '', sort_order || 0);
    res.json({ message: '分类创建成功', id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: '创建分类失败' });
  }
});

router.put('/categories/:categoryId', authenticateAdmin, (req, res) => {
  const { categoryId } = req.params;
  const { name, icon, sort_order, is_active } = req.body;

  const db = getDB();
  try {
    db.prepare('UPDATE categories SET name = ?, icon = ?, sort_order = ?, is_active = ? WHERE id = ?').run(name, icon, sort_order, is_active, categoryId);
    res.json({ message: '分类更新成功' });
  } catch (error) {
    res.status(500).json({ error: '更新分类失败' });
  }
});

router.delete('/categories/:categoryId', authenticateAdmin, (req, res) => {
  const { categoryId } = req.params;

  const db = getDB();
  try {
    db.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);
    res.json({ message: '分类删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除分类失败' });
  }
});

router.get('/banners', authenticateAdmin, (req, res) => {
  const db = getDB();
  try {
    const banners = db.prepare('SELECT * FROM banners ORDER BY sort_order ASC').all();
    res.json(banners);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/banners', authenticateAdmin, (req, res) => {
  const { image_url, link, sort_order, is_active } = req.body;

  const db = getDB();
  try {
    const result = db.prepare('INSERT INTO banners (image_url, link, sort_order, is_active) VALUES (?, ?, ?, ?)').run(image_url, link || '', sort_order || 0, is_active || 1);
    res.json({ message: '横幅创建成功', id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: '创建横幅失败' });
  }
});

router.put('/banners/:bannerId', authenticateAdmin, (req, res) => {
  const { bannerId } = req.params;
  const { image_url, link, sort_order, is_active } = req.body;

  const db = getDB();
  try {
    db.prepare('UPDATE banners SET image_url = ?, link = ?, sort_order = ?, is_active = ? WHERE id = ?').run(image_url, link, sort_order, is_active, bannerId);
    res.json({ message: '横幅更新成功' });
  } catch (error) {
    res.status(500).json({ error: '更新横幅失败' });
  }
});

router.delete('/banners/:bannerId', authenticateAdmin, (req, res) => {
  const { bannerId } = req.params;

  const db = getDB();
  try {
    db.prepare('DELETE FROM banners WHERE id = ?').run(bannerId);
    res.json({ message: '横幅删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除横幅失败' });
  }
});

router.get('/certifications', authenticateAdmin, (req, res) => {
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

router.get('/certifications/:certId', authenticateAdmin, (req, res) => {
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

router.put('/certifications/:certId/approve', authenticateAdmin, (req, res) => {
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
    ).run('approved', req.admin.id, now, remark || '', certId);

    db.prepare('UPDATE users SET is_host = 1, host_status = ? WHERE id = ?').run('approved', certification.user_id);

    res.json({ message: '审核通过' });
  } catch (error) {
    res.status(500).json({ error: '审核失败' });
  }
});

router.put('/certifications/:certId/reject', authenticateAdmin, (req, res) => {
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

router.get('/level-configs', authenticateAdmin, (req, res) => {
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

router.get('/level-configs/:id', authenticateAdmin, (req, res) => {
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

router.post('/level-configs', authenticateAdmin, (req, res) => {
  const { type, level, min_exp, max_exp, name, icon, benefits } = req.body;

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
      'INSERT INTO level_configs (type, level, min_exp, max_exp, name, icon, benefits, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(type, level, min_exp, max_exp, name, icon || '', benefits || '', now);

    res.json({ message: '创建成功', id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: '创建失败' });
  }
});

router.put('/level-configs/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const { type, level, min_exp, max_exp, name, icon, benefits } = req.body;

  const db = getDB();
  try {
    const config = db.prepare('SELECT * FROM level_configs WHERE id = ?').get(id);
    if (!config) {
      return res.status(404).json({ error: '配置不存在' });
    }

    db.prepare(
      'UPDATE level_configs SET type = ?, level = ?, min_exp = ?, max_exp = ?, name = ?, icon = ?, benefits = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(type || config.type, level || config.level, min_exp || config.min_exp, max_exp || config.max_exp, name || config.name, icon || config.icon, benefits || config.benefits, id);

    res.json({ message: '更新成功' });
  } catch (error) {
    res.status(500).json({ error: '更新失败' });
  }
});

router.delete('/level-configs/:id', authenticateAdmin, (req, res) => {
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