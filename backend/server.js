require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admins');
const teacherRoutes = require('./routes/teachers');
const studentRoutes = require('./routes/students');
const internshipRoutes = require('./routes/internships');
const auditLogRoutes = require('./routes/auditLogs');

const app = express();
const port = process.env.PORT || 3001;

// 全局并发限制：同时最多处理80个请求
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 80;

const concurrencyLimiter = (req, res, next) => {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    return res.status(503).json({
      error: '系统繁忙，请稍后再试',
      currentLoad: activeRequests,
      maxCapacity: MAX_CONCURRENT_REQUESTS
    });
  }
  
  activeRequests++;
  
  res.on('finish', () => {
    activeRequests--;
  });
  
  res.on('close', () => {
    activeRequests--;
  });
  
  next();
};

// 应用中间件
app.use('/api', concurrencyLimiter);  // 并发限制

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/audit-logs', auditLogRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '实习管理系统后端服务正常运行' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
