import openpyxl
import sqlite3
import bcrypt
import os

db_path = os.path.join(os.path.dirname(__file__), '../database.db')

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

wb = openpyxl.load_workbook('初始文档.xlsx')
sheet = wb['Sheet1']

teachers = {
    '张茹': 'T001',
    '张黎': 'T002',
    '蔡亮': 'T003',
    '赵淑晶': 'T004',
    '张君毅': 'T005',
    '庞艳杰': 'T006',
    '高岩': 'T007',
    '结硕': 'T008',
    '黄俊莲': 'T009',
    '冯花平': 'T010',
    '方红琴': 'T011',
    '段雪丽': 'T012',
    '赵雪莹': 'T013',
    '侍效': 'T014',
    '程者军': 'T015',
    '袁芳芳': 'T016',
    '王秀红': 'T017',
    '芮艳芳': 'T018',
    '杨韵展': 'T019',
    '刘芳': 'T020',
    '曹艳丽': 'T021',
    '陈龙缤': 'T022',
    '李忻雁': 'T023',
    '张传伟': 'T024',
    '李玉雯': 'T025',
    '邢俊英': 'T026',
}

cursor.execute('SELECT name, id FROM teachers')
teacher_id_map = {row[0]: row[1] for row in cursor.fetchall()}

print(f'已导入教师: {teacher_id_map.keys()}')

missing_teachers = []
for teacher_name in teachers.keys():
    if teacher_name not in teacher_id_map:
        missing_teachers.append(teacher_name)

if missing_teachers:
    print(f'缺少教师: {missing_teachers}')
    print('请先运行 importData.js 导入教师数据')
    conn.close()
    exit(1)

cursor.execute('DELETE FROM students')
conn.commit()
print('已清空现有学生数据')

password_hash = bcrypt.hashpw('123456'.encode(), bcrypt.gensalt())

students = []
for row in sheet.iter_rows(min_row=2, values_only=True):
    if not row[0]:
        continue
    
    student_id = str(row[0])
    name = row[1]
    enrollment_year = int(row[2]) if row[2] else 2023
    department = row[3]
    class_name = row[4]
    course_name = row[5]
    course_code = row[6]
    credits = row[7]
    teacher_name = row[-1] if len(row) > 0 else None
    
    if teacher_name and teacher_name in teacher_id_map:
        teacher_id = teacher_id_map[teacher_name]
    else:
        print(f'警告: 学生 {name} ({student_id}) 的指导老师 {teacher_name} 不存在')
        continue
    
    students.append({
        'student_id': student_id,
        'name': name,
        'enrollment_year': enrollment_year,
        'department': department,
        'class': class_name,
        'course_name': course_name,
        'course_code': course_code,
        'credits': credits,
        'teacher_id': teacher_id,
    })

print(f'共导入 {len(students)} 个学生')

inserted = 0
skipped = 0
for student in students:
    try:
        cursor.execute('''
            INSERT INTO students (student_id, name, enrollment_year, department, class, 
                                  course_name, course_code, credits, teacher_id, password)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            student['student_id'],
            student['name'],
            student['enrollment_year'],
            student['department'],
            student['class'],
            student['course_name'],
            student['course_code'],
            student['credits'],
            student['teacher_id'],
            password_hash
        ))
        inserted += 1
    except sqlite3.IntegrityError:
        skipped += 1

print(f'成功导入: {inserted} 人, 跳过重复: {skipped} 人')

conn.commit()

cursor.execute('''
    SELECT t.name as teacher_name, COUNT(*) as student_count
    FROM students s
    JOIN teachers t ON s.teacher_id = t.id
    GROUP BY t.name
    ORDER BY student_count DESC
''')

print('\n教师分配统计:')
for row in cursor.fetchall():
    print(f'  {row[0]}: {row[1]}人')

conn.close()
print('\n数据导入完成！')
