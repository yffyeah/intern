const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

async function importData() {
  console.log('开始导入数据...');

  const adminPassword = await bcrypt.hash('123456', 10);
  db.run(
    'INSERT OR IGNORE INTO admins (admin_id, name, password) VALUES (?, ?, ?)',
    ['admin', '系统管理员', adminPassword],
    (err) => {
      if (err) console.error('导入管理员失败:', err);
      else console.log('管理员导入成功');
    }
  );

  const teachers = [
    { teacher_id: 'T001', name: '张茹', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T002', name: '张黎', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T003', name: '蔡亮', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T004', name: '赵淑晶', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T005', name: '张君毅', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T006', name: '庞艳杰', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T007', name: '高岩', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T008', name: '结硕', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T009', name: '黄俊莲', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T010', name: '冯花平', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T011', name: '方红琴', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T012', name: '段雪丽', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T013', name: '赵雪莹', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T014', name: '侍效', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T015', name: '程者军', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T016', name: '袁芳芳', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T017', name: '王秀红', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T018', name: '芮艳芳', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T019', name: '杨韵展', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T020', name: '刘芳', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T021', name: '曹艳丽', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T022', name: '陈龙缤', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T023', name: '李忻雁', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T024', name: '张传伟', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T025', name: '李玉雯', department: '信息工程学院', phone: '', email: '' },
    { teacher_id: 'T026', name: '邢俊英', department: '信息工程学院', phone: '', email: '' },
  ];

  const teacherPassword = await bcrypt.hash('123456', 10);
  teachers.forEach((teacher, index) => {
    db.run(
      'INSERT OR IGNORE INTO teachers (teacher_id, name, department, phone, email, password) VALUES (?, ?, ?, ?, ?, ?)',
      [teacher.teacher_id, teacher.name, teacher.department, teacher.phone, teacher.email, teacherPassword],
      (err) => {
        if (err) console.error('导入教师失败:', err);
        else if (index === teachers.length - 1) console.log('教师数据导入完成');
      }
    );
  });

  const students = [
    { student_id: '240206139', name: '谭文启', enrollment_year: 2024, department: '信息工程学院', class: '电信24-1班', course_name: '社会实践', course_code: 'XX050102', credits: '1（1.0）', teacher_id: 2 },
    { student_id: '250102121', name: '柯振杰', enrollment_year: 2025, department: '信息工程学院', class: '计科25-1班', course_name: '统计分析', course_code: 'XX010106', credits: '2（0.5）', teacher_id: 1 },
    { student_id: '250206101', name: '刘嘉文', enrollment_year: 2025, department: '信息工程学院', class: '电信25-1班', course_name: '社会实践', course_code: 'XX050102', credits: '1（1.0）', teacher_id: 2 },
    { student_id: '250206102', name: '尹铁晰', enrollment_year: 2025, department: '信息工程学院', class: '电信25-1班', course_name: '社会实践', course_code: 'XX050102', credits: '1（1.0）', teacher_id: 2 },
    { student_id: '250206104', name: '袁锦坤', enrollment_year: 2025, department: '信息工程学院', class: '电信25-1班', course_name: '社会实践', course_code: 'XX050102', credits: '1（1.0）', teacher_id: 2 },
    { student_id: '250206131', name: '霍冠泽', enrollment_year: 2025, department: '信息工程学院', class: '电信25-1班', course_name: '社会实践', course_code: 'XX050102', credits: '1（1.0）', teacher_id: 2 },
    { student_id: '250206201', name: '安特一', enrollment_year: 2025, department: '信息工程学院', class: '电信25-2班', course_name: '社会实践', course_code: 'XX050102', credits: '1（1.0）', teacher_id: 3 },
    { student_id: '250206202', name: '吕晨曦', enrollment_year: 2025, department: '信息工程学院', class: '电信25-2班', course_name: '社会实践', course_code: 'XX050102', credits: '1（1.0）', teacher_id: 3 },
    { student_id: '250206218', name: '陈泓达', enrollment_year: 2025, department: '信息工程学院', class: '电信25-2班', course_name: '社会实践', course_code: 'XX050102', credits: '1（1.0）', teacher_id: 3 },
    { student_id: '250201101', name: '薛天任', enrollment_year: 2025, department: '信息工程学院', class: '计科25-1班', course_name: '统计分析', course_code: 'XX010106', credits: '2（0.5）', teacher_id: 1 },
    { student_id: '250201102', name: '袁子诚', enrollment_year: 2025, department: '信息工程学院', class: '计科25-1班', course_name: '统计分析', course_code: 'XX010106', credits: '2（0.5）', teacher_id: 1 },
    { student_id: '250201201', name: '朱东润', enrollment_year: 2025, department: '信息工程学院', class: '计科25-2班', course_name: '统计分析', course_code: 'XX010106', credits: '2（0.5）', teacher_id: 10 },
    { student_id: '250201202', name: '昝歌', enrollment_year: 2025, department: '信息工程学院', class: '计科25-2班', course_name: '统计分析', course_code: 'XX010106', credits: '2（0.5）', teacher_id: 10 },
    { student_id: '250201213', name: '汤昕岩', enrollment_year: 2025, department: '信息工程学院', class: '计科25-2班', course_name: '统计分析', course_code: 'XX010106', credits: '2（0.5）', teacher_id: 10 },
  ];

  const studentPassword = await bcrypt.hash('123456', 10);
  students.forEach((student, index) => {
    db.run(
      'INSERT OR IGNORE INTO students (student_id, name, enrollment_year, department, class, course_name, course_code, credits, teacher_id, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [student.student_id, student.name, student.enrollment_year, student.department, student.class, student.course_name, student.course_code, student.credits, student.teacher_id, studentPassword],
      (err) => {
        if (err) console.error('导入学生失败:', err);
        else if (index === students.length - 1) console.log('学生数据导入完成');
      }
    );
  });

  const internships = [
    { student_id: 1, internship_type: '认识实习', organization_form: '集中实习', internship_method: '现场实习', academic_year: '2025-2026学年', company_name: '北京工业大学耿丹学院', company_code: '52110000777652278Q', region: '北京市顺义区-110113', address: '北京市顺义区牛栏山镇牛富路牛山段3号', has_insurance: '是', company_source: '学校组织联系', start_date: '6.29', end_date: '7.17', actual_days: 20, position: '"重走长征路"主题社会实践活动', salary: 0, supervisor_name: '张传伟', supervisor_phone: '13426298668', status: 'approved' },
    { student_id: 9, internship_type: '认识实习', organization_form: '分散实习', internship_method: '现场实习', academic_year: '2025-2026学年', company_name: '翰科智能制造苏州有限公司', company_code: '91320594MA2605GR2W', region: '江苏省苏州市工业园区-320571', address: '苏州市工业园区春晖路11号2号楼', has_insurance: '', company_source: '学生自行联系', start_date: '2026-07-10', end_date: '2026-08-10', actual_days: 31, position: '技术员', salary: 0, supervisor_name: '', supervisor_phone: '', status: 'pending' },
    { student_id: 12, internship_type: '认识实习', organization_form: '分散实习', internship_method: '现场实习', academic_year: '2025-2026学年', company_name: '智润利合（北京）科技有限公司', company_code: '91110000587742272B', region: '北京市海淀区-110108', address: '北京市海淀区大钟寺 13 号院', has_insurance: '', company_source: '学生自行联系', start_date: '2026-07-01', end_date: '2026-08-31', actual_days: 60, position: '实习工程师', salary: 0, supervisor_name: '司恩', supervisor_phone: '15801563000', status: 'pending' },
    { student_id: 13, internship_type: '认识实习', organization_form: '分散实习', internship_method: '现场实习', academic_year: '2025-2026学年', company_name: '博创网联（北京）网络技术有限公司', company_code: '91110112MA01K8105P', region: '北京市朝阳区-110105', address: '北京市朝阳区望京融科望京中心 B 座 2022A', has_insurance: '', company_source: '', start_date: '', end_date: '', actual_days: 0, position: '工程部经理助理', salary: 0, supervisor_name: '', supervisor_phone: '', status: 'pending' },
  ];

  internships.forEach((internship, index) => {
    db.run(
      `INSERT OR IGNORE INTO internships (
        student_id, internship_type, organization_form, internship_method,
        academic_year, company_name, company_code, region, address,
        has_insurance, has_accident_insurance, has_safety_training, has_agreement,
        company_source, has_emergency_plan, is_base, is_digital_base, is_overseas_base,
        start_date, end_date, actual_days, position, salary, supervisor_name, supervisor_phone, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        internship.student_id, internship.internship_type, internship.organization_form, internship.internship_method,
        internship.academic_year, internship.company_name, internship.company_code, internship.region, internship.address,
        internship.has_insurance || '', internship.has_accident_insurance || '', internship.has_safety_training || '', internship.has_agreement || '',
        internship.company_source || '', internship.has_emergency_plan || '', internship.is_base || '', internship.is_digital_base || '', internship.is_overseas_base || '',
        internship.start_date || '', internship.end_date || '', internship.actual_days || 0, internship.position || '', internship.salary || 0, internship.supervisor_name || '', internship.supervisor_phone || '', internship.status || 'pending'
      ],
      (err) => {
        if (err) console.error('导入实习数据失败:', err);
        else if (index === internships.length - 1) console.log('实习数据导入完成');
      }
    );
  });

  setTimeout(() => {
    db.close();
    console.log('数据导入完成！');
  }, 2000);
}

importData();