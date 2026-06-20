import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { studentApi, teacherApi } from '../api';
import { useAuth } from '../context/AuthContext';
import Pagination from './Pagination';
import SortableHeader from './SortableHeader';

const StudentManagement = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    student_id: '',
    name: '',
    enrollment_year: '',
    department: '',
    class: '',
    course_name: '',
    course_code: '',
    credits: '',
    teacher_id: '',
    password: '',
  });
  
  const [filters, setFilters] = useState({
    student_id: '',
    name: '',
    class: '',
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'student_id', direction: 'asc' });

  useEffect(() => {
    fetchStudents();
    if (isAdmin) {
      fetchTeachers();
    }
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await studentApi.getAll();
      setStudents(response.data);
      
      const uniqueClasses = [...new Set(response.data.map(s => s.class).filter(c => c))];
      setClasses(uniqueClasses.sort());
    } catch (err) {
      console.error('获取学生列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await teacherApi.getAll();
      setTeachers(response.data);
    } catch (err) {
      console.error('获取教师列表失败:', err);
    }
  };

  const filteredStudents = students.filter(student => {
    if (filters.student_id && !student.student_id.includes(filters.student_id)) {
      return false;
    }
    if (filters.name && !student.name.includes(filters.name)) {
      return false;
    }
    if (filters.class && student.class !== filters.class) {
      return false;
    }
    return true;
  });

  // 排序功能
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedStudents = [...filteredStudents].sort((a, b) => {
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
  const totalPages = Math.ceil(sortedStudents.length / pageSize);
  const paginatedStudents = sortedStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 筛选变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);
  
  // pageSize 变化时重置页码
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleOpenModal = (student = null) => {
    setEditingStudent(student);
    if (student) {
      setFormData({
        student_id: student.student_id,
        name: student.name,
        enrollment_year: student.enrollment_year || '',
        department: student.department || '',
        class: student.class || '',
        course_name: student.course_name || '',
        course_code: student.course_code || '',
        credits: student.credits || '',
        teacher_id: student.teacher_id || '',
        password: '',
      });
    } else {
      setFormData({
        student_id: '',
        name: '',
        enrollment_year: '',
        department: '',
        class: '',
        course_name: '',
        course_code: '',
        credits: '',
        teacher_id: '',
        password: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStudent(null);
    setFormData({
      student_id: '',
      name: '',
      enrollment_year: '',
      department: '',
      class: '',
      course_name: '',
      course_code: '',
      credits: '',
      teacher_id: '',
      password: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        const data = { ...formData };
        if (!data.password) delete data.password;
        await studentApi.update(editingStudent.id, data);
      } else {
        const response = await studentApi.create(formData);
        alert(`学生添加成功，默认密码：${response.data.defaultPassword}`);
      }
      handleCloseModal();
      fetchStudents();
    } catch (err) {
      console.error('操作失败:', err);
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('确定要删除这个学生吗？')) {
      try {
        await studentApi.delete(id);
        fetchStudents();
      } catch (err) {
        console.error('删除失败:', err);
        alert(err.response?.data?.error || '删除失败');
      }
    }
  };

  // Excel 上传相关函数
  const handleOpenUploadModal = () => {
    setShowUploadModal(true);
    setPreviewData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setPreviewData([]);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          // 标准化字段名
          const normalizedData = jsonData.map(row => {
            const normalized = {};
            // 学号字段
            normalized.student_id = row['学号'] || row['student_id'] || row['学号*'] || '';
            // 姓名字段
            normalized.name = row['姓名'] || row['name'] || row['姓名*'] || '';
            // 入学年份字段
            normalized.enrollment_year = row['入学年份'] || row['enrollment_year'] || row['年级'] || '';
            // 院系字段
            normalized.department = row['院系'] || row['department'] || row['院系*'] || '信息工程学院';
            // 班级字段
            normalized.class = row['班级'] || row['class'] || row['班级*'] || '';
            // 课程名称字段
            normalized.course_name = row['课程名称'] || row['course_name'] || row['课程'] || '';
            // 课程代码字段
            normalized.course_code = row['课程代码'] || row['course_code'] || row['课程号'] || '';
            // 学分字段
            normalized.credits = row['学分'] || row['credits'] || row['学分*'] || '';
            // 指导老师工号字段
            normalized.teacher_id = row['指导老师'] || row['teacher_id'] || row['指导老师工号'] || '';
            
            return normalized;
          }).filter(row => row.student_id && row.name);

          setPreviewData(normalizedData);
        } catch (err) {
          console.error('解析Excel文件失败:', err);
          alert('解析Excel文件失败，请检查文件格式');
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleUpload = async () => {
    if (previewData.length === 0) {
      alert('没有可导入的数据');
      return;
    }

    setUploading(true);
    try {
      const response = await studentApi.batchImport(previewData);
      const result = response.data;
      
      let message = result.message;
      
      // 如果有错误，显示详细错误信息
      if (result.errors && result.errors.length > 0) {
        const errorList = result.errors.slice(0, 10).map(e => 
          `第${e.row}行 [${e.student_id || '未知'}] ${e.error}`
        ).join('\n');
        
        if (result.errors.length > 10) {
          message += `\n\n前10条错误：\n${errorList}\n...还有 ${result.errors.length - 10} 条错误`;
        } else {
          message += `\n\n错误详情：\n${errorList}`;
        }
      }
      
      alert(message);
      handleCloseUploadModal();
      fetchStudents();
    } catch (err) {
      console.error('批量导入失败:', err);
      console.error('Error response:', err.response);
      console.error('Error message:', err.message);
      
      let errorMessage = '批量导入失败';
      
      if (err.response?.data) {
        // 服务器返回了错误响应
        const serverError = err.response.data;
        if (serverError.message) {
          errorMessage = serverError.message;
        } else if (serverError.error) {
          errorMessage = serverError.error;
        } else if (typeof serverError === 'string') {
          errorMessage = serverError;
        }
      } else if (err.message) {
        // 网络错误或其他错误
        errorMessage = `网络错误: ${err.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // 下载模板
  const downloadTemplate = () => {
    const templateData = [
      {
        '学号': '230801001',
        '姓名': '张三',
        '入学年份': '2023',
        '院系': '信息工程学院',
        '班级': '计科23-1班',
        '课程名称': '专业实习',
        '课程代码': 'CS401',
        '学分': '2',
        '指导老师': 'T001'
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '学生信息');
    XLSX.writeFile(wb, '学生导入模板.xlsx');
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">
          {isAdmin ? '学生管理' : '我的学生'}
        </h3>
        {isAdmin && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenUploadModal}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              批量导入
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              添加学生
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">学号查找</label>
          <input
            type="text"
            value={filters.student_id}
            onChange={(e) => setFilters({ ...filters, student_id: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="输入学号关键字"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">姓名查找</label>
          <input
            type="text"
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="输入姓名关键字"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">班级</label>
          <select
            value={filters.class}
            onChange={(e) => setFilters({ ...filters, class: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="">全部班级</option>
            {classes.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>
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
                <SortableHeader label="学号" sortKey="student_id" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="姓名" sortKey="name" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="入学年份" sortKey="enrollment_year" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="院系" sortKey="department" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="班级" sortKey="class" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="课程" sortKey="course_name" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="指导教师" sortKey="teacher_name" currentSort={sortConfig} onSort={handleSort} />
                {isAdmin && (
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-800">{student.student_id}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{student.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{student.enrollment_year || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{student.department || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{student.class || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{student.course_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{student.teacher_name || '-'}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenModal(student)}
                          className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {paginatedStudents.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              没有找到符合条件的学生
            </div>
          )}
        </div>
      )}
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedStudents.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editingStudent ? '编辑学生' : '添加学生'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">学号</label>
                  <input
                    type="text"
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    required
                    disabled={!!editingStudent}
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">入学年份</label>
                  <input
                    type="number"
                    value={formData.enrollment_year}
                    onChange={(e) => setFormData({ ...formData, enrollment_year: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">班级</label>
                  <select
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="">请选择班级</option>
                    {classes.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">指导教师</label>
                  <select
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="">请选择教师</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">课程名称</label>
                  <input
                    type="text"
                    value={formData.course_name}
                    onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">课程代码</label>
                  <input
                    type="text"
                    value={formData.course_code}
                    onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">学分</label>
                <input
                  type="text"
                  value={formData.credits}
                  onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              {!editingStudent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">密码（留空默认为123456）</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="留空默认为123456"
                  />
                </div>
              )}
              {editingStudent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">新密码（留空不修改）</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="留空则不修改密码"
                  />
                </div>
              )}
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
                  {editingStudent ? '保存' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel 批量上传模态框 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">批量导入学生</h3>
            
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-blue-800 font-medium">Excel 文件要求：</p>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-all"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  下载模板
                </button>
              </div>
              <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                <li>必须包含 <strong>学号</strong> 和 <strong>姓名</strong> 列</li>
                <li>必须包含 <strong>指导老师</strong> 列（填入指导老师的工号，如 T001）</li>
                <li>可选列：入学年份、院系、班级、课程名称、课程代码、学分</li>
                <li>支持 .xlsx 和 .xls 格式</li>
                <li>导入后默认密码为 <strong>123456</strong></li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">选择 Excel 文件</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>

            {previewData.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  预览（共 {previewData.length} 条数据）：
                </p>
                <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">学号</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">姓名</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">院系</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">班级</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">指导老师</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">课程</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {previewData.slice(0, 20).map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{row.student_id}</td>
                          <td className="px-3 py-2">{row.name}</td>
                          <td className="px-3 py-2">{row.department || '-'}</td>
                          <td className="px-3 py-2">{row.class || '-'}</td>
                          <td className="px-3 py-2">{row.teacher_id}</td>
                          <td className="px-3 py-2">{row.course_name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.length > 20 && (
                    <p className="text-center py-2 text-sm text-gray-500">
                      ... 还有 {previewData.length - 20} 条数据未显示
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleCloseUploadModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                disabled={uploading}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={previewData.length === 0 || uploading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {uploading ? '导入中...' : `导入 ${previewData.length} 条数据`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
