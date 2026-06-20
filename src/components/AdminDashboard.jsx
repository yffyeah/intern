import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { teacherApi, studentApi, internshipApi } from '../api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teachersRes, studentsRes, internshipsRes] = await Promise.all([
        teacherApi.getAll(),
        studentApi.getAll(),
        internshipApi.getAll()
      ]);
      setTeachers(teachersRes.data);
      setStudents(studentsRes.data);
      setInternships(internshipsRes.data);
    } catch (err) {
      console.error('获取数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    teachers: teachers.length,
    students: students.length,
    internships: internships.length,
    pending: internships.filter(i => i.status === 'pending').length,
    approved: internships.filter(i => i.status === 'approved').length,
    rejected: internships.filter(i => i.status === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">系统概览</h3>
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/teacher-management')}
          className="bg-blue-50 rounded-lg p-4 hover:bg-blue-100 transition-colors text-left"
        >
          <p className="text-sm text-gray-600">教师总数</p>
          <p className="text-2xl font-bold text-blue-600">{stats.teachers}</p>
        </button>
        <button
          onClick={() => navigate('/student-management')}
          className="bg-green-50 rounded-lg p-4 hover:bg-green-100 transition-colors text-left"
        >
          <p className="text-sm text-gray-600">学生总数</p>
          <p className="text-2xl font-bold text-green-600">{stats.students}</p>
        </button>
        <button
          onClick={() => navigate('/internship-review')}
          className="bg-purple-50 rounded-lg p-4 hover:bg-purple-100 transition-colors text-left"
        >
          <p className="text-sm text-gray-600">实习申请</p>
          <p className="text-2xl font-bold text-purple-600">{stats.internships}</p>
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-4">
        <button
          onClick={() => navigate('/internship-review?status=pending')}
          className="bg-yellow-50 rounded-lg p-4 hover:bg-yellow-100 transition-colors text-left"
        >
          <p className="text-sm text-gray-600">待审核</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </button>
        <button
          onClick={() => navigate('/internship-review?status=approved')}
          className="bg-emerald-50 rounded-lg p-4 hover:bg-emerald-100 transition-colors text-left"
        >
          <p className="text-sm text-gray-600">已通过</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
        </button>
        <button
          onClick={() => navigate('/internship-review?status=rejected')}
          className="bg-red-50 rounded-lg p-4 hover:bg-red-100 transition-colors text-left"
        >
          <p className="text-sm text-gray-600">已驳回</p>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
