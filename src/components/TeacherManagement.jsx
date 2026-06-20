import { useState, useEffect } from 'react';
import { teacherApi } from '../api';
import { useAuth } from '../context/AuthContext';
import Pagination from './Pagination';
import SortableHeader from './SortableHeader';

const TeacherManagement = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [formData, setFormData] = useState({
    teacher_id: '',
    name: '',
    department: '',
    phone: '',
    email: '',
    password: '',
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'teacher_id', direction: 'asc' });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const response = await teacherApi.getAll();
      setTeachers(response.data);
    } catch (err) {
      console.error('获取教师列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (teacher = null) => {
    setEditingTeacher(teacher);
    if (teacher) {
      setFormData({
        teacher_id: teacher.teacher_id,
        name: teacher.name,
        department: teacher.department || '',
        phone: teacher.phone || '',
        email: teacher.email || '',
        password: '',
      });
    } else {
      setFormData({
        teacher_id: '',
        name: '',
        department: '',
        phone: '',
        email: '',
        password: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTeacher(null);
    setFormData({
      teacher_id: '',
      name: '',
      department: '',
      phone: '',
      email: '',
      password: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTeacher) {
        const data = { ...formData };
        if (!data.password) delete data.password;
        await teacherApi.update(editingTeacher.id, data);
      } else {
        await teacherApi.create(formData);
      }
      handleCloseModal();
      fetchTeachers();
    } catch (err) {
      console.error('操作失败:', err);
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('确定要删除这个教师吗？')) {
      try {
        await teacherApi.delete(id);
        fetchTeachers();
      } catch (err) {
        console.error('删除失败:', err);
        alert(err.response?.data?.error || '删除失败');
      }
    }
  };

  // 切换管理员身份
  const handleToggleAdmin = async (teacher) => {
    const newStatus = teacher.is_admin ? '取消' : '授予';
    if (!confirm(`确定要${newStatus}"${teacher.name}"的管理员身份吗？`)) {
      return;
    }
    
    try {
      await teacherApi.setAdmin(teacher.id, !teacher.is_admin);
      alert(`${newStatus}管理员身份成功`);
      fetchTeachers();
    } catch (err) {
      console.error('修改失败:', err);
      alert(err.response?.data?.error || '修改失败');
    }
  };

  // 排序功能
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedTeachers = [...teachers].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    const aValue = a[sortConfig.key] || '';
    const bValue = b[sortConfig.key] || '';
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    const aStr = String(aValue);
    const bStr = String(bValue);
    
    if (sortConfig.direction === 'asc') {
      return aStr.localeCompare(bStr, 'zh-CN');
    }
    return bStr.localeCompare(aStr, 'zh-CN');
  });

  // 分页计算
  const totalPages = Math.ceil(sortedTeachers.length / pageSize);
  const sortedPaginatedTeachers = sortedTeachers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  
  // pageSize 变化时重置页码
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">
          {isAdmin ? '教师管理' : '个人信息'}
        </h3>
        {isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加教师
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <SortableHeader label="工号" sortKey="teacher_id" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="姓名" sortKey="name" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="院系" sortKey="department" currentSort={sortConfig} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">角色</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedPaginatedTeachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-800">{teacher.teacher_id}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{teacher.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{teacher.department || '-'}</td>
                  <td className="px-4 py-3">
                    {teacher.is_admin ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        管理员
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        教师
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenModal(teacher)}
                        className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        {isAdmin ? '编辑' : '修改信息'}
                      </button>
                      {isAdmin && teacher.id !== user.id && (
                        <button
                          onClick={() => handleToggleAdmin(teacher)}
                          className={`px-3 py-1 text-sm rounded-lg transition-all ${
                            teacher.is_admin 
                              ? 'text-orange-600 hover:bg-orange-50' 
                              : 'text-purple-600 hover:bg-purple-50'
                          }`}
                        >
                          {teacher.is_admin ? '取消管理员' : '设为管理员'}
                        </button>
                      )}
                      {isAdmin && teacher.id !== user.id && (
                        <button
                          onClick={() => handleDelete(teacher.id)}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedTeachers.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editingTeacher ? (isAdmin ? '编辑教师' : '修改个人信息') : '添加教师'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">工号</label>
                <input
                  type="text"
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-gray-100"
                  required
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">院系</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingTeacher ? '新密码（留空不修改）' : '密码'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder={editingTeacher ? '留空则不修改密码' : ''}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
                >
                  {editingTeacher ? '保存' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherManagement;
