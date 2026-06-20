const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('./auditLogs');

const router = express.Router();

// 获取当前登录学生信息
router.get('/me', authenticateToken, (req, res) => {
  const user = req.user;
  
  if (user.role !== 'student') {
    return res.status(403).json({ error: '无权访问' });
  }
  
  db.get('SELECT id, student_id, name, department, class, phone, email FROM students WHERE student_id = ?', [user.username], (err, row) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    if (!row) {
      return res.status(404).json({ error: '学生不存在' });
    }
    res.json(row);
  });
});

// 更新当前登录学生信息
router.put('/me', authenticateToken, async (req, res) => {
  const user = req.user;
  
  if (user.role !== 'student') {
    return res.status(403).json({ error: '无权访问' });
  }
  
  const { phone, email } = req.body;
  
  // 先获取原数据
  db.get('SELECT * FROM students WHERE student_id = ?', [user.username], async (err, oldData) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    if (!oldData) {
      return res.status(404).json({ error: '学生不存在' });
    }
    
    db.run(
      'UPDATE students SET phone = ?, email = ? WHERE student_id = ?',
      [phone, email, user.username],
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
            '学生',
            oldData.id,
            `${oldData.name} (${oldData.student_id})`,
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
  
  if (user.role !== 'student') {
    return res.status(403).json({ error: '无权访问' });
  }
  
  const { oldPassword, newPassword } = req.body;
  
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '请提供原密码和新密码' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码长度至少6位' });
  }
  
  // 获取学生信息
  db.get('SELECT * FROM students WHERE student_id = ?', [user.username], (err, student) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    if (!student) {
      return res.status(404).json({ error: '学生不存在' });
    }
    
    const passwordHash = Buffer.isBuffer(student.password) ? student.password.toString() : student.password;
    
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
        
        db.run('UPDATE students SET password = ? WHERE student_id = ?', [hash, user.username], async function(err) {
          if (err) {
            return res.status(500).json({ error: '数据库错误' });
          }
          
          // 记录审计日志
          try {
            await logAudit(
              '修改',
              '学生',
              student.id,
              `${student.name} (${student.student_id})`,
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

router.get('/', authenticateToken, (req, res) => {
  const user = req.user;
  let query = 'SELECT s.*, t.name as teacher_name FROM students s LEFT JOIN teachers t ON s.teacher_id = t.id';
  let params = [];

  if (user.role === 'teacher') {
    query += ' WHERE s.teacher_id = ?';
    params.push(user.id);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    res.json(rows);
  });
});

router.get('/:id', authenticateToken, (req, res) => {
  const user = req.user;
  
  if (user.role === 'teacher') {
    db.get(
      'SELECT s.*, t.name as teacher_name FROM students s LEFT JOIN teachers t ON s.teacher_id = t.id WHERE s.id = ? AND s.teacher_id = ?',
      [req.params.id, user.id],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: '数据库错误' });
        }
        if (!row) {
          return res.status(404).json({ error: '学生不存在或无权查看' });
        }
        res.json(row);
      }
    );
  } else {
    db.get(
      'SELECT s.*, t.name as teacher_name FROM students s LEFT JOIN teachers t ON s.teacher_id = t.id WHERE s.id = ?',
      [req.params.id],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: '数据库错误' });
        }
        if (!row) {
          return res.status(404).json({ error: '学生不存在' });
        }
        res.json(row);
      }
    );
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const user = req.user;
  
  if (user.role !== 'admin') {
    return res.status(403).json({ error: '无权创建学生' });
  }
  
  const { student_id, name, enrollment_year, department, class: className, course_name, course_code, credits, teacher_id } = req.body;

  if (!student_id || !name) {
    return res.status(400).json({ error: '请提供学生ID和姓名' });
  }

  if (!teacher_id) {
    return res.status(400).json({ error: '每个学生必须指定指导老师' });
  }

  const studentPassword = bcrypt.hashSync('123456', 10);

  db.run(
    'INSERT INTO students (student_id, name, enrollment_year, department, class, course_name, course_code, credits, teacher_id, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [student_id, name, enrollment_year, department, className, course_name, course_code, credits, teacher_id, studentPassword],
    async function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: '学生ID已存在' });
        }
        return res.status(500).json({ error: '数据库错误' });
      }
      
      // 记录审计日志
      try {
        await logAudit(
          '创建',
          '学生',
          this.lastID,
          `${name} (${student_id})`,
          `学号: ${student_id}, 班级: ${className || '-'}, 指导老师ID: ${teacher_id}`,
          user
        );
      } catch (logErr) {
        console.error('审计日志记录失败:', logErr);
      }
      
      res.status(201).json({ id: this.lastID, student_id, name });
    }
  );
});

