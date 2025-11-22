<template>
  <div class="user-management">
    <div class="content">
      <div class="sidebar">
        <div 
          v-for="(item, index) in menuItems" 
          :key="index"
          class="menu-item"
          :class="{ active: activeTab === item.id }"
          @click="activeTab = item.id"
        >
          <i :class="item.icon"></i>
          <span>{{ item.title }}</span>
        </div>
      </div>
      
      <div class="main-content">
        <!-- 个人信息 -->
        <div v-if="activeTab === 'profile'" class="profile-section">
          <h2>个人信息维护</h2>
          <div v-if="loading" class="loading">加载中...</div>
          <div v-else class="form-container">
            <div class="form-group">
              <label>用户名</label>
              <input type="text" v-model="userInfo.username">
            </div>
            <div class="form-group">
              <label>姓名</label>
              <input type="text" v-model="userInfo.name" disabled>
              <span class="field-note">姓名不可修改</span>
            </div>
            <div class="form-group">
              <label>邮箱</label>
              <input type="email" v-model="userInfo.email">
            </div>
            <div class="form-group">
              <label>手机号码</label>
              <input type="tel" v-model="userInfo.phone">
            </div>
            <div class="form-group">
              <label>角色</label>
              <input type="text" v-model="userInfo.role" disabled>
              <span class="field-note">角色不可修改</span>
            </div>
            <!-- <div class="form-group">
              <label>用户ID</label>
              <input type="text" v-model="userInfo.id" disabled>
              <span class="field-note">系统生成，不可修改</span>
            </div> -->
            <div class="form-group">
              <label>注册时间</label>
              <input type="text" :value="formatDate(userInfo.created_time)" disabled>
            </div>
            <div class="form-group">
              <label>最后登录时间</label>
              <input type="text" :value="formatDate(userInfo.last_login)" disabled>
            </div>
            <div class="form-group">
              <label>账户状态</label>
              <input type="text" :value="userInfo.is_active ? '活跃' : '禁用'" disabled>
            </div>
            <div class="form-actions">
              <button class="save-btn" @click="saveProfile" :disabled="saving">
                {{ saving ? '保存中...' : '保存更改' }}
              </button>
              <button class="cancel-btn" @click="resetForm" :disabled="saving">重置</button>
            </div>
          </div>
        </div>
        
        <!-- 账户安全 -->
        <div v-if="activeTab === 'security'" class="security-section">
          <h2>账户安全</h2>
          <div class="security-options">
            <div class="option">
              <div class="option-info">
                <h3>修改密码</h3>
                <p>定期更改密码以确保账户安全</p>
              </div>
              <button class="action-btn" @click="showChangePassword = true">修改</button>
            </div>
          </div>
          
          <!-- 修改密码弹窗 -->
          <div v-if="showChangePassword" class="modal">
            <div class="modal-content">
              <h3>修改密码</h3>
              <div class="form-group">
                <label>当前密码</label>
                <input type="password" v-model="password.current">
              </div>
              <div class="form-group">
                <label>新密码</label>
                <input type="password" v-model="password.new">
              </div>
              <div class="form-group">
                <label>确认新密码</label>
                <input type="password" v-model="password.confirm">
              </div>
              <div class="modal-actions">
                <button class="cancel-btn" @click="cancelChangePassword">取消</button>
                <button class="confirm-btn" @click="changePassword" :disabled="changingPassword">
                  {{ changingPassword ? '修改中...' : '确认' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getUserInfo, updateUserInfo, changePassword as apiChangePassword } from '@/api/user';

// 定义用户信息接口
interface UserInfo {
  id: string;
  username: string;
  role: string;
  name: string;
  email: string;
  phone: string;
  created_time: string;
  updated_time: string;
  is_active: boolean;
  last_login: string | null;
}

// 用户数据
const userInfo = ref<UserInfo>({
  id: '',
  username: '',
  role: '',
  name: '',
  email: '',
  phone: '',
  created_time: '',
  updated_time: '',
  is_active: false,
  last_login: null
});

// 原始用户数据（用于重置）
const originalUserInfo = ref<UserInfo>({ ...userInfo.value });

// 菜单项
const menuItems = ref([
  { id: 'profile', title: '个人信息', icon: 'fas fa-user' },
  { id: 'security', title: '账户安全', icon: 'fas fa-shield-alt' },
]);

// 状态变量
const activeTab = ref('profile');
const loading = ref(false);
const saving = ref(false);
const showChangePassword = ref(false);
const changingPassword = ref(false);

// 修改密码相关状态
const password = ref({
  current: '',
  new: '',
  confirm: ''
});

// 从localStorage获取session_token
const getSessionToken = () => {
  return localStorage.getItem('session_token');
};

// 从localStorage获取用户信息（作为备用）
const getStoredUserInfo = () => {
  try {
    const userInfoStr = localStorage.getItem('user_info');
    if (userInfoStr) {
      return JSON.parse(userInfoStr);
    }
  } catch (error) {
    console.error('解析存储的用户信息失败:', error);
  }
  return null;
};

// 加载用户信息
const loadUserInfo = async () => {
  loading.value = true;
  try {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      throw new Error('未找到session token');
    }

    const response = await getUserInfo(sessionToken);
    if (response.success && response.data) {
      userInfo.value = { ...response.data };
      originalUserInfo.value = { ...response.data };
    } else {
      throw new Error(response.message || '获取用户信息失败');
    }
  } catch (error) {
    console.error('加载用户信息失败:', error);
    // 如果API调用失败，尝试使用本地存储的数据
    const storedInfo = getStoredUserInfo();
    if (storedInfo) {
      userInfo.value = { ...storedInfo };
      originalUserInfo.value = { ...storedInfo };
    } else {
      alert('加载用户信息失败，请重新登录');
    }
  } finally {
    loading.value = false;
  }
};

