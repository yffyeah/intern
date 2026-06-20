const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '请提供用户名和密码' });
  }

  // 优先尝试教师表（教师可能具有管理员身份）
  db.get(`SELECT * FROM teachers WHERE teacher_id = ?`, [username], (err, teacher) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }

    if (teacher) {
      const passwordHash = Buffer.isBuffer(teacher.password) ? teacher.password.toString() : teacher.password;
      bcrypt.compare(password, passwordHash, (err, result) => {
        if (err) {
          return res.status(500).json({ error: '验证错误' });
        }

        if (!result) {
          return res.status(401).json({ error: '密码错误' });
        }

        // 判断是否有管理员身份
        const effectiveRole = teacher.is_admin === 1 ? 'admin' : 'teacher';
        
        const token = jwt.sign(
          { id: teacher.id, username: teacher.teacher_id, name: teacher.name, role: effectiveRole },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.json({
          token,
          user: {
            id: teacher.id,
            username: teacher.teacher_id,
            name: teacher.name,
            role: effectiveRole,
            department: teacher.department,
            is_admin: teacher.is_admin === 1,
            need_change_password: teacher.need_change_password === 1
          }
        });
      });
      return;
    }

    // 尝试学生表
    db.get(`SELECT * FROM students WHERE student_id = ?`, [username], (err, student) => {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }

      if (student) {
        const passwordHash = Buffer.isBuffer(student.password) ? student.password.toString() : student.password;
        bcrypt.compare(password, passwordHash, (err, result) => {
          if (err) {
            return res.status(500).json({ error: '验证错误' });
          }

          if (!result) {
            return res.status(401).json({ error: '密码错误' });
          }

          const token = jwt.sign(
            { id: student.id, username: student.student_id, name: student.name, role: 'student' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
          );

          res.json({
            token,
            user: {
              id: student.id,
              username: student.student_id,
              name: student.name,
              role: 'student',
              department: student.department,
              class: student.class,
              need_change_password: student.need_change_password === 1
            }
          });
        });
        return;
      }

      // 尝试管理员表（兼容旧账号）
      db.get(`SELECT * FROM admins WHERE admin_id = ?`, [username], (err, admin) => {
        if (err) {
          return res.status(500).json({ error: '数据库错误' });
        }

        if (admin) {
          const passwordHash = Buffer.isBuffer(admin.password) ? admin.password.toString() : admin.password;
          bcrypt.compare(password, passwordHash, (err, result) => {
            if (err) {
              return res.status(500).json({ error: '验证错误' });
            }

            if (!result) {
              return res.status(401).json({ error: '密码错误' });
            }

            const token = jwt.sign(
              { id: admin.id, username: admin.admin_id, name: admin.name, role: 'admin' },
              process.env.JWT_SECRET,
              { expiresIn: '24h' }
            );

            res.json({
              token,
              user: {
                id: admin.id,
                username: admin.admin_id,
                name: admin.name,
                role: 'admin',
                need_change_password: admin.need_change_password === 1
              }
            });
          });
          return;
        }

        return res.status(401).json({ error: '用户不存在' });
      });
    });
  });
});

// 修改密码
router.put('/change-password', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: '未提供认证信息' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '无效的认证信息' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: '认证信息无效或已过期' });
  }

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '请提供旧密码和新密码' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码长度不能少于6位' });
  }

  const { id, role } = decoded;
  
  // 优先从 teachers 表查询（因为教师可能是管理员身份）
  db.get(`SELECT * FROM teachers WHERE id = ?`, [id], (err, teacher) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    
    if (teacher) {
      const passwordHash = Buffer.isBuffer(teacher.password) ? teacher.password.toString() : teacher.password;
      bcrypt.compare(oldPassword, passwordHash, (err, result) => {
        if (err) {
          return res.status(500).json({ error: '验证错误' });
        }
        if (!result) {
          return res.status(401).json({ error: '旧密码错误' });
        }

        const newHash = bcrypt.hashSync(newPassword, 10);
        db.run(
          `UPDATE teachers SET password = ?, need_change_password = 0 WHERE id = ?`,
          [newHash, id],
          function(err) {
            if (err) {
              return res.status(500).json({ error: '修改密码失败' });
            }
            res.json({ message: '密码修改成功' });
          }
        );
      });
      return;
    }
    
    // 尝试学生表
    db.get(`SELECT * FROM students WHERE id = ?`, [id], (err, student) => {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      if (!student) {
        return res.status(404).json({ error: '用户不存在' });
      }

      const passwordHash = Buffer.isBuffer(student.password) ? student.password.toString() : student.password;
      bcrypt.compare(oldPassword, passwordHash, (err, result) => {
        if (err) {
          return res.status(500).json({ error: '验证错误' });
        }
        if (!result) {
          return res.status(401).json({ error: '旧密码错误' });
        }

        const newHash = bcrypt.hashSync(newPassword, 10);
        db.run(
          `UPDATE students SET password = ?, need_change_password = 0 WHERE id = ?`,
          [newHash, id],
          function(err) {
            if (err) {
              return res.status(500).json({ error: '修改密码失败' });
            }
            res.json({ message: '密码修改成功' });
          }
        );
      });
    });
  });
});

module.exports = router;