// 批量导入学生
router.post('/batch', authenticateToken, async (req, res) => {
  const user = req.user;
  
  if (user.role !== 'admin') {
    return res.status(403).json({ error: '无权批量导入学生' });
  }
  
  const { students } = req.body;

  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: '请提供学生数据数组' });
  }

  const studentPassword = bcrypt.hashSync('123456', 10);
  let inserted = 0;
  let skipped = 0;
  let errors = [];

  // 先获取所有有效的教师工号
  db.all('SELECT teacher_id FROM teachers', async (err, teachers) => {
    if (err) {
      return res.status(500).json({ error: '获取教师列表失败' });
    }

    const validTeacherIds = new Set(teachers.map(t => t.teacher_id));

    const stmt = db.prepare(
      'INSERT INTO students (student_id, name, enrollment_year, department, class, course_name, course_code, credits, teacher_id, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    const insertStudent = (student, callback) => {
      const { student_id, name, enrollment_year, department, class: className, course_name, course_code, credits, teacher_id } = student;
      
      // 验证学号
      if (!student_id || !student_id.toString().trim()) {
        errors.push({ row: students.indexOf(student) + 1, student_id: '未知', error: '学号为空' });
        callback();
        return;
      }

      // 验证姓名
      if (!name || !name.toString().trim()) {
        errors.push({ row: students.indexOf(student) + 1, student_id, error: '姓名为空' });
        callback();
        return;
      }

      // 验证指导老师
      if (!teacher_id || !teacher_id.toString().trim()) {
        errors.push({ row: students.indexOf(student) + 1, student_id, error: '指导老师为空' });
        callback();
        return;
      }

      // 验证指导老师是否存在
      if (!validTeacherIds.has(teacher_id)) {
        errors.push({ row: students.indexOf(student) + 1, student_id, name, error: `指导老师 "${teacher_id}" 不存在` });
        callback();
        return;
      }

      stmt.run(
        [student_id.toString().trim(), name.toString().trim(), enrollment_year || '', department || '', className || '', course_name || '', course_code || '', credits || '', teacher_id, studentPassword],
        async function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              skipped++;
            } else {
              errors.push({ row: students.indexOf(student) + 1, student_id, error: err.message });
            }
          } else {
            inserted++;
          }
          callback();
        }
      );
    };

    const processStudents = async (index) => {
      if (index >= students.length) {
        stmt.finalize();
        
        let message;
        let status = 200;
        
        if (inserted === 0 && skipped === 0) {
          // 全部失败
          status = 400;
          message = `导入失败！所有 ${students.length} 条数据都存在错误。\n\n错误详情：\n`;
          message += errors.slice(0, 10).map(e => 
            `第${e.row}行 [${e.student_id || '未知'}] ${e.error}`
          ).join('\n');
          if (errors.length > 10) {
            message += `\n...还有 ${errors.length - 10} 条错误`;
          }
        } else if (inserted === 0 && skipped > 0) {
          // 没有成功，只有重复
          status = 400;
          message = `导入失败！所有 ${students.length} 条数据的学号都已存在，无法导入。`;
        } else {
          // 部分成功或全部成功
          message = `导入完成！共 ${students.length} 条数据，成功导入 ${inserted} 条`;
          if (skipped > 0) {
            message += `，跳过 ${skipped} 条（已存在的学号）`;
          }
          if (errors.length > 0) {
            message += `\n\n错误详情：\n`;
            message += errors.slice(0, 10).map(e => 
              `第${e.row}行 [${e.student_id || '未知'}] ${e.error}`
            ).join('\n');
            if (errors.length > 10) {
              message += `\n...还有 ${errors.length - 10} 条错误`;
            }
          }
        }
        
        res.status(status).json({
          success: inserted > 0,
          message,
          total: students.length,
          inserted,
          skipped,
          errors: errors.length > 0 ? errors : undefined
        });
        
        // 记录批量导入审计日志
        if (inserted > 0) {
          try {
            await logAudit(
              '批量导入',
              '学生',
              null,
              `批量导入 ${inserted} 名学生`,
              `共 ${students.length} 条数据，成功导入 ${inserted} 条，跳过 ${skipped} 条`,
              user
            );
          } catch (logErr) {
            console.error('审计日志记录失败:', logErr);
          }
        }
        
        return;
      }
      insertStudent(students[index], () => processStudents(index + 1));
    };

    processStudents(0);
  });
});

