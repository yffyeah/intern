import { useState, useEffect } from 'react';
import { internshipApi, studentApi } from '../api';
import { useAuth } from '../context/AuthContext';
import Pagination from './Pagination';

const MyInternships = () => {
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingInternship, setEditingInternship] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'start_date', direction: 'desc' });

  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const studentResponse = await studentApi.getAll({ student_id: user.username });
      if (studentResponse.data.length > 0) {
        const internshipResponse = await internshipApi.getAll({ student_id: studentResponse.data[0].id });
        setInternships(internshipResponse.data);
      }
    } catch (err) {
      console.error('获取实习记录失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecall = async (id) => {
    if (!confirm('确定要撤回此申请吗？撤回后将可以编辑或删除。')) {
      return;
    }
    
    try {
      await internshipApi.update(id, { status: 'withdrawn' });
      alert('申请已撤回');
      fetchData();
    } catch (err) {
      console.error('撤回失败:', err);
      alert(err.response?.data?.error || '撤回失败');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除此实习申请吗？此操作不可撤销。')) {
      return;
    }
    
    try {
      await internshipApi.delete(id);
      alert('实习申请已删除');
      fetchData();
    } catch (err) {
      console.error('删除失败:', err);
      alert(err.response?.data?.error || '删除失败');
    }
  };

  const handleEdit = (internship) => {
    setEditingInternship(internship);
    setEditFormData({
      internship_type: internship.internship_type || '',
      organization_form: internship.organization_form || '',
      internship_method: internship.internship_method || '',
      academic_year: internship.academic_year || '',
      company_name: internship.company_name || '',
      company_code: internship.company_code || '',
      region: internship.region || '',
      address: internship.address || '',
      has_insurance: internship.has_insurance || '',
      has_accident_insurance: internship.has_accident_insurance || '',
      has_safety_training: internship.has_safety_training || '',
      has_agreement: internship.has_agreement || '',
      company_source: internship.company_source || '',
      has_emergency_plan: internship.has_emergency_plan || '',
      is_base: internship.is_base || '',
      is_digital_base: internship.is_digital_base || '',
      is_overseas_base: internship.is_overseas_base || '',
      start_date: internship.start_date || '',
      end_date: internship.end_date || '',
      actual_days: internship.actual_days || '',
      position: internship.position || '',
      salary: internship.salary || '',
      supervisor_name: internship.supervisor_name || '',
      supervisor_phone: internship.supervisor_phone || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingInternship(null);
    setEditFormData({});
  };

  const handleUpdate = async () => {
    try {
      await internshipApi.update(editingInternship.id, {
        ...editFormData,
        actual_days: editFormData.actual_days ? parseInt(editFormData.actual_days) : null,
        salary: editFormData.salary ? parseInt(editFormData.salary) : 0,
        status: 'pending',
      });
      alert('实习信息已更新，待教师审核');
      setEditingInternship(null);
      setEditFormData({});
      fetchData();
    } catch (err) {
      console.error('更新失败:', err);
      alert(err.response?.data?.error || '更新失败');
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({ ...editFormData, [name]: value });
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
      case 'withdrawn':
        return 'bg-gray-100 text-gray-700';
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
      case 'withdrawn':
        return '已撤回';
      default:
        return '待审核';
    }
  };

  const sortedInternships = [...internships].sort((a, b) => {
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
  
  const totalPages = Math.ceil(sortedInternships.length / pageSize);
  const paginatedInternships = sortedInternships.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
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

  if (editingInternship) {
    const isFromWithdrawn = editingInternship.status === 'withdrawn';
    
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">
            {isFromWithdrawn ? '编辑实习信息' : '重新编辑实习信息'}
          </h3>
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-700">
            待提交审核
          </span>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            {isFromWithdrawn ? '请修改以下信息后重新提交审核。' : '请修改以下信息后重新提交。'}
          </p>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">实习类型</label>
              <select
                name="internship_type"
                value={editFormData.internship_type}
                onChange={handleEditChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="">请选择</option>
                <option value="认识实习">认识实习</option>
                <option value="生产实习">生产实习</option>
                <option value="毕业实习">毕业实习</option>
                <option value="社会实践">社会实践</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">组织形式</label>
              <select
                name="organization_form"
                value={editFormData.organization_form}
                onChange={handleEditChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="">请选择</option>
                <option value="集中实习">集中实习</option>
                <option value="分散实习">分散实习</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">实习方式</label>
              <select
                name="internship_method"
                value={editFormData.internship_method}
                onChange={handleEditChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="">请选择</option>
                <option value="现场实习">现场实习</option>
                <option value="远程实习">远程实习</option>
                <option value="混合实习">混合实习</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">实习单位名称 *</label>
            <input
              type="text"
              name="company_name"
              value={editFormData.company_name}
              onChange={handleEditChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">统一社会信用代码</label>
              <input
                type="text"
                name="company_code"
                value={editFormData.company_code}
                onChange={handleEditChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">实习地区</label>
              <input
                type="text"
                name="region"
                value={editFormData.region}
                onChange={handleEditChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
              <input
                type="date"
                name="start_date"
                value={editFormData.start_date}
                onChange={handleEditChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
              <input
                type="date"
                name="end_date"
                value={editFormData.end_date}
                onChange={handleEditChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">实际天数</label>
              <input
                type="number"
                name="actual_days"
                value={editFormData.actual_days}
                onChange={handleEditChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">实习岗位</label>
              <input
                type="text"
                name="position"
                value={editFormData.position}
                onChange={handleEditChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">实习报酬（元/月）</label>
              <input
                type="number"
                name="salary"
                value={editFormData.salary}
                onChange={handleEditChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">学年</label>
              <input
                type="text"
                name="academic_year"
                value={editFormData.academic_year}
                onChange={handleEditChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">企业指导人员姓名</label>
              <input
                type="text"
                name="supervisor_name"
                value={editFormData.supervisor_name}
                onChange={handleEditChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">企业指导人员电话</label>
              <input
                type="text"
                name="supervisor_phone"
                value={editFormData.supervisor_phone}
                onChange={handleEditChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
            >
              重新提交
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">我的实习记录</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">排序：</span>
          <select
            value={`${sortConfig.key}-${sortConfig.direction}`}
            onChange={(e) => {
              const [key, direction] = e.target.value.split('-');
              setSortConfig({ key, direction });
            }}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="start_date-desc">开始日期 ↓</option>
            <option value="start_date-asc">开始日期 ↑</option>
            <option value="end_date-desc">结束日期 ↓</option>
            <option value="end_date-asc">结束日期 ↑</option>
            <option value="company_name-asc">公司名称 A-Z</option>
            <option value="company_name-desc">公司名称 Z-A</option>
            <option value="status-asc">状态 ↑</option>
            <option value="status-desc">状态 ↓</option>
          </select>
        </div>
      </div>

      {internships.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-gray-500 mb-4">暂无实习记录</p>
          <a
            href="/internship-submission"
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
          >
            提交实习信息
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedInternships.map((internship) => (
            <div
              key={internship.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-800">{internship.company_name}</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {internship.position || '未指定岗位'} | {internship.internship_type || '未指定类型'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {internship.start_date} - {internship.end_date} ({internship.actual_days || 0}天)
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(internship.status)}`}>
                    {getStatusText(internship.status)}
                  </span>
                  {internship.status === 'pending' && (
                    <button
                      onClick={() => handleRecall(internship.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      撤回
                    </button>
                  )}
                  {internship.status === 'withdrawn' && (
                    <>
                      <button
                        onClick={() => handleEdit(internship)}
                        className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(internship.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        删除
                      </button>
                    </>
                  )}
                  {internship.status === 'rejected' && (
                    <button
                      onClick={() => handleEdit(internship)}
                      className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    >
                      重新编辑
                    </button>
                  )}
                  <button
                    onClick={() => handleViewDetail(internship)}
                    className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                  >
                    详情
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedInternships.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
      />

      {showDetailModal && selectedInternship && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">实习详情</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">状态</p>
                <p className={`font-medium px-2 py-1 rounded inline-block ${getStatusColor(selectedInternship.status)}`}>
                  {getStatusText(selectedInternship.status)}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">实习类型</p>
                <p className="font-medium text-gray-800">{selectedInternship.internship_type || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">单位名称</p>
                <p className="font-medium text-gray-800">{selectedInternship.company_name || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">实习岗位</p>
                <p className="font-medium text-gray-800">{selectedInternship.position || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">开始时间</p>
                <p className="font-medium text-gray-800">{selectedInternship.start_date || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">结束时间</p>
                <p className="font-medium text-gray-800">{selectedInternship.end_date || '-'}</p>
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
    </div>
  );
};

export default MyInternships;
