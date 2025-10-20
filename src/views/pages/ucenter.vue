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
          <div class="form-container">
            <div class="form-group">
              <label>姓名</label>
              <input type="text" v-model="user.name">
            </div>
            <div class="form-group">
              <label>邮箱</label>
              <input type="email" v-model="user.email">
            </div>
            <div class="form-group">
              <label>手机号码</label>
              <input type="tel" v-model="user.phone">
            </div>
            <div class="form-group">
              <label>头像</label>
              <div class="avatar-upload">
                <img :src="user.avatar" alt="当前头像">
                <input type="file" accept="image/*" @change="handleAvatarUpload">
              </div>
            </div>
            <div class="form-group">
              <label>个人简介</label>
              <textarea v-model="user.bio"></textarea>
            </div>
            <button class="save-btn" @click="saveProfile">保存更改</button>
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
                <button class="cancel-btn" @click="showChangePassword = false">取消</button>
                <button class="confirm-btn" @click="changePassword">确认</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// 用户数据
const user = ref({
  id: 1,
  name: '张三',
  email: 'zhangsan@example.com',
  phone: '13800138000',
  avatar: '@/assets/img/img.jpg',
  bio: '大数据分析专业学生，热爱编程和数据分析',
  twoFactorEnabled: false
});

// 菜单项
const menuItems = ref([
  { id: 'profile', title: '个人信息', icon: 'fas fa-user' },
  { id: 'security', title: '账户安全', icon: 'fas fa-shield-alt' },
]);

// 活动标签
const activeTab = ref('profile');

// 修改密码相关状态
const showChangePassword = ref(false);
const password = ref({
  current: '',
  new: '',
  confirm: ''
});

// 头像上传处理
const handleAvatarUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      user.value.avatar = e.target.result;
    };
    reader.readAsDataURL(file);
  }
};

// 保存个人信息
const saveProfile = () => {
  console.log('保存个人信息:', user.value);
  // 这里应该调用API保存数据
  alert('个人信息已保存');
};

// 修改密码
const changePassword = () => {
  if (password.value.new !== password.value.confirm) {
    alert('两次输入的密码不一致');
    return;
  }
  
  console.log('修改密码:', password.value);
  // 这里应该调用API修改密码
  alert('密码修改成功');
  showChangePassword.value = false;
  password.value = { current: '', new: '', confirm: '' };
};
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

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid #e0e0e0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.avatar img {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
}

.name {
  font-size: 18px;
  font-weight: 600;
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

.form-group textarea {
  height: 120px;
  resize: vertical;
}

.avatar-upload {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar-upload img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
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

.save-btn:hover {
  background-color: #40a9ff;
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

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #1890ff;
}

input:checked + .slider:before {
  transform: translateX(26px);
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

.cancel-btn {
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.confirm-btn {
  background: #1890ff;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}
</style>
