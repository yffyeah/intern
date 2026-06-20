const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('./auditLogs');

const router = express.Router();

// 辅助函数：检查是否为管理员
const isAdmin = (req) => req.user.role === 'admin';

// 获取当前登录教师信息
router.get('/me', authenticateToken, (req, res) => {
  const user = req.user;
  
  if (user.role !== 'teacher') {
    return res.status(403).json({ error: '无权访问' });
  }
  
  db.get('SELECT id, teacher_id, name, department, phone, email FROM teachers WHERE id = ?', [user.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    if (!row) {
      return res.status(404).json({ error: '教师不存在' });
    }
    res.json(row);
  });
});

// 更新当前登录教师信息
router.put('/me', authenticateToken, async (req, res) => {
  const user = req.user;
  
  if (user.role !== 'teacher') {
    return res.status(403).json({ error: '无权访问' });
  }
  
  const { phone, email } = req.body;
  
  // 先获取原数据
  db.get('SELECT * FROM teachers WHERE id = ?', [user.id], async (err, oldData) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    if (!oldData) {
      return res.status(404).json({ error: '教师不存在' });
    }
    
    db.run(
      'UPDATE teachers SET phone = ?, email = ? WHERE id = ?',
      [phone, email, user.id],
      async function(err) {
        if (err) {
          return res.status(500).json({ error: '数据库错误' });
        }
        
        // 构建变更详情
        const changes = [];
        if (phone !== oldData.phone) changes.push(`电话: ${oldData.phone || '-'} → ${phone || '-'}`);
        if (email !== oldData.email) changes.push(`邮箱: ${oldData.email || '-'} → ${email || '-'}`);
        
        // 记录审计日志
        try {
          await logAudit(
            '修改',
            '教师',
            user.id,
            `${oldData.name} (${oldData.teacher_id})`,
            changes.length > 0 ? `个人信息修改: ${changes.join('; ')}` : '无变更',
            user
          );
        } catch (logErr) {
          console.error('审计日志记录失败:', logErr);
        }
        
        res.json({ message: '更新成功' });
      }
    );
  });
});

// 修改密码
router.put('/password', authenticateToken, async (req, res) => {
  const user = req.user;
  
  if (user.role !== 'teacher') {
    return res.status(403).json({ error: '无权访问' });
  }
  
  const { oldPassword, newPassword } = req.body;
  
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '请提供原密码和新密码' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码长度至少6位' });
  }
  
  // 获取教师信息
  db.get('SELECT * FROM teachers WHERE id = ?', [user.id], (err, teacher) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    if (!teacher) {
      return res.status(404).json({ error: '教师不存在' });
    }
    
    const passwordHash = Buffer.isBuffer(teacher.password) ? teacher.password.toString() : teacher.password;
    
    bcrypt.compare(oldPassword, passwordHash, async (err, result) => {
      if (err) {
        return res.status(500).json({ error: '密码验证错误' });
      }
      if (!result) {
        return res.status(400).json({ error: '原密码错误' });
      }
      
      bcrypt.hash(newPassword, 10, async (err, hash) => {
        if (err) {
          return res.status(500).json({ error: '密码加密错误' });
        }
        
        db.run('UPDATE teachers SET password = ? WHERE id = ?', [hash, user.id], async function(err) {
          if (err) {
            return res.status(500).json({ error: '数据库错误' });
          }
          
          // 记录审计日志
          try {
            await logAudit(
              '修改',
              '教师',
              user.id,
              `${teacher.name} (${teacher.teacher_id})`,
              '密码修改成功',
              user
            );
          } catch (logErr) {
            console.error('审计日志记录失败:', logErr);
          }
          
          res.json({ message: '密码修改成功' });
        });
      });
    });
  });
});