// 保存个人信息
const saveProfile = async () => {
  if (saving.value) return;
  
  // 基本验证
  if (!userInfo.value.name.trim()) {
    alert('请输入姓名');
    return;
  }
  
  if (!userInfo.value.email.trim()) {
    alert('请输入邮箱');
    return;
  }
  
  if (!userInfo.value.phone.trim()) {
    alert('请输入手机号码');
    return;
  }

  saving.value = true;
  try {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      throw new Error('未找到session token');
    }

    // 准备更新数据（只发送可修改的字段）
    const updateData = {
      name: userInfo.value.name,
      email: userInfo.value.email,
      phone: userInfo.value.phone
    };

    const response = await updateUserInfo(sessionToken, updateData);
    if (response.success) {
      // 更新本地存储的用户信息
      const updatedUserInfo = { ...userInfo.value };
      localStorage.setItem('user_info', JSON.stringify(updatedUserInfo));
      originalUserInfo.value = { ...updatedUserInfo };
      alert('个人信息更新成功');
    } else {
      throw new Error(response.message || '更新失败');
    }
  } catch (error) {
    console.error('保存个人信息失败:', error);
    alert('保存失败: ' + error.message);
  } finally {
    saving.value = false;
  }
};

// 重置表单
const resetForm = () => {
  userInfo.value = { ...originalUserInfo.value };
};

// 修改密码
const changePassword = async () => {
  if (changingPassword.value) return;
  
  // 验证
  if (!password.value.current) {
    alert('请输入当前密码');
    return;
  }
  
  if (!password.value.new) {
    alert('请输入新密码');
    return;
  }
  
  if (password.value.new !== password.value.confirm) {
    alert('两次输入的密码不一致');
    return;
  }
  
  if (password.value.new.length < 6) {
    alert('新密码长度不能少于6位');
    return;
  }

  changingPassword.value = true;
  try {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      throw new Error('未找到session token');
    }

    const response = await apiChangePassword(sessionToken, {
      current_password: password.value.current,
      new_password: password.value.new
    });

    if (response.success) {
      alert('密码修改成功');
      cancelChangePassword();
    } else {
      throw new Error(response.message || '密码修改失败');
    }
  } catch (error) {
    console.error('修改密码失败:', error);
    alert('修改密码失败: ' + error.message);
  } finally {
    changingPassword.value = false;
  }
};

// 取消修改密码
const cancelChangePassword = () => {
  showChangePassword.value = false;
  password.value = { current: '', new: '', confirm: '' };
};

// 格式化日期显示
const formatDate = (dateString) => {
  if (!dateString) return '暂无';
  try {
    return new Date(dateString).toLocaleString('zh-CN');
  } catch (error) {
    return dateString;
  }
};

// 组件挂载时加载用户信息
onMounted(() => {
  loadUserInfo();
});
</script>

<style scoped>
.user-management {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f8f9fa;
  min-height: 100vh;
}

.content {
  display: flex;
  margin-top: 30px;
  gap: 30px;
}

.sidebar {
  width: 250px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 20px;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.menu-item:hover {
  background-color: #f0f5ff;
}

.menu-item.active {
  background-color: #e6f7ff;
  color: #1890ff;
  font-weight: 500;
}

.menu-item i {
  margin-right: 10px;
  font-size: 18px;
}

.main-content {
  flex: 1;
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 30px;
}

.profile-section h2, .security-section h2 {
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.form-container {
  max-width: 600px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input, .form-group textarea {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 16px;
  transition: all 0.3s;
}

.form-group input:focus, .form-group textarea:focus {
  outline: none;
  border-color: #40a9ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.form-group input:disabled {
  background-color: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.field-note {
  display: block;
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

.form-actions {
  display: flex;
  gap: 15px;
  margin-top: 30px;
}

.save-btn {
  background-color: #1890ff;
  color: white;
  border: none;
  padding: 12px 25px;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.save-btn:hover:not(:disabled) {
  background-color: #40a9ff;
}

.save-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.cancel-btn {
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  padding: 12px 25px;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.cancel-btn:hover:not(:disabled) {
  border-color: #40a9ff;
  color: #1890ff;
}

.security-options {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
}

.option-info h3 {
  margin-bottom: 5px;
}

.option-info p {
  color: #666;
  font-size: 14px;
}

.action-btn {
  background: white;
  border: 1px solid #d9d9d9;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover {
  border-color: #40a9ff;
  color: #1890ff;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 10px;
  width: 400px;
}

.modal h3 {
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.modal-actions .cancel-btn {
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.modal-actions .confirm-btn {
  background: #1890ff;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.modal-actions .confirm-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>