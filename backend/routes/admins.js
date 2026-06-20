const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  db.all('SELECT id, admin_id, name, created_at FROM admins', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    res.json(rows);
  });
});

router.post('/', authenticateToken, (req, res) => {
  const { admin_id, name, password } = req.body;

  if (!admin_id || !name || !password) {
    return res.status(400).json({ error: '请提供管理员ID、姓名和密码' });
  }

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      return res.status(500).json({ error: '密码加密错误' });
    }

    db.run(
      'INSERT INTO admins (admin_id, name, password) VALUES (?, ?, ?)',
      [admin_id, name, hash],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: '管理员ID已存在' });
          }
          return res.status(500).json({ error: '数据库错误' });
        }
        res.status(201).json({ id: this.lastID, admin_id, name });
      }
    );
  });
});

module.exports = router;