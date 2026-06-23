import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { internshipApi } from '../api';
import { useAuth } from '../context/AuthContext';
import Pagination from './Pagination';

const InternshipReview = () => {
  const [searchParams] = useSearchParams();
  const [internships, setInternships] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({});
  
  const [filters, setFilters] = useState({
    student_id: '',
    name: '',
    class: '',
    company: '',
  });
  const [sortOrder, setSortOrder] = useState('asc');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const { user } = useAuth();

  useEffect(() => {
    fetchInternships();
  }, [statusFilter]);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status) {
      setStatusFilter(status);
    }
  }, [searchParams]);

  const fetchInternships = async () => {
    setLoading(true);
    try {
      const params = {
        ...(statusFilter !== 'all' && { status: statusFilter }),
      };
      const response = await internshipApi.getAll(params);
      setInternships(response.data);
      
      const uniqueClasses = [...new Set(response.data.map(i => i.class).filter(c => c))];
      setClasses(uniqueClasses.sort());
    } catch (err) {
      console.error('获取实习列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInternships = internships
    .filter(internship => {
      if (filters.student_id && !internship.student_no?.includes(filters.student_id)) {
        return false;
      }
      if (filters.name && !internship.student_name?.includes(filters.name)) {
        return false;
      }
      if (filters.class && internship.class !== filters.class) {
        return false;
      }
      if (filters.company && !internship.company_name?.includes(filters.company)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const cmp = (a.student_no || '').localeCompare(b.student_no || '');
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  const totalPages = Math.ceil(filteredInternships.length / pageSize);
  const paginatedInternships = filteredInternships.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, statusFilter]);
  
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // 教师：审核（通过/驳回）
  const handleReview = async (id, status) => {
    if (user.role === 'admin') {
      alert('管理员无权审批实习申请');
      return;
    }
    try {
      await internshipApi.update(id, { status });
      fetchInternships();
    } catch (err) {
      console.error('审核失败:', err);
      alert(err.response?.data?.error || '审核失败');
    }
  };

  // 导出功能
  const handleExport = async () => {
    try {
      const response = await internshipApi.export();
      const data = response.data;
      
      if (!data || data.length === 0) {
        alert('没有可导出的数据');
        return;
      }
      
      // 定义表头映射
      const headers = [
        { key: 'student_id', label: '学号' },
        { key: 'student_name', label: '学生姓名' },
        { key: 'enrollment_year', label: '入学年份' },
        { key: 'department', label: '院系' },
        { key: 'class', label: '班级' },
        { key: 'course_name', label: '课程名称' },
        { key: 'course_code', label: '课程代码' },
        { key: 'credits', label: '学分' },
        { key: 'internship_type', label: '实习类型' },
        { key: 'organization_form', label: '实习组织形式' },
        { key: 'internship_method', label: '实习方式' },
        { key: 'academic_year', label: '学年' },
        { key: 'teacher_name', label: '校内指导教师' },
        { key: 'company_name', label: '实习单位名称' },
        { key: 'company_code', label: '实习单位统一社会信用代码' },
        { key: 'region', label: '实习地区及代码' },
        { key: 'address', label: '实习详细地址' },
        { key: 'has_insurance', label: '是否有实习责任险' },
        { key: 'has_accident_insurance', label: '是否有人身意外险' },
        { key: 'has_safety_training', label: '是否进行实习安全教育和培训' },
        { key: 'has_agreement', label: '是否签订实习三方协议' },
        { key: 'company_source', label: '实习单位获取方式' },
        { key: 'has_emergency_plan', label: '实习单位是否有安全应急' },
        { key: 'is_base', label: '实习单位是否为校级及以上实习基地' },
        { key: 'is_digital_base', label: '实习单位是否为数智赋能实习基地' },
        { key: 'is_overseas_base', label: '实习单位是否为海外实习基地' },
        { key: 'start_date', label: '实习开始时间' },
        { key: 'end_date', label: '实习结束时间' },
        { key: 'actual_days', label: '实际实习天数' },
        { key: 'position', label: '实习岗位' },
        { key: 'salary', label: '实习报酬（元/月）' },
        { key: 'supervisor_name', label: '企业指导人员姓名' },
        { key: 'supervisor_phone', label: '企业指导人员电话' },
        { key: 'status', label: '状态' },
      ];
      
      // 生成CSV内容
      const csvHeaders = headers.map(h => h.label).join(',');
      const csvRows = data.map(row => {
        return headers.map(h => {
          let value = row[h.key] ?? '';
          // 转义逗号和引号
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            value = '"' + value.replace(/"/g, '""') + '"';
          }
          return value;
        }).join(',');
      });
      
      const csvContent = [csvHeaders, ...csvRows].join('\n');
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `实习数据导出_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败');
    }
  };

  // 管理员：删除
  const handleDelete = async (id) => {
    if (user.role !== 'admin') {
      alert('只有管理员可以删除实习申请');
      return;
    }
    if (!window.confirm('确定要删除这条实习申请吗？此操作不可恢复。')) {
      return;
    }
    try {
      await internshipApi.delete(id);
      fetchInternships();
    } catch (err) {
      console.error('删除失败:', err);
      alert(err.response?.data?.error || '删除失败');
    }
  };

  // 日期格式转换：支持多种格式转换为 YYYY-MM-DD
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    
    // 如果已经是 YYYY-MM-DD 格式
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // 处理 2026-8-1 或 2026-08-01 格式（横线分隔）
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
      const parts = dateStr.split('-');
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // 处理混合格式 2026-6.29（横线和点混用）
    if (/^\d{4}-\d{1,2}\.\d{1,2}$/.test(dateStr)) {
      const year = dateStr.substring(0, 4);
      const rest = dateStr.substring(5);
      const parts = rest.split('.');
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // 处理 2026.7.6 或 2026.07.06 格式
    if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(dateStr)) {
      const parts = dateStr.split('.');
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // 处理 2026/7/6 格式
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
      const parts = dateStr.split('/');
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // 处理错误年份格式 20206-7-2（年份多了一位）
    if (/^\d{5}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
      const parts = dateStr.split('-');
      const year = parts[0].substring(0, 4); // 取前4位
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return '';
  };

  const isDaysValid = (startDate, endDate, actualDays) => {
    if (!startDate || !endDate || !actualDays) return true;
    
    const start = new Date(formatDateForInput(startDate));
    const end = new Date(formatDateForInput(endDate));
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return true;
    
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return diffDays >= actualDays;
  };

  // 管理员：打开编辑模态框
  const handleEdit = (internship) => {
    if (user.role !== 'admin') {
      alert('只有管理员可以编辑实习申请');
      return;
    }
    setSelectedInternship(internship);
    setEditData({
      company_name: internship.company_name || '',
      company_code: internship.company_code || '',
      region: internship.region || '',
      address: internship.address || '',
      internship_type: internship.internship_type || '',
      organization_form: internship.organization_form || '',
      internship_method: internship.internship_method || '',
      company_source: internship.company_source || '',
      has_insurance: internship.has_insurance === '1' || internship.has_insurance === 1,
      has_accident_insurance: internship.has_accident_insurance === '1' || internship.has_accident_insurance === 1,
      has_safety_training: internship.has_safety_training === '1' || internship.has_safety_training === 1,
      has_agreement: internship.has_agreement === '1' || internship.has_agreement === 1,
      has_emergency_plan: internship.has_emergency_plan === '1' || internship.has_emergency_plan === 1,
      is_base: internship.is_base === '1' || internship.is_base === 1,
      is_digital_base: internship.is_digital_base === '1' || internship.is_digital_base === 1,
      is_overseas_base: internship.is_overseas_base === '1' || internship.is_overseas_base === 1,
      start_date: formatDateForInput(internship.start_date),
      end_date: formatDateForInput(internship.end_date),
      actual_days: internship.actual_days || '',
      position: internship.position || '',
      salary: internship.salary || '',
      supervisor_name: internship.supervisor_name || '',
      supervisor_phone: internship.supervisor_phone || '',
    });
    setShowEditModal(true);
  };

  // 管理员：保存编辑
  const handleSaveEdit = async () => {
    try {
      await internshipApi.update(selectedInternship.id, editData);
      setShowEditModal(false);
      fetchInternships();
    } catch (err) {
      console.error('编辑失败:', err);
      alert(err.response?.data?.error || '编辑失败');
    }
  };

  const handleViewDetail = (internship) => {
    setSelectedInternship(internship);
    setShowDetailModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return '已通过';
      case 'rejected':
        return '已驳回';
      default:
        return '待审核';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">
          {user.role === 'admin' ? '实习管理' : '实习审核'}
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
          >
            导出数据
          </button>
          {['all', 'pending', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? '全部' : status === 'pending' ? '待审核' : status === 'approved' ? '已通过' : '已驳回'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">企业查找</label>
          <input
            type="text"
            value={filters.company}
            onChange={(e) => setFilters({ ...filters, company: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="输入企业名称关键字"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredInternships.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          暂无实习记录
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-gray-50">
                {/* 左侧固定列 */}
                <th
                  className="sticky left-0 z-20 bg-gray-50 px-4 py-2 text-left text-sm font-medium text-gray-600 w-28 cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                  学号 {sortOrder === 'asc' ? '↑' : '↓'}
                </th>
                <th className="sticky left-28 z-20 bg-gray-50 px-4 py-2 text-left text-sm font-medium text-gray-600 w-20">姓名</th>
                <th className="sticky left-48 z-20 bg-gray-50 px-4 py-2 text-left text-sm font-medium text-gray-600 w-32">班级</th>
                {/* 中间可滚动列 */}
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 min-w-[200px]">实习单位</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 min-w-[100px]">实习岗位</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 w-28">实习类型</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 w-36">起止日期</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 w-24">状态</th>
                {/* 右侧固定列 */}
                <th className="sticky right-0 z-20 bg-gray-50 px-4 py-2 text-left text-sm font-medium text-gray-600 w-28">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedInternships.map((internship) => (
                <tr key={internship.id} className="hover:bg-gray-50">
                  {/* 左侧固定列 */}
                  <td className="sticky left-0 z-10 bg-white px-4 py-2 text-sm text-gray-800 w-28">{internship.student_no}</td>
                  <td className="sticky left-28 z-10 bg-white px-4 py-2 text-sm text-gray-800 w-20">{internship.student_name}</td>
                  <td className="sticky left-48 z-10 bg-white px-4 py-2 text-sm text-gray-600 w-32">{internship.class || '-'}</td>
                  {/* 中间可滚动列 */}
                  <td className="px-4 py-2 text-sm text-gray-600 min-w-[200px]">{internship.company_name}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 min-w-[100px]">{internship.position || '-'}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 w-28">{internship.internship_type || '-'}</td>
                  <td className={`px-4 py-2 text-sm w-36 ${!isDaysValid(internship.start_date, internship.end_date, internship.actual_days) ? 'bg-red-50 text-red-700 font-medium' : 'text-gray-600'}`}>
                    {internship.start_date} - {internship.end_date}
                    {!isDaysValid(internship.start_date, internship.end_date, internship.actual_days) && (
                      <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-800">
                        ⚠️天数不符
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 w-24">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(internship.status)}`}>
                      {getStatusText(internship.status)}
                    </span>
                  </td>
                  {/* 右侧固定列 */}
                  <td className="sticky right-0 z-10 bg-white px-4 py-2 w-28">
                    <div className="flex items-center space-x-1">
                      {/* 详情按钮 */}
                      <button
                        onClick={() => handleViewDetail(internship)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="查看详情"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      {/* 教师：审批按钮 */}
                      {user.role === 'teacher' && internship.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleReview(internship.id, 'approved')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            title="通过"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleReview(internship.id, 'rejected')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="驳回"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      )}
                      {/* 管理员：编辑和删除按钮 */}
                      {user.role === 'admin' && (
                        <>
                          <button
                            onClick={() => handleEdit(internship)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="编辑"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(internship.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="删除"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
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
        totalItems={filteredInternships.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* 详情模态框 */}
      {showDetailModal && selectedInternship && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">实习详情</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">学号</p>
                <p className="font-medium text-gray-800">{selectedInternship.student_no}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">姓名</p>
                <p className="font-medium text-gray-800">{selectedInternship.student_name}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">班级</p>
                <p className="font-medium text-gray-800">{selectedInternship.class || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">院系</p>
                <p className="font-medium text-gray-800">{selectedInternship.department || '-'}</p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">实习信息</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">实习类型</label>
                  <p className="text-sm text-gray-800">{selectedInternship.internship_type || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">组织形式</label>
                  <p className="text-sm text-gray-800">{selectedInternship.organization_form || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">实习方式</label>
                  <p className="text-sm text-gray-800">{selectedInternship.internship_method || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">学年</label>
                  <p className="text-sm text-gray-800">{selectedInternship.academic_year || '-'}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">实习单位</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">单位名称</label>
                  <p className="text-sm text-gray-800">{selectedInternship.company_name || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">统一社会信用代码</label>
                  <p className="text-sm text-gray-800">{selectedInternship.company_code || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">地区及代码</label>
                  <p className="text-sm text-gray-800">{selectedInternship.region || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">详细地址</label>
                  <p className="text-sm text-gray-800">{selectedInternship.address || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">单位获取方式</label>
                  <p className="text-sm text-gray-800">{selectedInternship.company_source || '-'}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">保险与协议</h4>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-gray-500">实习责任险</label>
                  <p className="text-sm text-gray-800">{selectedInternship.has_insurance === '1' || selectedInternship.has_insurance === 1 ? '是' : '否'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">人身意外险</label>
                  <p className="text-sm text-gray-800">{selectedInternship.has_accident_insurance === '1' || selectedInternship.has_accident_insurance === 1 ? '是' : '否'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">安全培训</label>
                  <p className="text-sm text-gray-800">{selectedInternship.has_safety_training === '1' || selectedInternship.has_safety_training === 1 ? '是' : '否'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">三方协议</label>
                  <p className="text-sm text-gray-800">{selectedInternship.has_agreement === '1' || selectedInternship.has_agreement === 1 ? '是' : '否'}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">基地信息</h4>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-gray-500">安全应急</label>
                  <p className="text-sm text-gray-800">{selectedInternship.has_emergency_plan === '1' || selectedInternship.has_emergency_plan === 1 ? '是' : '否'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">校级基地</label>
                  <p className="text-sm text-gray-800">{selectedInternship.is_base === '1' || selectedInternship.is_base === 1 ? '是' : '否'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">数智赋能基地</label>
                  <p className="text-sm text-gray-800">{selectedInternship.is_digital_base === '1' || selectedInternship.is_digital_base === 1 ? '是' : '否'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">海外基地</label>
                  <p className="text-sm text-gray-800">{selectedInternship.is_overseas_base === '1' || selectedInternship.is_overseas_base === 1 ? '是' : '否'}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">实习时间</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500">开始时间</label>
                  <p className="text-sm text-gray-800">{selectedInternship.start_date || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">结束时间</label>
                  <p className="text-sm text-gray-800">{selectedInternship.end_date || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">实际天数</label>
                  <p className="text-sm text-gray-800">{selectedInternship.actual_days || '-'}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">岗位与报酬</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500">岗位名称</label>
                  <p className="text-sm text-gray-800">{selectedInternship.position || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">实习报酬</label>
                  <p className="text-sm text-gray-800">{selectedInternship.salary ? `${selectedInternship.salary}元/月` : '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">状态</label>
                  <p className={`text-sm ${getStatusColor(selectedInternship.status)} px-2 py-1 rounded`}>
                    {getStatusText(selectedInternship.status)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">企业指导人员</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">姓名</label>
                  <p className="text-sm text-gray-800">{selectedInternship.supervisor_name || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">电话</label>
                  <p className="text-sm text-gray-800">{selectedInternship.supervisor_phone || '-'}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑模态框 */}
      {showEditModal && selectedInternship && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">编辑实习申请</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">学号</p>
                <p className="font-medium text-gray-800">{selectedInternship.student_no}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">姓名</p>
                <p className="font-medium text-gray-800">{selectedInternship.student_name}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* 实习单位信息 */}
              <div className="border-b pb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">实习单位信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">单位名称</label>
                    <input
                      type="text"
                      value={editData.company_name}
                      onChange={(e) => setEditData({ ...editData, company_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">统一社会信用代码</label>
                    <input
                      type="text"
                      value={editData.company_code}
                      onChange={(e) => setEditData({ ...editData, company_code: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">地区及代码</label>
                    <input
                      type="text"
                      value={editData.region}
                      onChange={(e) => setEditData({ ...editData, region: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">详细地址</label>
                    <input
                      type="text"
                      value={editData.address}
                      onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">单位获取方式</label>
                    <input
                      type="text"
                      value={editData.company_source}
                      onChange={(e) => setEditData({ ...editData, company_source: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 实习类型信息 */}
              <div className="border-b pb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">实习类型信息</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">实习类型</label>
                    <input
                      type="text"
                      value={editData.internship_type}
                      onChange={(e) => setEditData({ ...editData, internship_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">组织形式</label>
                    <input
                      type="text"
                      value={editData.organization_form}
                      onChange={(e) => setEditData({ ...editData, organization_form: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">实习方式</label>
                    <input
                      type="text"
                      value={editData.internship_method}
                      onChange={(e) => setEditData({ ...editData, internship_method: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 保险与协议 */}
              <div className="border-b pb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">保险与协议</h4>
                <div className="grid grid-cols-4 gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editData.has_insurance}
                      onChange={(e) => setEditData({ ...editData, has_insurance: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">实习责任险</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editData.has_accident_insurance}
                      onChange={(e) => setEditData({ ...editData, has_accident_insurance: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">人身意外险</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editData.has_safety_training}
                      onChange={(e) => setEditData({ ...editData, has_safety_training: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">安全培训</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editData.has_agreement}
                      onChange={(e) => setEditData({ ...editData, has_agreement: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">三方协议</span>
                  </label>
                </div>
              </div>

              {/* 基地信息 */}
              <div className="border-b pb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">基地信息</h4>
                <div className="grid grid-cols-4 gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editData.has_emergency_plan}
                      onChange={(e) => setEditData({ ...editData, has_emergency_plan: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">安全应急</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editData.is_base}
                      onChange={(e) => setEditData({ ...editData, is_base: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">校级基地</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editData.is_digital_base}
                      onChange={(e) => setEditData({ ...editData, is_digital_base: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">数智赋能基地</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editData.is_overseas_base}
                      onChange={(e) => setEditData({ ...editData, is_overseas_base: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">海外基地</span>
                  </label>
                </div>
              </div>

              {/* 实习时间 */}
              <div className="border-b pb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">实习时间</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
                    <input
                      type="date"
                      value={editData.start_date}
                      onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
                    <input
                      type="date"
                      value={editData.end_date}
                      onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">实际天数</label>
                    <input
                      type="number"
                      value={editData.actual_days}
                      onChange={(e) => setEditData({ ...editData, actual_days: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 岗位与报酬 */}
              <div className="border-b pb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">岗位与报酬</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">岗位名称</label>
                    <input
                      type="text"
                      value={editData.position}
                      onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">实习报酬（元/月）</label>
                    <input
                      type="number"
                      value={editData.salary}
                      onChange={(e) => setEditData({ ...editData, salary: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 企业指导人员 */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">企业指导人员</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                    <input
                      type="text"
                      value={editData.supervisor_name}
                      onChange={(e) => setEditData({ ...editData, supervisor_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
                    <input
                      type="text"
                      value={editData.supervisor_phone}
                      onChange={(e) => setEditData({ ...editData, supervisor_phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternshipReview;
