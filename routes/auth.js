const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getDB } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const smsCodeStore = {};

router.post('/send-sms', (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: '请输入手机号' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  smsCodeStore[phone] = {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000
  };

  console.log(`验证码 ${code} 已发送到 ${phone}`);
  res.json({ message: '验证码已发送，请注意查收' });
});

router.post('/register', (req, res) => {
  const { phone, code, nickname, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ error: '手机号和密码不能为空' });
  }

  if (!nickname) {
    return res.status(400).json({ error: '昵称不能为空' });
  }

  if (!code) {
    return res.status(400).json({ error: '请输入验证码', field: 'code' });
  }

  const db = getDB();
  try {
    const existingByPhone = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
    if (existingByPhone) {
      return res.status(400).json({ error: '手机号已存在', field: 'phone' });
    }

    const existingByNickname = db.prepare('SELECT id FROM users WHERE nickname = ?').get(nickname);
    if (existingByNickname) {
      return res.status(400).json({ error: '昵称已存在', field: 'nickname' });
    }

    const stored = smsCodeStore[phone];
    if (!stored || Date.now() > stored.expiresAt) {
      return res.status(400).json({ error: '验证码已过期，请重新获取', field: 'code' });
    }
    if (code !== stored.code) {
      return res.status(400).json({ error: '验证码错误', field: 'code' });
    }

    delete smsCodeStore[phone];

    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        return res.status(500).json({ error: '服务器错误' });
      }

      try {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const result = db.prepare(
          'INSERT INTO users (username, password, phone, nickname, created_at) VALUES (?, ?, ?, ?, ?)'
        ).run(phone, hash, phone, nickname, now);

        const token = jwt.sign({ id: result.lastInsertRowid, username: phone }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({
          message: '注册成功',
          token,
          user: { 
            id: result.lastInsertRowid, 
            username: phone, 
            nickname,
            phone,
            gender: 'unknown',
            signature: '',
            address: '',
            avatar: null,
            level: 0,
            host_level: 0,
            diamonds: 0,
            coins: 0,
            is_host: 0,
            created_at: now
          }
        });
      } catch (error) {
        res.status(400).json({ error: '注册失败，请稍后重试' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/login', (req, res) => {
  const { username, password, phone, code } = req.body;

  const db = getDB();
  try {
    let user;
    if (phone) {
      user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
      if (!user) {
        user = db.prepare('SELECT * FROM users WHERE username = ?').get(phone);
      }
    } else if (username) {
      user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    }
    
    if (!user) {
      return res.status(400).json({ error: '用户不存在' });
    }

    if (code) {
      const stored = smsCodeStore[phone];
      if (!stored || Date.now() > stored.expiresAt) {
        return res.status(400).json({ error: '验证码已过期，请重新获取' });
      }
      if (code !== stored.code) {
        return res.status(400).json({ error: '验证码错误' });
      }

      delete smsCodeStore[phone];
      
      const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
      res.json({
        message: '登录成功',
        token,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          level: user.level,
          diamonds: user.diamonds,
          coins: user.coins,
          is_host: user.is_host,
          gender: user.gender,
          signature: user.signature,
          address: user.address,
          created_at: user.created_at
        }
      });
    } else {
      bcrypt.compare(password, user.password, (error, match) => {
        if (!match) {
          return res.status(400).json({ error: '账号或密码错误' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({
          message: '登录成功',
          token,
          user: {
            id: user.id,
            username: user.username,
            nickname: user.nickname,
            avatar: user.avatar,
            level: user.level,
            diamonds: user.diamonds,
            coins: user.coins,
            is_host: user.is_host,
            gender: user.gender,
            signature: user.signature,
            address: user.address,
            created_at: user.created_at
          }
        });
      });
    }
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/profile', authenticateToken, (req, res) => {
  const db = getDB();
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }
    delete user.password;
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.put('/profile', authenticateToken, (req, res) => {
  const { nickname, gender, signature, address, avatar, cover } = req.body;

  const db = getDB();
  try {
    if (nickname) {
      const existingByNickname = db.prepare('SELECT id FROM users WHERE nickname = ? AND id != ?').get(nickname, req.user.id);
      if (existingByNickname) {
        return res.status(400).json({ error: '昵称已被使用' });
      }
    }

    db.prepare(
      'UPDATE users SET nickname = ?, gender = ?, signature = ?, address = ?, avatar = ?, cover = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(nickname, gender, signature, address, avatar, cover, req.user.id);

    res.json({ message: '个人资料更新成功' });
  } catch (error) {
    res.status(500).json({ error: '更新失败' });
  }
});

router.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  const db = getDB();
  try {
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    
    if (!admin) {
      return res.status(400).json({ error: '账号或密码错误' });
    }

    bcrypt.compare(password, admin.password, (error, match) => {
      if (!match) {
        return res.status(400).json({ error: '账号或密码错误' });
      }

      const token = jwt.sign({ id: admin.id, username: admin.username, isAdmin: true }, process.env.JWT_SECRET, { expiresIn: '24h' });
      res.json({
        message: '登录成功',
        token,
        admin: { id: admin.id, username: admin.username, role: admin.role }
      });
    });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
