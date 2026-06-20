import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { teacherApi, studentApi } from '../api';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    email: '',
    department: '',
    class: '',
  });
  
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = user.role === 'teacher' ? 'teachers' : 'students';
      const response = await axios.get(`${API_URL}/${endpoint}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
    } catch (err) {
      console.error('获取个人信息失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm({ ...passwordForm, [name]: value });
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const token = localStorage.getItem('token');
      const endpoint = user.role === 'teacher' ? 'teachers' : 'students';
      await axios.put(`${API_URL}/${endpoint}/me`, profile, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: '个人信息更新成功！' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || '更新失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: '请填写所有密码字段' });
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的新密码不一致' });
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: '新密码长度至少6位' });
      return;
    }
    
    setChangingPassword(true);
    setMessage({ type: '', text: '' });
    
    try {
      const token = localStorage.getItem('token');
      const endpoint = user.role === 'teacher' ? 'teachers' : 'students';
      await axios.put(`${API_URL}/${endpoint}/password`, {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: '密码修改成功！' });
      setShowPasswordModal(false);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || '密码修改失败' });
    } finally {
      setChangingPassword(false);
    }
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
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">个人信息</h3>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
        >
          修改密码
        </button>
      </div>

      {message.text && (
        <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {user.role === 'teacher' ? '教师工号' : '学号'}
            </label>
            <input
              type="text"
              value={user.role === 'teacher' ? profile.teacher_id : profile.student_id}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
            <input
              type="text"
              name="name"
              value={profile.name || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">院系</label>
            <input
              type="text"
              name="department"
              value={profile.department || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>

          {user.role === 'student' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">班级</label>
              <input
                type="text"
                name="class"
                value={profile.class || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
            <input
              type="text"
              name="phone"
              value={profile.phone || ''}
              onChange={handleProfileChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="请输入联系电话"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">电子邮箱</label>
            <input
              type="email"
              name="email"
              value={profile.email || ''}
              onChange={handleProfileChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="请输入电子邮箱"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存修改'}
          </button>
        </div>
      </div>

      {/* 修改密码弹窗 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">修改密码</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">原密码</label>
                <input
                  type="password"
                  name="oldPassword"
                  value={passwordForm.oldPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="请输入原密码"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="请输入新密码（至少6位）"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="请再次输入新密码"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                  setMessage({ type: '', text: '' });
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {changingPassword ? '修改中...' : '确认修改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
