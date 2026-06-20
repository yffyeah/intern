import { useState, useEffect } from 'react';
import { auditLogApi } from '../api';
import { useAuth } from '../context/AuthContext';
import Pagination from './Pagination';

export default function AuditLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    entity_type: '',
    start_date: '',
    end_date: '',
    user_name: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, pagination.pageSize, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        ...filters
      };
      // 移除空值
      Object.keys(params).forEach(key => params[key] === '' && delete params[key]);
      
      const response = await auditLogApi.getAll(params);
      setLogs(response.data.logs);
      setPagination({
        page: response.data.page,
        pageSize: response.data.pageSize,
        total: response.data.total,
        totalPages: response.data.totalPages
      });
    } catch (err) {
      console.error('获取审计日志失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handlePageSizeChange = (size) => {
    setPagination(prev => ({ ...prev, pageSize: size, page: 1 }));
  };

  const getActionBadge = (action) => {
    const badges = {
      '创建': 'bg-green-100 text-green-800',
      '修改': 'bg-blue-100 text-blue-800',
      '删除': 'bg-red-100 text-red-800',
      '提交': 'bg-purple-100 text-purple-800',
      '审核': 'bg-yellow-100 text-yellow-800',
      '批量导入': 'bg-indigo-100 text-indigo-800',
    };
    return badges[action] || 'bg-gray-100 text-gray-800';
  };

  const getEntityBadge = (type) => {
    const badges = {
      '教师': 'bg-blue-100 text-blue-800',
      '学生': 'bg-green-100 text-green-800',
      '实习申请': 'bg-purple-100 text-purple-800',
    };
    return badges[type] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      entity_type: '',
      start_date: '',
      end_date: '',
      user_name: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  if (user?.role !== 'admin') {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="text-center text-gray-500 py-8">
          <p className="text-lg">您没有权限查看审计日志</p>
          <p className="text-sm mt-2">审计日志仅对管理员开放</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">审计日志</h3>
      
      {/* 筛选区域 */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">全部</option>
              <option value="创建">创建</option>
              <option value="修改">修改</option>
              <option value="删除">删除</option>
              <option value="提交">提交</option>
              <option value="审核">审核</option>
              <option value="批量导入">批量导入</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">操作对象</label>
            <select
              value={filters.entity_type}
              onChange={(e) => handleFilterChange('entity_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">全部</option>
              <option value="教师">教师</option>
              <option value="学生">学生</option>
              <option value="实习申请">实习申请</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">操作人</label>
            <input
              type="text"
              value={filters.user_name}
              onChange={(e) => handleFilterChange('user_name', e.target.value)}
              placeholder="输入操作人姓名"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            清除筛选
          </button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="mb-4 text-sm text-gray-600">
        共 {pagination.total} 条记录
      </div>

      {/* 日志列表 */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">加载中...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">没有找到审计日志</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">时间</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">操作类型</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">操作对象</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">对象名称</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">操作人</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">操作详情</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEntityBadge(log.entity_type)}`}>
                        {log.entity_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">{log.entity_name || '-'}</td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium">{log.user_name}</span>
                        <span className="ml-2 text-xs text-gray-500">({log.user_role === 'admin' ? '管理员' : log.user_role === 'teacher' ? '教师' : '学生'})</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate" title={log.details}>
                      {log.details || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          <div className="mt-4">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              pageSize={pagination.pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        </>
      )}
    </div>
  );
}
