import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import ChangePassword from './components/ChangePassword';
import Layout from './components/Layout';
import AdminDashboard from './components/AdminDashboard';
import TeacherManagement from './components/TeacherManagement';
import StudentManagement from './components/StudentManagement';
import InternshipReview from './components/InternshipReview';
import InternshipSubmission from './components/InternshipSubmission';
import MyInternships from './components/MyInternships';
import Profile from './components/Profile';
import AuditLog from './components/AuditLog';
import './index.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // 如果需要修改密码且当前不在修改密码页面，强制跳转
  if (user.need_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" />;
  }
  
  return children;
};

const RoleRoute = ({ role, children }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (Array.isArray(role)) {
    if (!role.includes(user.role)) {
      return <Navigate to="/login" />;
    }
  } else {
    if (user.role !== role) {
      return <Navigate to="/login" />;
    }
  }
  
  return children;
};

const AppContent = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/change-password" element={
          <PrivateRoute>
            <ChangePassword />
          </PrivateRoute>
        } />
        
        <Route path="/admin-dashboard" element={
          <PrivateRoute>
            <Layout>
              <RoleRoute role="admin">
                <AdminDashboard />
              </RoleRoute>
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/teacher-management" element={
          <PrivateRoute>
            <Layout>
              <RoleRoute role={['admin', 'teacher']}>
                <TeacherManagement />
              </RoleRoute>
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/student-management" element={
          <PrivateRoute>
            <Layout>
              <RoleRoute role={['admin', 'teacher']}>
                <StudentManagement />
              </RoleRoute>
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/internship-review" element={
          <PrivateRoute>
            <Layout>
              <RoleRoute role={['admin', 'teacher']}>
                <InternshipReview />
              </RoleRoute>
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/internship-submission" element={
          <PrivateRoute>
            <Layout>
              <RoleRoute role="student">
                <InternshipSubmission />
              </RoleRoute>
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/my-internships" element={
          <PrivateRoute>
            <Layout>
              <RoleRoute role="student">
                <MyInternships />
              </RoleRoute>
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/profile" element={
          <PrivateRoute>
            <Layout>
              <RoleRoute role={['teacher', 'student']}>
                <Profile />
              </RoleRoute>
            </Layout>
          </PrivateRoute>
        } />

        <Route path="/audit-log" element={
          <PrivateRoute>
            <Layout>
              <RoleRoute role="admin">
                <AuditLog />
              </RoleRoute>
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