// 获取教师列表 - 教师只能看到自己，管理员可以看到全部
router.get('/', authenticateToken, (req, res) => {
  const user = req.user;
  
  if (user.role === 'teacher') {
    // 教师只能查看自己的信息
    db.get('SELECT id, teacher_id, name, department, phone, email, created_at, is_admin FROM teachers WHERE id = ?', [user.id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      if (!row) {
        return res.status(404).json({ error: '教师不存在' });
      }
      res.json([row]);
    });
  } else {
    // 管理员可以查看所有教师
    db.all('SELECT id, teacher_id, name, department, phone, email, created_at, is_admin FROM teachers', (err, rows) => {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      res.json(rows);
    });
  }
});

router.get('/:id', authenticateToken, (req, res) => {
  const user = req.user;
  const teacherId = req.params.id;
  
  // 教师只能查看自己的信息
  if (user.role === 'teacher' && user.id !== parseInt(teacherId)) {
    return res.status(403).json({ error: '无权查看其他教师信息' });
  }
  
  db.get('SELECT id, teacher_id, name, department, phone, email, created_at FROM teachers WHERE id = ?', [teacherId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    if (!row) {
      return res.status(404).json({ error: '教师不存在' });
    }
    res.json(row);
  });
});

// 创建教师 - 只允许管理员
router.post('/', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: '无权创建教师' });
  }
  
  const { teacher_id, name, department, phone, email, password } = req.body;

  if (!teacher_id || !name || !password) {
    return res.status(400).json({ error: '请提供教师ID、姓名和密码' });
  }

  bcrypt.hash(password, 10, async (err, hash) => {
    if (err) {
      return res.status(500).json({ error: '密码加密错误' });
    }

    db.run(
      'INSERT INTO teachers (teacher_id, name, department, phone, email, password) VALUES (?, ?, ?, ?, ?, ?)',
      [teacher_id, name, department, phone, email, hash],
      async function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: '教师ID已存在' });
          }
          return res.status(500).json({ error: '数据库错误' });
        }
        
        // 记录审计日志
        try {
          await logAudit(
            '创建',
            '教师',
            this.lastID,
            `${name} (${teacher_id})`,
            `工号: ${teacher_id}, 部门: ${department || '-'}, 电话: ${phone || '-'}, 邮箱: ${email || '-'}`,
            req.user
          );
        } catch (logErr) {
          console.error('审计日志记录失败:', logErr);
        }
        
        res.status(201).json({ id: this.lastID, teacher_id, name });
      }
    );
  });
});

// 更新教师信息 - 教师只能修改自己，管理员可以修改所有人
router.put('/:id', authenticateToken, async (req, res) => {
  const user = req.user;
  const teacherId = req.params.id;
  
  // 教师只能修改自己的信息
  if (user.role === 'teacher' && user.id !== parseInt(teacherId)) {
    return res.status(403).json({ error: '无权修改其他教师信息' });
  }
  
  const { name, department, phone, email, password } = req.body;

  // 先获取原数据
  db.get('SELECT * FROM teachers WHERE id = ?', [teacherId], async (err, oldData) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    if (!oldData) {
      return res.status(404).json({ error: '教师不存在' });
    }

    if (password) {
      bcrypt.hash(password, 10, async (err, hash) => {
        if (err) {
          return res.status(500).json({ error: '密码加密错误' });
        }
        await updateTeacher(teacherId, { name, department, phone, email, password: hash }, res, req.user, oldData);
      });
    } else {
      await updateTeacher(teacherId, { name, department, phone, email }, res, req.user, oldData);
    }
  });
});

