const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('./auditLogs');

const router = express.Router();

router.get('/export', authenticateToken, (req, res) => {
  const user = req.user;
  
  let query = `
    SELECT 
      s.student_id, s.name as student_name, s.enrollment_year, s.department, s.class,
      s.course_name, s.course_code, s.credits,
      t.name as teacher_name,
      i.internship_type, i.organization_form, i.internship_method, i.academic_year,
      i.company_name, i.company_code, i.region, i.address,
      i.has_insurance, i.has_accident_insurance, i.has_safety_training, i.has_agreement,
      i.company_source, i.has_emergency_plan, i.is_base, i.is_digital_base, i.is_overseas_base,
      i.start_date, i.end_date, i.actual_days, i.position, i.salary,
      i.supervisor_name, i.supervisor_phone, i.status
    FROM internships i 
    LEFT JOIN students s ON i.student_id = s.id
    LEFT JOIN teachers t ON s.teacher_id = t.id
  `;
  let params = [];
  let conditions = [];

  if (user.role === 'teacher') {
    conditions.push('s.teacher_id = ?');
    params.push(user.id);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY s.student_id, i.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Export error:', err);
      return res.status(500).json({ error: '数据库错误' });
    }
    res.json(rows);
  });
});

router.get('/', authenticateToken, (req, res) => {
  const user = req.user;
  const { status } = req.query;
  
  let query = `
    SELECT i.*, s.student_id as student_no, s.name as student_name, s.class, s.department 
    FROM internships i 
    LEFT JOIN students s ON i.student_id = s.id
  `;
  let params = [];
  let conditions = [];

  if (user.role === 'teacher') {
    conditions.push('s.teacher_id = ?');
    params.push(user.id);
  } else if (user.role === 'student') {
    db.get('SELECT id FROM students WHERE student_id = ?', [user.username], (err, student) => {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      if (!student) {
        return res.status(404).json({ error: '学生不存在' });
      }
      
      conditions.push('i.student_id = ?');
      params.push(student.id);
      
      if (status) {
        conditions.push('i.status = ?');
        params.push(status);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      db.all(query, params, (err, rows) => {
        if (err) {
          return res.status(500).json({ error: '数据库错误' });
        }
        res.json(rows);
      });
      return;
    });
    return;
  }

  if (status) {
    conditions.push('i.status = ?');
    params.push(status);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
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
      `SELECT i.*, s.student_id as student_no, s.name as student_name, s.class, s.department 
       FROM internships i 
       LEFT JOIN students s ON i.student_id = s.id
       WHERE i.id = ? AND s.teacher_id = ?`,
      [req.params.id, user.id],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: '数据库错误' });
        }
        if (!row) {
          return res.status(404).json({ error: '实习记录不存在或无权查看' });
        }
        res.json(row);
      }
    );
  } else if (user.role === 'student') {
    db.get('SELECT id FROM students WHERE student_id = ?', [user.username], (err, student) => {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      if (!student) {
        return res.status(404).json({ error: '学生不存在' });
      }
      
      db.get(
        `SELECT i.*, s.student_id as student_no, s.name as student_name, s.class, s.department 
         FROM internships i 
         LEFT JOIN students s ON i.student_id = s.id
         WHERE i.id = ? AND i.student_id = ?`,
        [req.params.id, student.id],
        (err, row) => {
          if (err) {
            return res.status(500).json({ error: '数据库错误' });
          }
          if (!row) {
            return res.status(404).json({ error: '实习记录不存在或无权查看' });
          }
          res.json(row);
        }
      );
    });
  } else {
    db.get(
      `SELECT i.*, s.student_id as student_no, s.name as student_name, s.class, s.department 
       FROM internships i 
       LEFT JOIN students s ON i.student_id = s.id
       WHERE i.id = ?`,
      [req.params.id],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: '数据库错误' });
        }
        if (!row) {
          return res.status(404).json({ error: '实习记录不存在' });
        }
        res.json(row);
      }
    );
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const user = req.user;
  
  if (user.role === 'teacher') {
    return res.status(403).json({ error: '教师无权提交实习申请' });
  }
  
  const {
    student_id, internship_type, organization_form, internship_method,
    academic_year, company_name, company_code, region, address,
    has_insurance, has_accident_insurance, has_safety_training, has_agreement,
    company_source, has_emergency_plan, is_base, is_digital_base, is_overseas_base,
    start_date, end_date, actual_days, position, salary, supervisor_name, supervisor_phone
  } = req.body;

  if (!student_id || !company_name) {
    return res.status(400).json({ error: '请提供学生ID和实习单位名称' });
  }

  // 获取学生信息用于日志
  db.get('SELECT student_id, name FROM students WHERE id = ?', [student_id], (err, student) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    
    db.run(
      `INSERT INTO internships (
        student_id, internship_type, organization_form, internship_method,
        academic_year, company_name, company_code, region, address,
        has_insurance, has_accident_insurance, has_safety_training, has_agreement,
        company_source, has_emergency_plan, is_base, is_digital_base, is_overseas_base,
        start_date, end_date, actual_days, position, salary, supervisor_name, supervisor_phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student_id, internship_type, organization_form, internship_method,
        academic_year, company_name, company_code, region, address,
        has_insurance, has_accident_insurance, has_safety_training, has_agreement,
        company_source, has_emergency_plan, is_base, is_digital_base, is_overseas_base,
        start_date, end_date, actual_days, position, salary, supervisor_name, supervisor_phone
      ],
      async function(err) {
        if (err) {
          return res.status(500).json({ error: '数据库错误' });
        }
        
        // 记录审计日志
        try {
          await logAudit(
            '提交',
            '实习申请',
            this.lastID,
            student ? `${student.name} (${student.student_id})` : `学生ID: ${student_id}`,
            `实习单位: ${company_name}, 时间: ${start_date} 至 ${end_date}`,
            user
          );
        } catch (logErr) {
          console.error('审计日志记录失败:', logErr);
        }
        
        res.status(201).json({ id: this.lastID, message: '实习记录提交成功' });
      }
    );
  });
});

router.put('/:id', authenticateToken, async (req, res) => {
  const user = req.user;
  
  // 管理员不能修改状态（审批）
  if (user.role === 'admin' && req.body.status) {
    return res.status(403).json({ error: '管理员无权审批实习申请，只能修改内容' });
  }
  
  if (user.role === 'teacher') {
    db.get('SELECT s.teacher_id FROM internships i JOIN students s ON i.student_id = s.id WHERE i.id = ?', [req.params.id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      if (!row || row.teacher_id !== user.id) {
        return res.status(403).json({ error: '无权审核该实习申请' });
      }
      updateInternship(req.params.id, req.body, res, user);
    });
  } else {
    updateInternship(req.params.id, req.body, res, user);
  }
});

async function updateInternship(id, data, res, auditUser) {
  const {
    internship_type, organization_form, internship_method,
    academic_year, company_name, company_code, region, address,
    has_insurance, has_accident_insurance, has_safety_training, has_agreement,
    company_source, has_emergency_plan, is_base, is_digital_base, is_overseas_base,
    start_date, end_date, actual_days, position, salary, supervisor_name, supervisor_phone,
    status
  } = data;

  // 获取原记录用于日志
  const oldRecord = await new Promise((resolve, reject) => {
    db.get(
      `SELECT i.*, s.student_id, s.name as student_name 
       FROM internships i 
       LEFT JOIN students s ON i.student_id = s.id 
       WHERE i.id = ?`,
      [id],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
  
  const oldStatus = oldRecord?.status;

  const updateData = {
    internship_type, organization_form, internship_method,
    academic_year, company_name, company_code, region, address,
    has_insurance, has_accident_insurance, has_safety_training, has_agreement,
    company_source, has_emergency_plan, is_base, is_digital_base, is_overseas_base,
    start_date, end_date, actual_days, position, salary, supervisor_name, supervisor_phone,
    status,
    updated_at: new Date().toISOString()
  };

  const setClause = Object.keys(updateData)
    .filter(k => updateData[k] !== undefined && updateData[k] !== null)
    .map(k => `${k} = ?`)
    .join(', ');
  
  const values = Object.keys(updateData)
    .filter(k => updateData[k] !== undefined && updateData[k] !== null)
    .map(k => updateData[k]);
  
  values.push(id);

  db.run(
    `UPDATE internships SET ${setClause} WHERE id = ?`,
    values,
    async function(err) {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: '实习记录不存在' });
      }
      
      // 记录审计日志
      if (auditUser) {
        try {
          // 状态变更（审核）
          if (oldStatus && status && oldStatus !== status) {
            await logAudit(
              '审核',
              '实习申请',
              id,
              oldRecord ? `${oldRecord.student_name} (${oldRecord.student_id}) - ${oldRecord.company_name}` : `实习申请ID: ${id}`,
              `状态变更: ${oldStatus} → ${status}，实习单位: ${company_name || oldRecord?.company_name || '-'}`,
              auditUser
            );
          } else if (auditUser.role === 'student') {
            // 学生修改实习申请内容
            const changes = [];
            if (company_name && company_name !== oldRecord?.company_name) changes.push(`实习单位: ${oldRecord?.company_name || '-'} → ${company_name}`);
            if (start_date && start_date !== oldRecord?.start_date) changes.push(`开始日期: ${oldRecord?.start_date || '-'} → ${start_date}`);
            if (end_date && end_date !== oldRecord?.end_date) changes.push(`结束日期: ${oldRecord?.end_date || '-'} → ${end_date}`);
            if (position && position !== oldRecord?.position) changes.push(`岗位: ${oldRecord?.position || '-'} → ${position}`);
            
            await logAudit(
              '修改',
              '实习申请',
              id,
              oldRecord ? `${oldRecord.student_name} (${oldRecord.student_id}) - ${oldRecord.company_name}` : `实习申请ID: ${id}`,
              changes.length > 0 ? `实习申请修改: ${changes.join('; ')}` : '实习申请内容修改',
              auditUser
            );
          }
        } catch (logErr) {
          console.error('审计日志记录失败:', logErr);
        }
      }
      
      res.json({ message: '更新成功' });
    }
  );
}

router.delete('/:id', authenticateToken, async (req, res) => {
  const user = req.user;
  
  if (user.role === 'teacher') {
    return res.status(403).json({ error: '教师无权删除实习记录' });
  }
  
  // 先获取实习申请信息
  db.get(
    `SELECT i.*, s.student_id, s.name as student_name 
     FROM internships i 
     LEFT JOIN students s ON i.student_id = s.id 
     WHERE i.id = ?`,
    [req.params.id],
    async (err, internship) => {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }
      if (!internship) {
        return res.status(404).json({ error: '实习记录不存在' });
      }
      
      db.run('DELETE FROM internships WHERE id = ?', [req.params.id], async function(err) {
        if (err) {
          return res.status(500).json({ error: '数据库错误' });
        }
        
        // 记录审计日志
        try {
          await logAudit(
            '删除',
            '实习申请',
            req.params.id,
            internship ? `${internship.student_name} (${internship.student_id}) - ${internship.company_name}` : `实习申请ID: ${req.params.id}`,
            `实习单位: ${internship?.company_name || '-'}`,
            user
          );
        } catch (logErr) {
          console.error('审计日志记录失败:', logErr);
        }
        
        res.json({ message: '删除成功' });
      });
    }
  );
});

module.exports = router;
