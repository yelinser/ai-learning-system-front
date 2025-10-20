<template>
  <div class="notification-center">
    <div class="header">
      <h1>通知中心</h1>
      <div class="actions">
        <button class="action-btn" @click="markAllAsRead">
          <i class="fas fa-check-circle"></i> 全部标记为已读
        </button>
        <button class="action-btn" @click="showSettings = true">
          <i class="fas fa-cog"></i> 通知设置
        </button>
      </div>
    </div>
    
    <div class="tabs">
      <div 
        v-for="(tab, index) in tabs" 
        :key="index"
        class="tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.title }}
        <span v-if="tab.unread > 0" class="badge">{{ tab.unread }}</span>
      </div>
    </div>
    
    <div class="notifications-container">
      <!-- 系统消息 -->
      <div v-if="activeTab === 'system'" class="notifications-list">
        <div 
          v-for="(notification, index) in systemNotifications" 
          :key="index"
          class="notification-item"
          :class="{ unread: !notification.read }"
        >
          <div class="icon">
            <i class="fas fa-bell"></i>
          </div>
          <div class="content">
            <div class="title">{{ notification.title }}</div>
            <div class="message">{{ notification.message }}</div>
            <div class="time">{{ formatTime(notification.timestamp) }}</div>
          </div>
          <div class="actions">
            <button 
              v-if="!notification.read" 
              class="mark-read-btn"
              @click="markAsRead(notification.id)"
            >
              标记为已读
            </button>
            <button class="delete-btn" @click="deleteNotification(notification.id)">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 学习提醒 -->
      <div v-if="activeTab === 'reminders'" class="notifications-list">
        <div 
          v-for="(reminder, index) in studyReminders" 
          :key="index"
          class="notification-item"
          :class="{ unread: !reminder.read }"
        >
          <div class="icon">
            <i class="fas fa-book"></i>
          </div>
          <div class="content">
            <div class="title">{{ reminder.title }}</div>
            <div class="message">{{ reminder.message }}</div>
            <div class="time">{{ formatTime(reminder.timestamp) }}</div>
          </div>
          <div class="actions">
            <button 
              v-if="!reminder.read" 
              class="mark-read-btn"
              @click="markAsRead(reminder.id)"
            >
              标记为已读
            </button>
            <button class="delete-btn" @click="deleteNotification(reminder.id)">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 交互反馈 -->
      <div v-if="activeTab === 'interactions'" class="notifications-list">
        <div 
          v-for="(interaction, index) in interactionFeedbacks" 
          :key="index"
          class="notification-item"
          :class="{ unread: !interaction.read }"
        >
          <div class="icon">
            <i class="fas fa-comment"></i>
          </div>
          <div class="content">
            <div class="title">{{ interaction.title }}</div>
            <div class="message">{{ interaction.message }}</div>
            <div class="time">{{ formatTime(interaction.timestamp) }}</div>
          </div>
          <div class="actions">
            <button 
              v-if="!interaction.read" 
              class="mark-read-btn"
              @click="markAsRead(interaction.id)"
            >
              标记为已读
            </button>
            <button class="delete-btn" @click="deleteNotification(interaction.id)">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 通知设置弹窗 -->
    <div v-if="showSettings" class="modal">
      <div class="modal-content">
        <h2>通知设置</h2>
        
        <div class="setting-group">
          <h3>通知类型</h3>
          <div class="setting-item">
            <div class="setting-info">
              <h4>系统消息</h4>
              <p>接收系统维护、更新等重要通知</p>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" v-model="settings.systemEnabled">
              <span class="slider"></span>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <h4>学习提醒</h4>
              <p>接收课程提醒、作业截止等学习相关通知</p>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" v-model="settings.remindersEnabled">
              <span class="slider"></span>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <h4>交互反馈</h4>
              <p>接收评论回复、点赞等社交互动通知</p>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" v-model="settings.interactionsEnabled">
              <span class="slider"></span>
            </div>
          </div>
        </div>
        
        <div class="setting-group">
          <h3>通知方式</h3>
          <div class="setting-item">
            <div class="setting-info">
              <h4>站内通知</h4>
              <p>在网站内显示通知消息</p>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" v-model="settings.inAppEnabled">
              <span class="slider"></span>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <h4>邮件通知</h4>
              <p>通过电子邮件接收通知</p>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" v-model="settings.emailEnabled">
              <span class="slider"></span>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <h4>手机推送</h4>
              <p>通过手机APP接收推送通知</p>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" v-model="settings.pushEnabled">
              <span class="slider"></span>
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="cancel-btn" @click="showSettings = false">取消</button>
          <button class="save-btn" @click="saveSettings">保存设置</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

// 通知标签
const tabs = ref([
  { id: 'system', title: '系统消息', unread: 3 },
  { id: 'reminders', title: '学习提醒', unread: 2 },
  { id: 'interactions', title: '交互反馈', unread: 5 }
]);

// 活动标签
const activeTab = ref('system');

// 通知设置弹窗状态
const showSettings = ref(false);

// 通知设置
const settings = ref({
  systemEnabled: true,
  remindersEnabled: true,
  interactionsEnabled: true,
  inAppEnabled: true,
  emailEnabled: true,
  pushEnabled: false
});

