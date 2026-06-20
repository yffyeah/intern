const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

db.all('SELECT teacher_id, name FROM teachers', (err, teachers) => {
  if (err) {
    console.error('查询教师失败:', err);
  } else {
    console.log('\n教师账号:');
    if (teachers.length === 0) {
      console.log('  (无数据)');
    } else {
      teachers.forEach(t => console.log(`  ${t.teacher_id} - ${t.name} (密码: 123456)`));
    }
  }
  
  db.all('SELECT student_id, name FROM students', (err, students) => {
    if (err) {
      console.error('查询学生失败:', err);
    } else {
      console.log('\n学生账号:');
      if (students.length === 0) {
        console.log('  (无数据)');
      } else {
        students.forEach(s => console.log(`  ${s.student_id} - ${s.name} (密码: 123456)`));
      }
    }
    
    db.close();
  });
});
