import { useState, useEffect } from 'react';
import { internshipApi, studentApi } from '../api';
import { useAuth } from '../context/AuthContext';

const InternshipSubmission = () => {
  const [studentId, setStudentId] = useState(null);
  const [formData, setFormData] = useState({
    internship_type: '',
    organization_form: '',
    internship_method: '',
    academic_year: '',
    company_name: '',
    company_code: '',
    region: '',
    address: '',
    has_insurance: '',
    has_accident_insurance: '',
    has_safety_training: '',
    has_agreement: '',
    company_source: '',
    has_emergency_plan: '',
    is_base: '',
    is_digital_base: '',
    is_overseas_base: '',
    start_date: '',
    end_date: '',
    actual_days: '',
    position: '',
    salary: '',
    supervisor_name: '',
    supervisor_phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeInternship, setActiveInternship] = useState(null);

  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await studentApi.getAll({ student_id: user.username });
      if (response.data.length > 0) {
        setStudentId(response.data[0].id);
        const internshipResponse = await internshipApi.getAll({ student_id: response.data[0].id });
        const active = internshipResponse.data.find(i => 
          i.status === 'pending' || i.status === 'approved'
        );
        if (active) {
          setActiveInternship(active);
        }
      }
    } catch (err) {
      console.error('获取数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentId) {
      alert('无法获取学生信息，请联系管理员');
      return;
    }

    setSubmitting(true);
    try {
      await internshipApi.create({
        ...formData,
        student_id: studentId,
        actual_days: formData.actual_days ? parseInt(formData.actual_days) : null,
        salary: formData.salary ? parseInt(formData.salary) : 0,
      });
      alert('实习信息提交成功！');
      resetForm();
      fetchData();
    } catch (err) {
      console.error('提交失败:', err);
      alert(err.response?.data?.error || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const resetForm = () => {
    setFormData({
      internship_type: '',
      organization_form: '',
      internship_method: '',
      academic_year: '',
      company_name: '',
      company_code: '',
      region: '',
      address: '',
      has_insurance: '',
      has_accident_insurance: '',
      has_safety_training: '',
      has_agreement: '',
      company_source: '',
      has_emergency_plan: '',
      is_base: '',
      is_digital_base: '',
      is_overseas_base: '',
      start_date: '',
      end_date: '',
      actual_days: '',
      position: '',
      salary: '',
      supervisor_name: '',
      supervisor_phone: '',
    });
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

  if (activeInternship) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">实习信息提交</h3>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
            activeInternship.status === 'approved' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {activeInternship.status === 'approved' ? '已通过' : '待审核'}
          </span>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm">
            您当前有{activeInternship.status === 'approved' ? '已通过' : '一个待审核'}的实习申请在本学期。
            {activeInternship.status === 'pending' && '审核通过前如需修改，请前往"我的实习"页面撤回后重新编辑。'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">实习单位</p>
            <p className="font-medium text-gray-800">{activeInternship.company_name || '-'}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">实习岗位</p>
            <p className="font-medium text-gray-800">{activeInternship.position || '-'}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">实习类型</p>
            <p className="font-medium text-gray-800">{activeInternship.internship_type || '-'}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">实习时间</p>
            <p className="font-medium text-gray-800">
              {activeInternship.start_date} - {activeInternship.end_date}
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <a
            href="/my-internships"
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
          >
            查看我的实习列表
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">实习信息提交</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">实习类型</label>
            <select
              name="internship_type"
              value={formData.internship_type}
              onChange={handleChange}
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
              value={formData.organization_form}
              onChange={handleChange}
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
              value={formData.internship_method}
              onChange={handleChange}
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
            value={formData.company_name}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="请输入实习单位名称"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">统一社会信用代码</label>
            <input
              type="text"
              name="company_code"
              value={formData.company_code}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="请输入统一社会信用代码"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">实习地区</label>
            <input
              type="text"
              name="region"
              value={formData.region}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="如：北京市朝阳区-110105"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">实习详细地址</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="请输入详细地址"
          />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">实习责任险</label>
            <select
              name="has_insurance"
              value={formData.has_insurance}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">请选择</option>
              <option value="是">是</option>
              <option value="否">否</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">人身意外险</label>
            <select
              name="has_accident_insurance"
              value={formData.has_accident_insurance}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">请选择</option>
              <option value="是">是</option>
              <option value="否">否</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">安全教育培训</label>
            <select
              name="has_safety_training"
              value={formData.has_safety_training}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">请选择</option>
              <option value="是">是</option>
              <option value="否">否</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">三方协议</label>
            <select
              name="has_agreement"
              value={formData.has_agreement}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">请选择</option>
              <option value="是">是</option>
              <option value="否">否</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">单位获取方式</label>
            <select
              name="company_source"
              value={formData.company_source}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">请选择</option>
              <option value="学校组织联系">学校组织联系</option>
              <option value="学生自行联系">学生自行联系</option>
              <option value="企业待定">企业待定</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">安全应急预案</label>
            <select
              name="has_emergency_plan"
              value={formData.has_emergency_plan}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">请选择</option>
              <option value="是">是</option>
              <option value="否">否</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">校级实习基地</label>
            <select
              name="is_base"
              value={formData.is_base}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">请选择</option>
              <option value="是">是</option>
              <option value="否">否</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">数智赋能基地</label>
            <select
              name="is_digital_base"
              value={formData.is_digital_base}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">请选择</option>
              <option value="是">是</option>
              <option value="否">否</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">实际天数</label>
            <input
              type="number"
              name="actual_days"
              value={formData.actual_days}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="实际实习天数"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">实习岗位</label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="请输入实习岗位"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">实习报酬（元/月）</label>
            <input
              type="number"
              name="salary"
              value={formData.salary}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">学年</label>
            <input
              type="text"
              name="academic_year"
              value={formData.academic_year}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="如：2025-2026学年"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">企业指导人员姓名</label>
            <input
              type="text"
              name="supervisor_name"
              value={formData.supervisor_name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="请输入企业指导人员姓名"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">企业指导人员电话</label>
            <input
              type="text"
              name="supervisor_phone"
              value={formData.supervisor_phone}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="请输入联系电话"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
          >
            重置
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {submitting ? '提交中...' : '提交实习信息'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InternshipSubmission;