// 系统通知数据
const systemNotifications = ref([
  {
    id: 1,
    title: '系统维护通知',
    message: '系统将于本周六凌晨2点至4点进行维护升级',
    timestamp: new Date(Date.now() - 3600000),
    read: false
  },
  {
    id: 2,
    title: '新功能上线',
    message: '学习路径规划功能已上线，欢迎体验',
    timestamp: new Date(Date.now() - 86400000),
    read: false
  },
  {
    id: 3,
    title: '安全提醒',
    message: '请及时更新您的密码以确保账户安全',
    timestamp: new Date(Date.now() - 172800000),
    read: true
  },
  {
    id: 4,
    title: '版本更新',
    message: 'V2.3.0版本已发布，修复了多个已知问题',
    timestamp: new Date(Date.now() - 259200000),
    read: true
  }
]);

// 学习提醒数据
const studyReminders = ref([
  {
    id: 5,
    title: '作业提醒',
    message: '《大数据分析》课程作业将于3天后截止',
    timestamp: new Date(Date.now() - 7200000),
    read: false
  },
  {
    id: 6,
    title: '课程提醒',
    message: '明天上午10点有《数据可视化》课程',
    timestamp: new Date(Date.now() - 43200000),
    read: false
  },
  {
    id: 7,
    title: '测验提醒',
    message: '《Spark原理与应用》章节测验即将开始',
    timestamp: new Date(Date.now() - 86400000),
    read: true
  }
]);

// 交互反馈数据
const interactionFeedbacks = ref([
  {
    id: 8,
    title: '新评论',
    message: '张三回复了你在"MapReduce设计模式"中的提问',
    timestamp: new Date(Date.now() - 1800000),
    read: false
  },
  {
    id: 9,
    title: '点赞通知',
    message: '李四点赞了你的"Hive优化技巧"分享',
    timestamp: new Date(Date.now() - 5400000),
    read: false
  },
  {
    id: 10,
    title: '@提及',
    message: '王五在讨论中@了你',
    timestamp: new Date(Date.now() - 10800000),
    read: false
  },
  {
    id: 11,
    title: '新粉丝',
    message: '赵六关注了你',
    timestamp: new Date(Date.now() - 172800000),
    read: false
  },
  {
    id: 12,
    title: '回复通知',
    message: '钱七回复了你的评论',
    timestamp: new Date(Date.now() - 259200000),
    read: true
  }
]);

// 格式化时间
const formatTime = (date) => {
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
};

// 标记为已读
const markAsRead = (id) => {
  const allNotifications = [...systemNotifications.value, ...studyReminders.value, ...interactionFeedbacks.value];
  const notification = allNotifications.find(n => n.id === id);
  
  if (notification) {
    notification.read = true;
    updateUnreadCounts();
  }
};

// 标记全部为已读
const markAllAsRead = () => {
  const allNotifications = [...systemNotifications.value, ...studyReminders.value, ...interactionFeedbacks.value];
  
  allNotifications.forEach(notification => {
    notification.read = true;
  });
  
  updateUnreadCounts();
};

// 删除通知
const deleteNotification = (id) => {
  systemNotifications.value = systemNotifications.value.filter(n => n.id !== id);
  studyReminders.value = studyReminders.value.filter(n => n.id !== id);
  interactionFeedbacks.value = interactionFeedbacks.value.filter(n => n.id !== id);
  updateUnreadCounts();
};

// 更新未读计数
const updateUnreadCounts = () => {
  tabs.value[0].unread = systemNotifications.value.filter(n => !n.read).length;
  tabs.value[1].unread = studyReminders.value.filter(n => !n.read).length;
  tabs.value[2].unread = interactionFeedbacks.value.filter(n => !n.read).length;
};

// 保存设置
const saveSettings = () => {
  console.log('保存通知设置:', settings.value);
  // 这里应该调用API保存设置
  alert('通知设置已保存');
  showSettings.value = false;
};

// 初始化未读计数
updateUnreadCounts();
</script>

<style scoped>
.notification-center {
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

.actions {
  display: flex;
  gap: 15px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
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

.tabs {
  display: flex;
  margin-top: 30px;
  border-bottom: 1px solid #e0e0e0;
}

.tab {
  position: relative;
  padding: 15px 25px;
  cursor: pointer;
  font-weight: 500;
  color: #666;
  transition: all 0.3s;
}

.tab:hover {
  color: #1890ff;
}

.tab.active {
  color: #1890ff;
  border-bottom: 2px solid #1890ff;
}

.badge {
  position: absolute;
  top: 5px;
  right: 5px;
  background: #ff4d4f;
  color: white;
  font-size: 12px;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
}

.notifications-container {
  margin-top: 20px;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.notification-item {
  display: flex;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
}

.notification-item.unread {
  background: #f0f7ff;
  border-left: 3px solid #1890ff;
}

.notification-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #e6f7ff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  color: #1890ff;
  font-size: 20px;
}

.content {
  flex: 1;
}

.title {
  font-weight: 600;
  margin-bottom: 5px;
}

.message {
  color: #666;
  margin-bottom: 8px;
  line-height: 1.5;
}

.time {
  color: #999;
  font-size: 14px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mark-read-btn {
  background: white;
  border: 1px solid #d9d9d9;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.mark-read-btn:hover {
  border-color: #40a9ff;
  color: #1890ff;
}

.delete-btn {
  background: white;
  border: 1px solid #d9d9d9;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.delete-btn:hover {
  background: #fff1f0;
  border-color: #ffa39e;
  color: #f5222d;
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
  width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal h2 {
  margin-bottom: 25px;
}

.setting-group {
  margin-bottom: 30px;
}

.setting-group h3 {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid #f5f5f5;
}

.setting-info h4 {
  margin-bottom: 5px;
}

.setting-info p {
  color: #666;
  font-size: 14px;
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

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 30px;
}

.cancel-btn {
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.save-btn {
  background: #1890ff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}
</style>