router.put('/:id', authenticateToken, (req, res) => {
  const user = req.user;
  const studentId = req.params.id;
  
  if (user.role === 'teacher') {
    db.get('SELECT teacher_id FROM students WHERE id = ?', [studentId], (err, row) => {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      if (!row || row.teacher_id !== user.id) {
        return res.status(403).json({ error: '无权修改该学生信息' });
      }
      updateStudent(studentId, req.body, res);
    });
  } else {
    updateStudent(studentId, req.body, res);
  }
});

function updateStudent(id, data, res) {
  const { name, enrollment_year, department, class: className, course_name, course_code, credits, teacher_id } = data;
  
  const setClause = [];
  const values = [];
  
  if (name !== undefined) { setClause.push('name = ?'); values.push(name); }
  if (enrollment_year !== undefined) { setClause.push('enrollment_year = ?'); values.push(enrollment_year); }
  if (department !== undefined) { setClause.push('department = ?'); values.push(department); }
  if (className !== undefined) { setClause.push('class = ?'); values.push(className); }
  if (course_name !== undefined) { setClause.push('course_name = ?'); values.push(course_name); }
  if (course_code !== undefined) { setClause.push('course_code = ?'); values.push(course_code); }
  if (credits !== undefined) { setClause.push('credits = ?'); values.push(credits); }
  if (teacher_id !== undefined) { setClause.push('teacher_id = ?'); values.push(teacher_id); }
  
  if (setClause.length === 0) {
    return res.status(400).json({ error: '没有提供更新字段' });
  }
  
  values.push(id);

  db.run(
    `UPDATE students SET ${setClause.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: '学生不存在' });
      }
      res.json({ message: '更新成功' });
    }
  );
}

router.delete('/:id', authenticateToken, async (req, res) => {
  const user = req.user;
  
  if (user.role !== 'admin') {
    return res.status(403).json({ error: '无权删除学生' });
  }
  
  // 先获取学生信息
  db.get('SELECT * FROM students WHERE id = ?', [req.params.id], async (err, student) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    if (!student) {
      return res.status(404).json({ error: '学生不存在' });
    }
    
    db.run('DELETE FROM students WHERE id = ?', [req.params.id], async function(err) {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      
      // 记录审计日志
      try {
        await logAudit(
          '删除',
          '学生',
          req.params.id,
          `${student.name} (${student.student_id})`,
          `学号: ${student.student_id}, 班级: ${student.class || '-'}`,
          user
        );
      } catch (logErr) {
        console.error('审计日志记录失败:', logErr);
      }
      
      res.json({ message: '删除成功' });
    });
  });
});

module.exports = router;
