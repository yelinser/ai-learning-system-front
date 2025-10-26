<template>
  <div class="video-display-container">
    <!-- 返回按钮 -->
    <div class="back-button" @click="goBack">
      <span class="back-icon">←</span>
      <span>返回资源列表</span>
    </div>
    
    <div class="main-content">
      <!-- 视频播放区域 -->
      <div class="video-container">
        <div class="video-player">
          <video ref="videoPlayer" controls>
            <source :src="currentResource.videoUrl" type="video/mp4">
            您的浏览器不支持视频播放。
          </video>
        </div>
        <div class="video-info">
          <h2>{{ currentResource.title }}</h2>
          <p>{{ currentResource.description }}</p>
          <div class="meta-info">
            <span>时长: {{ formatDuration(currentResource.duration) }}</span>
            <span>上传日期: {{ formatDate(currentResource.date) }}</span>
          </div>
        </div>
      </div>
      
      <!-- 资源列表区域 -->
      <div class="resource-list">
        <h3>本章节资源</h3>
        <div 
          v-for="resource in chapterResources" 
          :key="resource.id"
          class="resource-item"
          :class="{ active: resource.id === currentResource.id }"
          @click="selectResource(resource)"
        >
          <div class="resource-icon">
            <span v-if="resource.type === 'video'">📹</span>
            <span v-else-if="resource.type === 'document'">📄</span>
            <span v-else-if="resource.type === 'image'">🖼️</span>
            <span v-else>📁</span>
          </div>
          <div class="resource-info">
            <h4>{{ resource.title }}</h4>
            <p>{{ resource.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const videoPlayer = ref(null);

// 当前播放的资源
const currentResource = ref({
  id: null,
  title: '',
  description: '',
  type: '',
  duration: 0,
  date: '',
  videoUrl: ''
});

// 当前章节的所有资源
const chapterResources = ref([]);

// 模拟数据 - 实际应用中应从API获取
const allChapters = [
  {
    id: 1,
    title: "第一章：基础知识",
    resources: [
      {
        id: 101,
        title: "编程基础视频",
        type: "video",
        description: "编程基础概念讲解",
        duration: 1200,
        date: "2023-10-15",
        videoUrl: "https://example.com/videos/basic-programming.mp4"
      },
      {
        id: 102,
        title: "算法图解",
        type: "image",
        description: "常用算法可视化图解",
        duration: null,
        date: "2023-10-18",
        imageUrl: "https://example.com/images/algorithms.png"
      },
      {
        id: 103,
        title: "数据结构文档",
        type: "document",
        description: "数据结构详细说明",
        duration: null,
        date: "2023-10-20",
        documentUrl: "https://example.com/documents/data-structures.pdf"
      }
    ]
  },
  {
    id: 2,
    title: "第二章：进阶应用",
    resources: [
      {
        id: 201,
        title: "项目实战文档",
        type: "document",
        description: "完整项目开发指南",
        duration: null,
        date: "2023-10-22",
        documentUrl: "https://example.com/documents/project-guide.pdf"
      },
      {
        id: 202,
        title: "AI应用案例",
        type: "video",
        description: "人工智能实际应用场景分析",
        duration: 1800,
        date: "2023-10-25",
        videoUrl: "https://example.com/videos/ai-applications.mp4"
      },
      {
        id: 203,
        title: "深度学习图解",
        type: "image",
        description: "神经网络结构可视化",
        duration: null,
        date: "2023-10-28",
        imageUrl: "https://example.com/images/deep-learning.png"
      }
    ]
  }
];

// 初始化资源数据
const initResourceData = () => {
  const resourceId = parseInt(route.params.id);
  const chapterId = parseInt(route.params.chapterId);
  
  // 查找当前章节
  const chapter = allChapters.find(c => c.id === chapterId);
  if (!chapter) return;
  
  // 设置当前章节的所有资源
  chapterResources.value = chapter.resources;
  
  // 设置当前资源
  const resource = chapter.resources.find(r => r.id === resourceId);
  if (resource) {
    currentResource.value = resource;
  } else if (chapter.resources.length > 0) {
    // 如果没有找到指定资源，默认显示第一个资源
    currentResource.value = chapter.resources[0];
  }
};

// 选择资源
const selectResource = (resource) => {
  if (resource.id === currentResource.value.id) return;
  
  // 更新当前资源
  currentResource.value = resource;
  
  // 更新URL
  router.push({
    name: 'video-display',
    params: { 
      chapterId: route.params.chapterId, 
      id: resource.id 
    }
  });
};

// 返回资源列表页面
const goBack = () => {
  router.push({ name: 'course_material' });
};

// 格式化时长（秒转换为分钟）
const formatDuration = (seconds) => {
  if (!seconds) return "";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}分钟`;
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return "";
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

// 监听路由变化
watch(() => route.params.id, (newId) => {
  if (newId) {
    const resourceId = parseInt(newId);
    const resource = chapterResources.value.find(r => r.id === resourceId);
    if (resource) {
      currentResource.value = resource;
      
      // 如果切换的是视频资源，重新加载视频
      if (resource.type === 'video' && videoPlayer.value) {
        videoPlayer.value.load();
      }
    }
  }
});

// 组件挂载时初始化数据
onMounted(() => {
  initResourceData();
});
</script>

<style scoped>
.video-display-container {
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.back-button {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-bottom: 20px;
  padding: 10px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.back-button:hover {
  background-color: #f0f0f0;
}

.back-icon {
  font-size: 1.5rem;
  margin-right: 8px;
}

.main-content {
  display: flex;
  flex: 1;
  gap: 20px;
}

.video-container {
  flex: 3;
  display: flex;
  flex-direction: column;
}

.video-player {
  background-color: #000;
  border-radius: 8px;
  overflow: hidden;
  flex: 1;
}

video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-info {
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin-top: 15px;
}

.video-info h2 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #2c3e50;
}

.meta-info {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  color: #7f8c8d;
  font-size: 0.9rem;
}

.resource-list {
  flex: 1;
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
  overflow-y: auto;
  max-height: calc(100vh - 100px);
}

.resource-list h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.resource-item {
  display: flex;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.resource-item:hover {
  background-color: #eef7ff;
}

.resource-item.active {
  background-color: #e1f0ff;
  border-left: 4px solid #42b983;
}

.resource-icon {
  font-size: 1.5rem;
  margin-right: 12px;
  align-self: center;
}

.resource-info {
  flex: 1;
}

.resource-info h4 {
  margin: 0 0 5px 0;
  color: #34495e;
}

.resource-info p {
  margin: 0;
  color: #7f8c8d;
  font-size: 0.85rem;
}
</style>