async function updateTeacher(id, data, res, user, oldData) {
  const setClause = Object.keys(data)
    .filter(k => data[k] !== undefined)
    .map(k => `${k} = ?`)
    .join(', ');
  
  const values = Object.keys(data)
    .filter(k => data[k] !== undefined)
    .map(k => data[k]);
  
  values.push(id);

  db.run(
    `UPDATE teachers SET ${setClause} WHERE id = ?`,
    values,
    async function(err) {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: '教师不存在' });
      }
      
      // 构建变更详情
      const changes = [];
      if (data.name && data.name !== oldData.name) changes.push(`姓名: ${oldData.name} → ${data.name}`);
      if (data.department && data.department !== oldData.department) changes.push(`部门: ${oldData.department || '-'} → ${data.department}`);
      if (data.phone && data.phone !== oldData.phone) changes.push(`电话: ${oldData.phone || '-'} → ${data.phone}`);
      if (data.email && data.email !== oldData.email) changes.push(`邮箱: ${oldData.email || '-'} → ${data.email}`);
      if (data.password) changes.push('密码: 已修改');
      
      // 记录审计日志
      try {
        await logAudit(
          '修改',
          '教师',
          id,
          `${oldData.name} (${oldData.teacher_id})`,
          changes.length > 0 ? changes.join('; ') : '无变更',
          user
        );
      } catch (logErr) {
        console.error('审计日志记录失败:', logErr);
      }
      
      res.json({ message: '更新成功' });
    }
  );
}

// 删除教师 - 只允许管理员
router.delete('/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: '无权删除教师' });
  }
  
  const teacherId = parseInt(req.params.id);
  
  // 不能删除自己
  if (teacherId === req.user.id) {
    return res.status(400).json({ error: '不能删除自己' });
  }
  
  // 先获取教师信息
  db.get('SELECT * FROM teachers WHERE id = ?', [teacherId], async (err, teacher) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    if (!teacher) {
      return res.status(404).json({ error: '教师不存在' });
    }
    
    db.run('DELETE FROM teachers WHERE id = ?', [teacherId], async function(err) {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      
      // 记录审计日志
      try {
        await logAudit(
          '删除',
          '教师',
          teacherId,
          `${teacher.name} (${teacher.teacher_id})`,
          `工号: ${teacher.teacher_id}, 部门: ${teacher.department || '-'}`,
          req.user
        );
      } catch (logErr) {
        console.error('审计日志记录失败:', logErr);
      }
      
      res.json({ message: '删除成功' });
    });
  });
});

// 设置/取消管理员身份 - 只允许管理员
router.put('/:id/admin', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: '无权修改管理员身份' });
  }
  
  const user = req.user;
  const teacherId = parseInt(req.params.id);
  const { is_admin } = req.body;
  
  // 不能操作自己
  if (teacherId === user.id) {
    return res.status(400).json({ error: '不能修改自己的管理员身份' });
  }
  
  // 如果是取消管理员身份，检查是否只剩最后一个管理员
  if (is_admin === 0) {
    db.get('SELECT COUNT(*) as count FROM teachers WHERE is_admin = 1', [], (err, result) => {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      if (result.count <= 1) {
        return res.status(400).json({ error: '系统中必须保留至少一个管理员' });
      }
      
      updateAdminStatus(teacherId, is_admin, req.user, res);
    });
  } else {
    updateAdminStatus(teacherId, is_admin, req.user, res);
  }
});

async function updateAdminStatus(teacherId, is_admin, user, res) {
  db.get('SELECT * FROM teachers WHERE id = ?', [teacherId], async (err, teacher) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    if (!teacher) {
      return res.status(404).json({ error: '教师不存在' });
    }
    
    db.run('UPDATE teachers SET is_admin = ? WHERE id = ?', [is_admin ? 1 : 0, teacherId], async function(err) {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      
      // 记录审计日志
      try {
        await logAudit(
          '修改',
          '教师',
          teacherId,
          `${teacher.name} (${teacher.teacher_id})`,
          `管理员身份: ${teacher.is_admin ? '是' : '否'} → ${is_admin ? '是' : '否'}`,
          user
        );
      } catch (logErr) {
        console.error('审计日志记录失败:', logErr);
      }
      
      res.json({ message: '管理员身份已更新' });
    });
  });
}

module.exports = router;
