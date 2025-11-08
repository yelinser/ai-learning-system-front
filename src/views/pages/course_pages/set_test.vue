<template>
  <div class="quiz-container">
    <div class="page-header">
      <h1 class="page-title">测验与作业</h1>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>正在加载资源列表...</p>
    </div>
    
    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <p class="error-message">{{ error }}</p>
      <button @click="loadResources" class="retry-btn">重试</button>
    </div>
    
    <!-- 资源列表 -->
    <div v-else class="quiz-list">
      <div v-for="resource in resources" :key="resource.id" class="quiz-item">
        <div class="quiz-info">
          <h3 class="quiz-title">{{ resource.metadata?.title || resource.filename }}</h3>
          <p class="resource-info">
            <span>类型: {{ getResourceTypeText(resource.resource_type) }}</span>
            <span>大小: {{ formatFileSize(resource.size) }}</span>
            <span>上传时间: {{ formatDate(resource.upload_time) }}</span>
          </p>
          <p v-if="resource.metadata?.author" class="author">作者: {{ resource.metadata.author }}</p>
          <p v-if="resource.metadata?.course" class="course">课程: {{ resource.metadata.course }}</p>
          <p v-if="resource.metadata?.chapter" class="chapter">章节: {{ resource.metadata.chapter }}</p>
          <p class="description">点击开始测验，系统将从该资源中随机生成题目</p>
        </div>
        
        <div class="quiz-action">
          <button class="go-quiz-btn" @click="goToQuiz(resource)">开始测验</button>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div v-if="resources.length === 0" class="empty-state">
        <p>暂无可用资源</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getResources, getResourceTypeText, formatFileSize, formatDate } from '@/api/testBank';
import type { Resource } from '@/api/testBank';

// 响应式数据
const resources = ref<Resource[]>([]);
const loading = ref(false);
const error = ref('');

const router = useRouter();

// 加载资源列表
const loadResources = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    const data = await getResources();
    resources.value = data;
  } catch (err: any) {
    console.error('加载资源失败:', err);
    error.value = err.message || '加载资源列表失败，请稍后重试';
  } finally {
    loading.value = false;
  }
};

// 前往测验页面
const goToQuiz = (resource: Resource) => {
  router.push({
    name: 'quiz',
    params: { 
      resourceId: resource.id 
    },
    query: {
      title: resource.metadata?.title || resource.filename
    }
  });
};

// 组件挂载时加载资源
onMounted(() => {
  loadResources();
});
</script>

<style scoped>
/* 样式保持不变... */
.quiz-container {
  max-width: 1000px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.page-header {
  padding: 20px 24px;
  border-bottom: 1px solid #eaeaea;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.loading-container, .error-container {
  padding: 40px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  color: #e74c3c;
  margin-bottom: 20px;
  font-size: 16px;
}

.retry-btn {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.retry-btn:hover {
  background-color: #2980b9;
}

.quiz-list {
  padding: 20px 24px;
}

.quiz-item {
  display: flex;
  justify-content: space-between;
  padding: 20px 0;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.quiz-item:hover {
  background-color: #f9f9f9;
}

.quiz-item:last-child {
  border-bottom: none;
}

.quiz-info {
  flex: 1;
}

.quiz-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #2c3e50;
}

.resource-info {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #7f8c8d;
  margin-bottom: 8px;
}

.author, .course, .chapter {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.description {
  font-size: 13px;
  color: #95a5a6;
  margin-top: 8px;
  font-style: italic;
}

.quiz-action {
  display: flex;
  align-items: center;
}

.go-quiz-btn {
  background-color: #52c41a;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.go-quiz-btn:hover {
  background-color: #73d13d;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #7f8c8d;
  font-size: 16px;
}
</style>