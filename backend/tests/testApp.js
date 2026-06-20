const request = require('supertest');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 创建测试数据库
const createTestDb = () => {
  return new Promise((resolve) => {
    const db = new sqlite3.Database(':memory:');
    
    db.serialize(() => {
      // 创建所有表
      db.run(`CREATE TABLE admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      
      db.run(`CREATE TABLE teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        department TEXT,
        phone TEXT,
        email TEXT,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      
      db.run(`CREATE TABLE students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        enrollment_year TEXT,
        department TEXT,
        class TEXT,
        course_name TEXT,
        course_code TEXT,
        credits TEXT,
        teacher_id INTEGER,
        phone TEXT,
        email TEXT,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id)
      )`);
      
      db.run(`CREATE TABLE internships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        internship_type TEXT,
        organization_form TEXT,
        internship_method TEXT,
        academic_year TEXT,
        company_name TEXT NOT NULL,
        company_code TEXT,
        region TEXT,
        address TEXT,
        has_insurance INTEGER DEFAULT 0,
        has_accident_insurance INTEGER DEFAULT 0,
        has_safety_training INTEGER DEFAULT 0,
        has_agreement INTEGER DEFAULT 0,
        company_source TEXT,
        has_emergency_plan INTEGER DEFAULT 0,
        is_base INTEGER DEFAULT 0,
        is_digital_base INTEGER DEFAULT 0,
        is_overseas_base INTEGER DEFAULT 0,
        start_date TEXT,
        end_date TEXT,
        actual_days INTEGER,
        position TEXT,
        salary TEXT,
        supervisor_name TEXT,
        supervisor_phone TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id)
      )`);
      
      db.run(`CREATE TABLE audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        entity_name TEXT,
        details TEXT,
        user_id INTEGER NOT NULL,
        user_name TEXT NOT NULL,
        user_role TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      
      // 插入测试数据 - 使用 serialize 确保顺序执行
      const defaultPassword = bcrypt.hashSync('123456', 10);
      
      db.run('INSERT INTO admins (username, password) VALUES (?, ?)', ['admin', defaultPassword]);
      db.run('INSERT INTO teachers (teacher_id, name, department, password) VALUES (?, ?, ?, ?)', 
        ['T001', '测试教师', '计算机系', defaultPassword]);
      db.run(`INSERT INTO students (student_id, name, department, class, teacher_id, password) 
              VALUES (?, ?, ?, ?, ?, ?)`, 
        ['S001', '测试学生', '计算机系', '2021级1班', 1, defaultPassword]);
      db.run(`INSERT INTO internships (student_id, company_name, status) VALUES (?, ?, ?)`, 
        [1, '测试公司', 'pending'], function() {
          // 所有数据插入完成后才 resolve
          resolve(db);
        });
    });
  });
};

// 记录审计日志
const logAudit = (db) => (action, entityType, entityId, entityName, details, user) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO audit_logs (action, entity_type, entity_id, entity_name, details, user_id, user_name, user_role) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [action, entityType, entityId, entityName, details, user.id, user.name, user.role],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
};

// 认证中间件
const authenticateToken = (db) => (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: '未授权' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'test-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: '令牌无效' });
    }
    req.user = user;
    next();
  });
};

// 创建测试应用
const createTestApp = (db) => {
  const app = express();
  app.use(express.json());
  
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  
  // 登录路由
  app.post('/api/auth/login', (req, res) => {
    const { username, password, role } = req.body;
    
    if (!username || !password || !role) {
      return res.status(400).json({ error: '请提供用户名、密码和角色' });
    }
    
    let table, idField;
    if (role === 'admin') {
      table = 'admins';
      idField = 'username';
    } else if (role === 'teacher') {
      table = 'teachers';
      idField = 'teacher_id';
    } else {
      table = 'students';
      idField = 'student_id';
    }
    
    db.get(`SELECT * FROM ${table} WHERE ${idField} = ?`, [username], (err, user) => {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      if (!user) {
        return res.status(401).json({ error: '用户不存在' });
      }
      
      const passwordHash = Buffer.isBuffer(user.password) ? user.password.toString() : user.password;
      bcrypt.compare(password, passwordHash, (err, result) => {
        if (err || !result) {
          return res.status(401).json({ error: '密码错误' });
        }
        
        const token = jwt.sign(
          { id: user.id, username: user[idField] || user.username, role },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        res.json({
          token,
          user: {
            id: user.id,
            username: user[idField] || user.username,
            name: user.name,
            role
          }
        });
      });
    });
  });
  
  // 教师路由
  app.get('/api/teachers', authenticateToken(db), (req, res) => {
    const user = req.user;
    
    if (user.role === 'teacher') {
      db.get('SELECT id, teacher_id, name, department, phone, email FROM teachers WHERE id = ?', [user.id], (err, row) => {
        if (err) return res.status(500).json({ error: '数据库错误' });
        res.json(row ? [row] : []);
      });
    } else if (user.role === 'admin') {
      db.all('SELECT id, teacher_id, name, department, phone, email FROM teachers', [], (err, rows) => {
        if (err) return res.status(500).json({ error: '数据库错误' });
        res.json(rows);
      });
    } else {
      res.status(403).json({ error: '无权访问' });
    }
  });
  
  app.post('/api/teachers', authenticateToken(db), async (req, res) => {
    const user = req.user;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: '无权访问' });
    }
    
    const { teacher_id, name, department, phone, email } = req.body;
    const defaultPassword = bcrypt.hashSync('123456', 10);
    
    db.run(
      'INSERT INTO teachers (teacher_id, name, department, phone, email, password) VALUES (?, ?, ?, ?, ?, ?)',
      [teacher_id, name, department, phone, email, defaultPassword],
      async function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: '教师工号已存在' });
          }
          return res.status(500).json({ error: '数据库错误' });
        }
        
        try {
          await logAudit(db)('创建', '教师', this.lastID, `${name} (${teacher_id})`, `工号: ${teacher_id}`, 
            { id: user.id, name: user.username || name, role: user.role });
        } catch (logErr) {
          console.error('审计日志记录失败:', logErr);
        }
        
        res.status(201).json({ id: this.lastID, teacher_id, name });
      }
    );
  });
  
  app.put('/api/teachers/:id', authenticateToken(db), async (req, res) => {
    const user = req.user;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: '无权访问' });
    }
    
    const { name, department, phone, email } = req.body;
    
    db.get('SELECT * FROM teachers WHERE id = ?', [req.params.id], async (err, oldData) => {
      if (err) return res.status(500).json({ error: '数据库错误' });
      if (!oldData) return res.status(404).json({ error: '教师不存在' });
      
      db.run(
        'UPDATE teachers SET name = ?, department = ?, phone = ?, email = ? WHERE id = ?',
        [name, department, phone, email, req.params.id],
        async function(err) {
          if (err) return res.status(500).json({ error: '数据库错误' });
          
          try {
            await logAudit(db)('修改', '教师', req.params.id, `${name} (${oldData.teacher_id})`, '更新教师信息',
              { id: user.id, name: user.username || name, role: user.role });
          } catch (logErr) {
            console.error('审计日志记录失败:', logErr);
          }
          
          res.json({ message: '更新成功' });
        }
      );
    });
  });
  
  app.delete('/api/teachers/:id', authenticateToken(db), async (req, res) => {
    const user = req.user;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: '无权访问' });
    }
    
    db.get('SELECT * FROM teachers WHERE id = ?', [req.params.id], async (err, teacher) => {
      if (err) return res.status(500).json({ error: '数据库错误' });
      if (!teacher) return res.status(404).json({ error: '教师不存在' });
      
      db.run('DELETE FROM teachers WHERE id = ?', [req.params.id], async function(err) {
        if (err) return res.status(500).json({ error: '数据库错误' });
        
        try {
          await logAudit(db)('删除', '教师', req.params.id, `${teacher.name} (${teacher.teacher_id})`, '删除教师',
            { id: user.id, name: user.username || teacher.name, role: user.role });
        } catch (logErr) {
          console.error('审计日志记录失败:', logErr);
        }
        
        res.json({ message: '删除成功' });
      });
    });
  });
  
  // 学生路由
  app.get('/api/students', authenticateToken(db), (req, res) => {
    const user = req.user;
    
    if (user.role === 'student') {
      db.get('SELECT s.*, t.name as teacher_name FROM students s LEFT JOIN teachers t ON s.teacher_id = t.id WHERE s.student_id = ?', [user.username], (err, row) => {
        if (err) return res.status(500).json({ error: '数据库错误' });
        res.json(row ? [row] : []);
      });
    } else {
      db.all('SELECT s.*, t.name as teacher_name FROM students s LEFT JOIN teachers t ON s.teacher_id = t.id', [], (err, rows) => {
        if (err) return res.status(500).json({ error: '数据库错误' });
        res.json(rows);
      });
    }
  });
  
  app.post('/api/students', authenticateToken(db), async (req, res) => {
    const user = req.user;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: '无权访问' });
    }
    
    const { student_id, name, department, class: className, teacher_id } = req.body;
    const defaultPassword = bcrypt.hashSync('123456', 10);
    
    db.run(
      'INSERT INTO students (student_id, name, department, class, teacher_id, password) VALUES (?, ?, ?, ?, ?, ?)',
      [student_id, name, department, className, teacher_id, defaultPassword],
      async function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: '学号已存在' });
          }
          return res.status(500).json({ error: '数据库错误' });
        }
        
        try {
          await logAudit(db)('创建', '学生', this.lastID, `${name} (${student_id})`, `学号: ${student_id}`,
            { id: user.id, name: user.username || name, role: user.role });
        } catch (logErr) {
          console.error('审计日志记录失败:', logErr);
        }
        
        res.status(201).json({ id: this.lastID, student_id, name });
      }
    );
  });
  
  app.put('/api/students/:id', authenticateToken(db), async (req, res) => {
    const user = req.user;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: '无权访问' });
    }
    
    const { name, department, class: className, teacher_id } = req.body;
    
    db.get('SELECT * FROM students WHERE id = ?', [req.params.id], async (err, oldData) => {
      if (err) return res.status(500).json({ error: '数据库错误' });
      if (!oldData) return res.status(404).json({ error: '学生不存在' });
      
      db.run(
        'UPDATE students SET name = ?, department = ?, class = ?, teacher_id = ? WHERE id = ?',
        [name, department, className, teacher_id, req.params.id],
        async function(err) {
          if (err) return res.status(500).json({ error: '数据库错误' });
          
          try {
            await logAudit(db)('修改', '学生', req.params.id, `${name} (${oldData.student_id})`, '更新学生信息',
              { id: user.id, name: user.username || name, role: user.role });
          } catch (logErr) {
            console.error('审计日志记录失败:', logErr);
          }
          
          res.json({ message: '更新成功' });
        }
      );
    });
  });
  
  app.delete('/api/students/:id', authenticateToken(db), async (req, res) => {
    const user = req.user;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: '无权访问' });
    }
    
    db.get('SELECT * FROM students WHERE id = ?', [req.params.id], async (err, student) => {
      if (err) return res.status(500).json({ error: '数据库错误' });
      if (!student) return res.status(404).json({ error: '学生不存在' });
      
      db.run('DELETE FROM students WHERE id = ?', [req.params.id], async function(err) {
        if (err) return res.status(500).json({ error: '数据库错误' });
        
        try {
          await logAudit(db)('删除', '学生', req.params.id, `${student.name} (${student.student_id})`, '删除学生',
            { id: user.id, name: user.username || student.name, role: user.role });
        } catch (logErr) {
          console.error('审计日志记录失败:', logErr);
        }
        
        res.json({ message: '删除成功' });
      });
    });
  });
  
  // 实习申请路由
  app.get('/api/internships', authenticateToken(db), (req, res) => {
    const user = req.user;
    
    let query = `SELECT i.*, s.student_id as student_no, s.name as student_name, s.class, s.department 
                 FROM internships i 
                 LEFT JOIN students s ON i.student_id = s.id`;
    
    if (user.role === 'teacher') {
      query += ` WHERE s.teacher_id = ?`;
      db.all(query, [user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: '数据库错误' });
        res.json(rows);
      });
    } else if (user.role === 'student') {
      db.get('SELECT id FROM students WHERE student_id = ?', [user.username], (err, student) => {
        if (err) return res.status(500).json({ error: '数据库错误' });
        if (!student) return res.json([]);
        
        db.all(query + ' WHERE i.student_id = ?', [student.id], (err, rows) => {
          if (err) return res.status(500).json({ error: '数据库错误' });
          res.json(rows);
        });
      });
    } else {
      db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: '数据库错误' });
        res.json(rows);
      });
    }
  });
  
  app.post('/api/internships', authenticateToken(db), async (req, res) => {
    const user = req.user;
    
    if (user.role === 'teacher') {
      return res.status(403).json({ error: '教师无权提交实习申请' });
    }
    
    const { student_id, company_name, start_date, end_date } = req.body;
    
    db.get('SELECT student_id, name FROM students WHERE id = ?', [student_id], (err, student) => {
      if (err) return res.status(500).json({ error: '数据库错误' });
      
      db.run(
        `INSERT INTO internships (student_id, company_name, start_date, end_date) VALUES (?, ?, ?, ?)`,
        [student_id, company_name, start_date, end_date],
        async function(err) {
          if (err) return res.status(500).json({ error: '数据库错误' });
          
          try {
            await logAudit(db)('提交', '实习申请', this.lastID, 
              student ? `${student.name} (${student.student_id})` : `学生ID: ${student_id}`,
              `实习单位: ${company_name}`,
              { id: user.id, name: user.username || (student ? student.name : '未知'), role: user.role });
          } catch (logErr) {
            console.error('审计日志记录失败:', logErr);
          }
          
          res.status(201).json({ id: this.lastID, message: '实习记录提交成功' });
        }
      );
    });
  });
  
  app.put('/api/internships/:id', authenticateToken(db), async (req, res) => {
    const user = req.user;
    const { status } = req.body;
    
    db.get('SELECT i.*, s.student_id, s.name as student_name, s.teacher_id FROM internships i LEFT JOIN students s ON i.student_id = s.id WHERE i.id = ?', [req.params.id], async (err, internship) => {
      if (err) return res.status(500).json({ error: '数据库错误' });
      if (!internship) return res.status(404).json({ error: '实习记录不存在' });
      
      // 权限检查
      if (user.role === 'teacher' && internship.teacher_id !== user.id) {
        return res.status(403).json({ error: '无权审核该实习申请' });
      }
      
      const oldStatus = internship.status;
      
      db.run('UPDATE internships SET status = ?, updated_at = ? WHERE id = ?', [status, new Date().toISOString(), req.params.id], async function(err) {
        if (err) return res.status(500).json({ error: '数据库错误' });
        
        if (oldStatus !== status) {
          try {
            await logAudit(db)('审核', '实习申请', req.params.id, 
              `${internship.student_name} (${internship.student_id}) - ${internship.company_name}`,
              `状态变更: ${oldStatus} → ${status}`,
              { id: user.id, name: user.username || internship.student_name, role: user.role });
          } catch (logErr) {
            console.error('审计日志记录失败:', logErr);
          }
        }
        
        res.json({ message: '更新成功' });
      });
    });
  });
  
  app.delete('/api/internships/:id', authenticateToken(db), async (req, res) => {
    const user = req.user;
    
    if (user.role === 'teacher') {
      return res.status(403).json({ error: '教师无权删除实习记录' });
    }
    
    db.get('SELECT i.*, s.student_id, s.name as student_name FROM internships i LEFT JOIN students s ON i.student_id = s.id WHERE i.id = ?', [req.params.id], async (err, internship) => {
      if (err) return res.status(500).json({ error: '数据库错误' });
      if (!internship) return res.status(404).json({ error: '实习记录不存在' });
      
      db.run('DELETE FROM internships WHERE id = ?', [req.params.id], async function(err) {
        if (err) return res.status(500).json({ error: '数据库错误' });
        
        try {
          await logAudit(db)('删除', '实习申请', req.params.id, 
            `${internship.student_name} (${internship.student_id}) - ${internship.company_name}`,
            `实习单位: ${internship.company_name}`,
            { id: user.id, name: user.username || internship.student_name, role: user.role });
        } catch (logErr) {
          console.error('审计日志记录失败:', logErr);
        }
        
        res.json({ message: '删除成功' });
      });
    });
  });
  
  // 审计日志路由
  app.get('/api/audit-logs', authenticateToken(db), (req, res) => {
    const user = req.user;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: '无权访问审计日志' });
    }
    
    const { action, entity_type, user_name, start_date, end_date, page = 1, pageSize = 20 } = req.query;
    
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    let params = [];
    
    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }
    if (entity_type) {
      query += ' AND entity_type = ?';
      params.push(entity_type);
    }
    if (user_name) {
      query += ' AND user_name LIKE ?';
      params.push(`%${user_name}%`);
    }
    if (start_date) {
      query += ' AND date(created_at) >= date(?)';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND date(created_at) <= date(?)';
      params.push(end_date);
    }
    
    query += ' ORDER BY created_at DESC';
    
    db.all(query, params, (err, logs) => {
      if (err) return res.status(500).json({ error: '数据库错误' });
      
      const total = logs.length;
      const totalPages = Math.ceil(total / pageSize);
      const offset = (page - 1) * pageSize;
      const paginatedLogs = logs.slice(offset, offset + parseInt(pageSize));
      
      res.json({
        logs: paginatedLogs,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages
      });
    });
  });
  
  return app;
};

module.exports = { createTestDb, createTestApp };
