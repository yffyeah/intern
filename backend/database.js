const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      need_change_password INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      department TEXT,
      phone TEXT,
      email TEXT,
      password TEXT NOT NULL,
      need_change_password INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      enrollment_year INTEGER,
      department TEXT,
      class TEXT,
      course_name TEXT,
      course_code TEXT,
      credits TEXT,
      teacher_id INTEGER NOT NULL,
      password TEXT NOT NULL,
      need_change_password INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS internships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      internship_type TEXT,
      organization_form TEXT,
      internship_method TEXT,
      academic_year TEXT,
      company_name TEXT,
      company_code TEXT,
      region TEXT,
      address TEXT,
      has_insurance TEXT DEFAULT '0',
      has_accident_insurance TEXT DEFAULT '0',
      has_safety_training TEXT DEFAULT '0',
      has_agreement TEXT DEFAULT '0',
      company_source TEXT,
      has_emergency_plan TEXT DEFAULT '0',
      is_base TEXT DEFAULT '0',
      is_digital_base TEXT DEFAULT '0',
      is_overseas_base TEXT DEFAULT '0',
      start_date TEXT,
      end_date TEXT,
      actual_days INTEGER,
      position TEXT,
      salary INTEGER,
      supervisor_name TEXT,
      supervisor_phone TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id)
    )
  `);

  // 审计日志表
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

  // 为已有表添加 need_change_password 字段（兼容已有数据库）
  db.run(`ALTER TABLE teachers ADD COLUMN is_admin INTEGER DEFAULT 0`, (err) => {});
  db.run(`ALTER TABLE admins ADD COLUMN need_change_password INTEGER DEFAULT 1`, (err) => {});
  db.run(`ALTER TABLE teachers ADD COLUMN need_change_password INTEGER DEFAULT 1`, (err) => {});
  db.run(`ALTER TABLE students ADD COLUMN need_change_password INTEGER DEFAULT 1`, (err) => {});
});

module.exports = db;
