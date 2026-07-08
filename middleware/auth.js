const jwt = require('jsonwebtoken');
const { getDB } = require('../database');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, admin) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    const db = getDB();
    const result = db.prepare('SELECT * FROM admins WHERE id = ?').get(admin.id);
    if (!result) {
      return res.status(403).json({ error: 'Admin not found' });
    }
    req.admin = result;
    next();
  });
};

module.exports = { authenticateToken, authenticateAdmin };
