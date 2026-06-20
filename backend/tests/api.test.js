const request = require('supertest');
const { createTestDb, createTestApp } = require('./testApp');

describe('实习管理系统 API 测试', () => {
  let db;
  let app;
  let adminToken;
  let teacherToken;
  let studentToken;
  
  beforeAll(async () => {
    db = await createTestDb();
    app = createTestApp(db);
    
    // 获取测试令牌 - 管理员登录
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: '123456', role: 'admin' });
    adminToken = adminLogin.body.token;
    
    // 教师登录
    const teacherLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'T001', password: '123456', role: 'teacher' });
    teacherToken = teacherLogin.body.token;
    
    // 学生登录
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'S001', password: '123456', role: 'student' });
    studentToken = studentLogin.body.token;
  });
  
  afterAll(async () => {
    await new Promise((resolve) => {
      db.close(() => resolve());
    });
  });
  
  describe('1. 认证测试', () => {
    test('管理员登录成功', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: '123456', role: 'admin' });
      
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('admin');
    });
    
    test('教师登录成功', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'T001', password: '123456', role: 'teacher' });
      
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('teacher');
    });
    
    test('学生登录成功', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'S001', password: '123456', role: 'student' });
      
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('student');
    });
    
    test('登录失败 - 错误密码', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword', role: 'admin' });
      
      expect(res.status).toBe(401);
    });
    
    test('登录失败 - 用户不存在', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: '123456', role: 'admin' });
      
      expect(res.status).toBe(401);
    });
    
    test('登录失败 - 缺少参数', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin' });
      
      expect(res.status).toBe(400);
    });
  });
  
  describe('2. 教师管理测试', () => {
    test('管理员获取教师列表', async () => {
      const res = await request(app)
        .get('/api/teachers')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
    
    test('管理员创建教师', async () => {
      const res = await request(app)
        .post('/api/teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teacher_id: 'T002',
          name: '新教师',
          department: '数学系'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.teacher_id).toBe('T002');
    });
    
    test('创建重复教师工号失败', async () => {
      const res = await request(app)
        .post('/api/teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teacher_id: 'T001',
          name: '重复教师',
          department: '数学系'
        });
      
      expect(res.status).toBe(400);
    });
    
    test('管理员更新教师', async () => {
      const res = await request(app)
        .put('/api/teachers/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '更新后的教师',
          department: '物理系'
        });
      
      expect(res.status).toBe(200);
    });
    
    test('教师只能查看自己的信息', async () => {
      const res = await request(app)
        .get('/api/teachers')
        .set('Authorization', `Bearer ${teacherToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].teacher_id).toBe('T001');
    });
    
    test('管理员删除教师', async () => {
      const res = await request(app)
        .delete('/api/teachers/2')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
    });
    
    test('删除不存在的教师', async () => {
      const res = await request(app)
        .delete('/api/teachers/999')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(404);
    });
  });
  
  describe('3. 学生管理测试', () => {
    test('管理员获取学生列表', async () => {
      const res = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
    
    test('管理员创建学生', async () => {
      const res = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student_id: 'S002',
          name: '新学生',
          department: '计算机系',
          class: '2021级2班',
          teacher_id: 1
        });
      
      expect(res.status).toBe(201);
      expect(res.body.student_id).toBe('S002');
    });
    
    test('管理员更新学生', async () => {
      const res = await request(app)
        .put('/api/students/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '更新后的学生',
          department: '数学系'
        });
      
      expect(res.status).toBe(200);
    });
    
    test('学生只能查看自己的信息', async () => {
      const res = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${studentToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].student_id).toBe('S001');
    });
    
    test('管理员删除学生', async () => {
      const res = await request(app)
        .delete('/api/students/2')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
    });
  });
  
  describe('4. 实习申请测试', () => {
    test('学生提交实习申请', async () => {
      const res = await request(app)
        .post('/api/internships')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          student_id: 1,
          company_name: '新实习公司',
          start_date: '2024-07-01',
          end_date: '2024-08-31'
        });
      
      expect(res.status).toBe(201);
    });
    
    test('学生查看自己的实习申请', async () => {
      const res = await request(app)
        .get('/api/internships')
        .set('Authorization', `Bearer ${studentToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
    
    test('教师查看学生的实习申请', async () => {
      const res = await request(app)
        .get('/api/internships')
        .set('Authorization', `Bearer ${teacherToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
    
    test('教师/管理员审核实习申请 - 通过', async () => {
      // 先获取实习申请列表
      const listRes = await request(app)
        .get('/api/internships')
        .set('Authorization', `Bearer ${adminToken}`);
      
      // 找到一个可以审核的实习申请
      const internship = listRes.body.find(i => i.status === 'pending');
      expect(internship).toBeDefined();
      
      // 使用管理员审核
      const res = await request(app)
        .put(`/api/internships/${internship.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'approved'
        });
      
      expect(res.status).toBe(200);
    });
    
    test('教师/管理员审核实习申请 - 驳回', async () => {
      // 先创建一个新的实习申请
      const createRes = await request(app)
        .post('/api/internships')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          student_id: 1,
          company_name: '待驳回的公司'
        });
      
      // 使用管理员审核
      const res = await request(app)
        .put(`/api/internships/${createRes.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'rejected'
        });
      
      expect(res.status).toBe(200);
    });
    
    test('管理员删除实习申请', async () => {
      // 先创建一个新的实习申请
      const createRes = await request(app)
        .post('/api/internships')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          student_id: 1,
          company_name: '待删除的公司'
        });
      
      const res = await request(app)
        .delete(`/api/internships/${createRes.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
    });
  });
  
  describe('5. 审计日志测试', () => {
    test('管理员获取审计日志', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(Array.isArray(res.body.logs)).toBe(true);
    });
    
    test('审计日志包含分页信息', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.page).toBeDefined();
      expect(res.body.pageSize).toBeDefined();
      expect(res.body.total).toBeDefined();
      expect(res.body.totalPages).toBeDefined();
    });
    
    test('审计日志筛选 - 按操作类型', async () => {
      const res = await request(app)
        .get('/api/audit-logs?action=创建')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.logs.every(log => log.action === '创建')).toBe(true);
    });
    
    test('审计日志筛选 - 按操作对象', async () => {
      const res = await request(app)
        .get('/api/audit-logs?entity_type=教师')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.logs.every(log => log.entity_type === '教师')).toBe(true);
    });
    
    test('教师无法访问审计日志', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${teacherToken}`);
      
      expect(res.status).toBe(403);
    });
    
    test('学生无法访问审计日志', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${studentToken}`);
      
      expect(res.status).toBe(403);
    });
    
    test('审计日志记录了教师创建操作', async () => {
      const res = await request(app)
        .get('/api/audit-logs?action=创建&entity_type=教师')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.logs.length).toBeGreaterThan(0);
    });
    
    test('审计日志记录了学生创建操作', async () => {
      const res = await request(app)
        .get('/api/audit-logs?action=创建&entity_type=学生')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.logs.length).toBeGreaterThan(0);
    });
    
    test('审计日志记录了实习申请提交操作', async () => {
      const res = await request(app)
        .get('/api/audit-logs?action=提交&entity_type=实习申请')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.logs.length).toBeGreaterThan(0);
    });
    
    test('审计日志记录了审核操作', async () => {
      const res = await request(app)
        .get('/api/audit-logs?action=审核')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.logs.length).toBeGreaterThan(0);
    });
  });
  
  describe('6. 权限控制测试', () => {
    test('未登录无法访问受保护路由', async () => {
      const res = await request(app)
        .get('/api/teachers');
      
      expect(res.status).toBe(401);
    });
    
    test('学生无法创建教师', async () => {
      const res = await request(app)
        .post('/api/teachers')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          teacher_id: 'T003',
          name: '测试教师'
        });
      
      expect(res.status).toBe(403);
    });
    
    test('学生无法创建学生', async () => {
      const res = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          student_id: 'S003',
          name: '测试学生'
        });
      
      expect(res.status).toBe(403);
    });
    
    test('教师无法提交实习申请', async () => {
      const res = await request(app)
        .post('/api/internships')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          student_id: 1,
          company_name: '测试公司'
        });
      
      expect(res.status).toBe(403);
    });
    
    test('教师无法删除实习申请', async () => {
      const res = await request(app)
        .delete('/api/internships/1')
        .set('Authorization', `Bearer ${teacherToken}`);
      
      expect(res.status).toBe(403);
    });
    
    test('教师无法删除教师', async () => {
      const res = await request(app)
        .delete('/api/teachers/1')
        .set('Authorization', `Bearer ${teacherToken}`);
      
      expect(res.status).toBe(403);
    });
    
    test('教师无法删除学生', async () => {
      const res = await request(app)
        .delete('/api/students/1')
        .set('Authorization', `Bearer ${teacherToken}`);
      
      expect(res.status).toBe(403);
    });
  });
  
  describe('7. 数据完整性测试', () => {
    test('学生关联教师信息', async () => {
      const res = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body[0].teacher_name).toBeDefined();
    });
    
    test('实习申请关联学生信息', async () => {
      const res = await request(app)
        .get('/api/internships')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body[0].student_name).toBeDefined();
      expect(res.body[0].student_no).toBeDefined();
    });
  });
});
