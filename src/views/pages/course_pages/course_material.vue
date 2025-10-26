<template>
  <div class="resource-gallery">
    <div v-for="chapter in chapters" :key="chapter.id" class="chapter-section">
      <h2 class="chapter-title">{{ chapter.title }}</h2>
      <div class="resources-grid">
        <div 
          v-for="resource in chapter.resources" 
          :key="resource.id"
          class="resource-card"
          @click="viewResource(resource)"
        >
          <div class="resource-icon">
            <span v-if="resource.type === 'video'">📹</span>
            <span v-else-if="resource.type === 'document'">📄</span>
            <span v-else-if="resource.type === 'image'">🖼️</span>
            <span v-else>📁</span>
          </div>
          <div class="resource-info">
            <h3>{{ resource.title }}</h3>
            <p>{{ resource.description }}</p>
            <div class="resource-meta">
              <span>{{ formatDuration(resource.duration) }}</span>
              <span>{{ formatDate(resource.date) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// 示例数据结构 - 实际应用中可能从API获取
const chapters = ref([
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
        url: "/resource/101"
      },
      {
        id: 102,
        title: "算法图解",
        type: "image",
        description: "常用算法可视化图解",
        duration: null,
        date: "2023-10-18",
        url: "/resource/102"
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
        url: "/resource/201"
      },
      {
        id: 202,
        title: "AI应用案例",
        type: "video",
        description: "人工智能实际应用场景分析",
        duration: 1800,
        date: "2023-10-25",
        url: "/resource/202"
      }
    ]
  }
]);

// 查看资源详情
const viewResource = (resource) => {
  router.push({
    name: 'video-display',
    params: { 
      id: resource.id 
    }
  });
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
</script>

<style scoped>
.resource-gallery {
  padding: 20px;
}

.chapter-section {
  margin-bottom: 40px;
}

.chapter-title {
  border-bottom: 2px solid #42b983;
  padding-bottom: 10px;
  margin-bottom: 20px;
  color: #2c3e50;
}

.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.resource-card {
  border: 1px solid #eaeaea;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  background-color: #f9f9f9;
}

.resource-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  background-color: #ffffff;
}

.resource-icon {
  font-size: 2rem;
  margin-right: 15px;
  align-self: center;
}

.resource-info {
  flex: 1;
}

.resource-info h3 {
  margin-top: 0;
  margin-bottom: 8px;
  color: #34495e;
}

.resource-info p {
  margin: 8px 0;
  color: #7f8c8d;
  font-size: 0.9rem;
}

.resource-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #95a5a6;
  margin-top: 10px;
}
</style>
