﻿﻿﻿const express = require('express');
const { getDB } = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDB();
  try {
    const banners = db.prepare('SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order ASC').all();
    res.json(banners);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;