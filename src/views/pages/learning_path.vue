<template>
  <div class="learning-path-page">
    <h1>学习路径推荐</h1>

    <div v-if="isLoading" class="loading">
      正在为你生成学习路径...
    </div>

    <div v-if="error" class="error">
      加载路径失败: {{ error }}
    </div>

    <div v-if="learningPath && !isLoading">
      
      <div v-if="learningPath.length === 0" class="placeholder">
        暂未找到推荐的学习路径。
      </div>

      <ol v-else class="path-list">
        
        <li 
          v-for="step in learningPath" 
          :key="step.concept_id" 
          class="path-item"
        >
          <div class="step-header">
            <span class="step-concept-name">{{ step.concept_name }}</span>
            <div class="step-meta">
              <span class="status" :class="step.status">
                {{ getStatusText(step.status) }}
              </span>
              <span v-if="step.progress > 0" class="progress">
                ( {{ step.progress }}% )
              </span>
            </div>
          </div>
          <ul class="resource-list">
            <li
              v-for="resource in step.resources"
              :key="resource.id"
              class="resource-item"
            >
              <span 
                class="resource-icon" 
                :data-type="resource.resource_type"
              >
                {{ resource.resource_type === 'pdf' ? 'PDF' : 'PPT' }}
              </span>
              
              <div class="resource-info">
                <span class="resource-title">
                  {{ resource.title || resource.filename }}
                </span>
                <span 
                  v-if="resource.title && resource.filename" 
                  class="resource-filename"
                >
                  ({{ resource.filename }})
                </span>
              </div>
            </li>
          </ul>
        </li>
      </ol>
    </div>

  </div>
</template>

<script setup lang='ts'>
import { ref, onMounted } from 'vue';

// --- 状态定义 ---
const BASE_URL = 'http://patrickshao.site:8000';
const learningPath = ref(null); // 将存储 data.recommended_path 数组
const isLoading = ref(false);
const error = ref(null);
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

// 从localStorage获取用户信息
const getUserInfoFromStorage = (): UserInfo | null => {
    try {
        const userInfoStr = localStorage.getItem('user_info')
        if (userInfoStr) {
            return JSON.parse(userInfoStr) as UserInfo
        }
    } catch (error) {
        console.error('解析用户信息失败:', error)
    }
    return null
}

// --- [待替换] 关键假设：Student ID ---
// 
// 仍然使用硬编码的 ID 'stu_001'。
// 在实际应用中，你 *必须* 替换掉它。
//
const userInfo = getUserInfoFromStorage();
const STUDENT_ID_FOR_DEMO = userInfo.username || 'stu_001'; 

/**
 * 3. 获取学习路径 (API 3)
 */
async function fetchLearningPath(studentId) {
  if (!studentId) {
    error.value = "没有提供学生 ID。";
    return;
  }

  isLoading.value = true;
  error.value = null;
  learningPath.value = null;
  
  // [已确认] 使用 Query 参数
  const queryParams = new URLSearchParams({
    num_nodes: '5', 
    algorithm: 'pagerank'
  });

  const url = `${BASE_URL}/knowledge-graph/students/${studentId}/learning-path?${queryParams.toString()}`;
  console.log(`开始获取 ID 为 ${studentId} 的学习路径 (URL: ${url})...`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP 错误! 状态: ${response.status}`);
    }
    const data = await response.json();
    console.log('学习路径响应数据:', data);
    
    // --- [已更新] 根据你的 JSON 示例 ---
    // 
    // 我的假设 'data.path' 是错的
    // 正确的路径是 'data.recommended_path'
    //
    if (data && data.recommended_path) {
      learningPath.value = data.recommended_path;
    } else {
      learningPath.value = []; //  API 正常返回，但无路径数据
    }

  } catch (err) {
    console.error('获取学习路径失败:', err);
    error.value = err.message;
  } finally {
    isLoading.value = false;
  }
}

// (辅助函数) 转换 status 文本
function getStatusText(status) {
  if (status === 'not_started') return '未开始';
  if (status === 'in_progress') return '进行中';
  if (status === 'completed') return '已完成';
  return status; // 返回原始值
}

// (生命周期) 组件挂载时，立即获取该学生的学习路径
onMounted(() => {
  fetchLearningPath(STUDENT_ID_FOR_DEMO);
});

</script>

<style scoped>
.learning-path-page {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

/* --- 状态提示 (复用) --- */
.loading, .placeholder {
  color: #777;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  font-style: italic;
  font-size: 1.1em;
}
.error {
  color: #dc3545;
  font-weight: bold;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: 15px;
  border-radius: 8px;
}

/* --- [已更新] 路径列表样式 --- */
.path-list {
  list-style: none; /* 移除默认的 1. 2. 3. */
  padding-left: 30px; 
  position: relative;
}

/* [已更新] 绘制路径竖线 */
.path-list::before {
  content: '';
  position: absolute;
  left: 10px; 
  top: 15px; /* 调整起始位置 */
  bottom: 15px;
  width: 4px;
  background-color: #e9ecef; 
  border-radius: 2px;
}

.path-item {
  position: relative; 
  padding: 10px 0 10px 20px;
  /* 增加底部间距，让步骤之间更清晰 */
  margin-bottom: 20px; 
}

/* [已更新] 绘制路径圆点 */
.path-item::before {
  content: '';
  position: absolute;
  left: -20px; /* (10px + 2px) - 20px(padding-left) - 8px = -16px */
  top: 15px; /* 与 step-header 标题对齐 */
  width: 16px;
  height: 16px;
  background-color: #007bff; 
  border-radius: 50%;
  border: 3px solid #fff; 
  box-shadow: 0 0 0 1px #007bff;
  z-index: 1; /* 确保在竖线之上 */
}

/* [新] 步骤标题区域 */
.step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px; /* 标题和资源列表的间距 */
}

.step-concept-name {
  font-weight: bold;
  font-size: 1.3em;
  color: #333;
}

.step-meta {
  display: flex;
  align-items: center;
  font-size: 0.9em;
}
.status {
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 5px;
}
.status.not_started {
  color: #6c757d;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
}
.status.in_progress {
  color: #007bff;
  background-color: #e6f2ff;
}
.progress {
  color: #28a745;
  font-weight: bold;
}

/* --- [新] 嵌套的资源列表 --- */
.resource-list {
  list-style: none;
  padding: 0;
  margin: 10px 0 0 0; /* 资源列表与标题的间距 */
  border-left: 3px solid #f0f0f0; /* 资源列表的左侧缩进线 */
  padding-left: 15px;
}

.resource-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px dashed #eee;
}
.resource-item:last-child {
  border-bottom: none;
}

/* [新] 资源图标 (用 data-type 区分颜色) */
.resource-icon {
  flex-shrink: 0; /* 防止图标被压缩 */
  width: 40px;
  height: 40px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8em;
  font-weight: bold;
  color: #fff;
  margin-right: 12px;
}
.resource-icon[data-type="pdf"] {
  background-color: #dc3545; /* PDF 红色 */
}
.resource-icon[data-type="ppt"] {
  background-color: #fd7e14; /* PPT 橙色 */
}

/* [新] 资源信息 (标题和文件名) */
.resource-info {
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 防止长文件名撑破布局 */
}
.resource-title {
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis; /* ... */
}
.resource-filename {
  font-size: 0.85em;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis; /* ... */
}
</style>