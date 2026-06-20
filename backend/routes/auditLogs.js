const express = require('express');
const router = express.Router();
const db = require('../database');

// 记录审计日志
const logAudit = (action, entityType, entityId, entityName, details, user) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO audit_logs (action, entity_type, entity_id, entity_name, details, user_id, user_name, user_role) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [action, entityType, entityId, entityName, details, user.id, user.name, user.role],
      function(err) {
        if (err) {
          console.error('审计日志记录失败:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
};

// 获取审计日志列表（仅管理员）
router.get('/', (req, res) => {
  const { page = 1, pageSize = 20, action, entity_type, start_date, end_date, user_name } = req.query;
  const offset = (page - 1) * pageSize;
  
  let whereClause = '1=1';
  const params = [];
  
  if (action) {
    whereClause += ' AND action = ?';
    params.push(action);
  }
  
  if (entity_type) {
    whereClause += ' AND entity_type = ?';
    params.push(entity_type);
  }
  
  if (start_date) {
    whereClause += ' AND created_at >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    whereClause += ' AND created_at <= ?';
    params.push(end_date + ' 23:59:59');
  }
  
  if (user_name) {
    whereClause += ' AND user_name LIKE ?';
    params.push(`%${user_name}%`);
  }
  
  // 获取总数
  db.get(`SELECT COUNT(*) as total FROM audit_logs WHERE ${whereClause}`, params, (err, row) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    
    const total = row.total;
    
    // 获取分页数据
    db.all(
      `SELECT * FROM audit_logs WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), offset],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: '数据库错误' });
        }
        
        res.json({
          logs: rows,
          total,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          totalPages: Math.ceil(total / pageSize)
        });
      }
    );
  });
});

// 获取审计统计
router.get('/stats', (req, res) => {
  const { start_date, end_date } = req.query;
  
  let whereClause = '1=1';
  const params = [];
  
  if (start_date) {
    whereClause += ' AND created_at >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    whereClause += ' AND created_at <= ?';
    params.push(end_date + ' 23:59:59');
  }
  
  // 按操作类型统计
  db.all(
    `SELECT action, entity_type, COUNT(*) as count FROM audit_logs WHERE ${whereClause} GROUP BY action, entity_type`,
    params,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      res.json(rows);
    }
  );
});

module.exports = router;
module.exports.logAudit = logAudit;
