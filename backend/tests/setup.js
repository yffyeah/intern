const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// 创建测试数据库
const createTestDb = () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(':memory:');
    
    db.serialize(() => {
      // 创建管理员表
      db.run(`
        CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // 创建教师表
      db.run(`
        CREATE TABLE IF NOT EXISTS teachers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          teacher_id TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          department TEXT,
          phone TEXT,
          email TEXT,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // 创建学生表
      db.run(`
        CREATE TABLE IF NOT EXISTS students (
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
        )
      `);
      
      // 创建实习申请表
      db.run(`
        CREATE TABLE IF NOT EXISTS internships (
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
        )
      `);
      
      // 创建审计日志表
      db.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
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
        )
      `);
      
      // 插入测试数据
      const defaultPassword = bcrypt.hashSync('123456', 10);
      
      // 管理员
      db.run('INSERT INTO admins (username, password) VALUES (?, ?)', ['admin', defaultPassword]);
      
      // 教师
      db.run('INSERT INTO teachers (teacher_id, name, department, password) VALUES (?, ?, ?, ?)', 
        ['T001', '测试教师', '计算机系', defaultPassword]);
      
      // 学生
      db.run(`INSERT INTO students (student_id, name, department, class, teacher_id, password) 
              VALUES (?, ?, ?, ?, ?, ?)`, 
        ['S001', '测试学生', '计算机系', '2021级1班', 1, defaultPassword]);
      
      // 实习申请
      db.run(`INSERT INTO internships (student_id, company_name, status) VALUES (?, ?, ?)`, 
        [1, '测试公司', 'pending']);
    });
    
    resolve(db);
  });
};

// 清理测试数据库
const closeTestDb = (db) => {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

module.exports = { createTestDb, closeTestDb };
