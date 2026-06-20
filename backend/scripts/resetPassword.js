const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

async function resetPasswords() {
  console.log('开始重置密码...');
  
  // 重置教师密码
  const teacherHash = await bcrypt.hash('123456', 10);
  db.run(
    'UPDATE teachers SET password = ?',
    [teacherHash],
    function(err) {
      if (err) {
        console.error('重置教师密码失败:', err);
      } else {
        console.log('教师密码重置成功！');
      }
    }
  );
  
  // 重置学生密码
  const studentHash = await bcrypt.hash('123456', 10);
  db.run(
    'UPDATE students SET password = ?',
    [studentHash],
    function(err) {
      if (err) {
        console.error('重置学生密码失败:', err);
      } else {
        console.log('学生密码重置成功！');
      }
    }
  );
  
  // 等待数据库操作完成
  setTimeout(() => {
    db.all('SELECT teacher_id, name FROM teachers LIMIT 5', (err, teachers) => {
      if (err) {
        console.error('查询教师失败:', err);
      } else {
        console.log('\n教师账号:');
        teachers.forEach(t => console.log(`  ${t.teacher_id} - ${t.name}`));
      }
    });
    
    db.all('SELECT student_id, name FROM students LIMIT 5', (err, students) => {
      if (err) {
        console.error('查询学生失败:', err);
      } else {
        console.log('\n学生账号:');
        students.forEach(s => console.log(`  ${s.student_id} - ${s.name}`));
        
        db.close();
        console.log('\n完成！所有账号密码已重置为: 123456');
      }
    });
  }, 1000);
}

resetPasswords();
