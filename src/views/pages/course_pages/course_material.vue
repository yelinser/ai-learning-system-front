<template>
  <div class="resource-center">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1 class="page-title">学习资源中心</h1>
      <p class="page-subtitle">浏览和下载课程相关学习资源</p>
    </div>

    <!-- 搜索和筛选区域 -->
    <el-card class="search-card mgb20" shadow="hover">
      <div class="search-controls">
        <div class="search-input">
          <el-input
            v-model="searchQuery"
            placeholder="搜索资源名称、关键词..."
            clearable
            @input="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        
        <div class="filter-controls">
          <el-select v-model="filterType" placeholder="资源类型" clearable @change="handleFilter">
            <el-option label="全部类型" value=""></el-option>
            <el-option label="视频" value="video"></el-option>
            <el-option label="PDF文档" value="pdf"></el-option>
            <el-option label="PPT" value="ppt"></el-option>
            <el-option label="文本" value="text"></el-option>
          </el-select>

          <el-select v-model="filterCourse" placeholder="课程" clearable @change="handleFilter">
            <el-option label="全部课程" value=""></el-option>
            <el-option v-for="course in courses" :key="course" :label="course" :value="course"></el-option>
          </el-select>

          <el-select v-model="filterChapter" placeholder="章节" clearable @change="handleFilter">
            <el-option label="全部章节" value=""></el-option>
            <el-option v-for="chapter in chapters" :key="chapter" :label="chapter" :value="chapter"></el-option>
          </el-select>
        </div>
      </div>
    </el-card>

    <!-- 资源列表 -->
    <el-card class="resource-list-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>资源列表</span>
          <span class="resource-count">共 {{ filteredResources.length }} 个资源</span>
        </div>
      </template>

      <div v-loading="loading" class="resource-container">
        <!-- 空状态 -->
        <div v-if="filteredResources.length === 0" class="empty-state">
          <el-empty description="暂无相关资源" />
        </div>

        <!-- 资源网格 -->
        <div v-else class="resource-grid">
          <div 
            v-for="resource in filteredResources" 
            :key="resource.id"
            class="resource-card"
            :class="{ 'video-type': resource.resource_type === 'video' }"
          >
            <div class="resource-header">
              <div class="resource-type-icon">
                <el-icon v-if="resource.resource_type === 'video'"><VideoPlay /></el-icon>
                <el-icon v-if="resource.resource_type === 'pdf'"><Document /></el-icon>
                <el-icon v-if="resource.resource_type === 'text'"><Notebook /></el-icon>
                <el-icon v-if="!['video', 'pdf', 'text'].includes(resource.resource_type)"><Files /></el-icon>
              </div>
              <div class="resource-actions">
                <el-tooltip content="预览" placement="top">
                  <el-button 
                    size="small" 
                    circle 
                    @click="previewResource(resource)"
                    :disabled="!canPreview(resource)"
                  >
                    <el-icon><View /></el-icon>
                  </el-button>
                </el-tooltip>
                <el-tooltip content="下载" placement="top">
                  <el-button 
                    size="small" 
                    circle 
                    type="primary" 
                    @click="downloadResource(resource)"
                    :loading="downloadingResources[resource.id]"
                    :disabled="downloadingResources[resource.id]"
                  >
                    <el-icon v-if="!downloadingResources[resource.id]"><Download /></el-icon>
                  </el-button>
                </el-tooltip>
              </div>
            </div>

            <div class="resource-content">
              <h3 class="resource-title" :title="resource.metadata.title">
                {{ resource.metadata.title }}
              </h3>
              
              <div class="resource-meta">
                <div class="meta-item">
                  <el-icon><User /></el-icon>
                  <span>{{ resource.metadata.author || '未知作者' }}</span>
                </div>
                <div class="meta-item">
                  <el-icon><Collection /></el-icon>
                  <span>{{ resource.metadata.course }}</span>
                </div>
                <div class="meta-item">
                  <el-icon><Folder /></el-icon>
                  <span>{{ resource.metadata.chapter }}</span>
                </div>
                <div class="meta-item">
                  <el-icon><Clock /></el-icon>
                  <span>{{ formatTime(resource.upload_time) }}</span>
                </div>
              </div>

              <div class="resource-keywords">
                <el-tag 
                  v-for="keyword in resource.metadata.keywords.slice(0, 3)" 
                  :key="keyword"
                  size="small"
                  v-show="keyword"
                >
                  {{ keyword }}
                </el-tag>
                <span v-if="resource.metadata.keywords.length > 3" class="more-keywords">
                  +{{ resource.metadata.keywords.length - 3 }}
                </span>
              </div>

              <div class="resource-footer">
                <div class="file-info">
                  <span class="file-type">{{ getFileTypeText(resource.resource_type) }}</span>
                  <span class="file-size">{{ formatFileSize(resource.size) }}</span>
                </div>
                <!-- 下载进度显示 -->
                <div v-if="downloadingResources[resource.id]" class="download-progress">
                  <el-progress 
                    :percentage="downloadProgress[resource.id] || 0" 
                    :show-text="false"
                    :stroke-width="6"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 资源预览弹窗 -->
    <el-dialog
      v-model="previewVisible"
      :title="previewResourceData?.metadata.title"
      width="90%"
      top="5vh"
      class="preview-dialog"
    >
      <div v-if="previewResourceData" class="preview-content">
        <!-- PDF预览 -->
        <div v-if="previewResourceData.resource_type === 'pdf'" class="pdf-preview">
          <iframe 
            :src="`${previewResourceData.file_path}#view=fitH`" 
            width="100%" 
            height="600"
            frameborder="0"
          ></iframe>
        </div>

        <!-- 视频预览 -->
        <div v-else-if="previewResourceData.resource_type === 'video'" class="video-preview">
          <video 
            controls 
            width="100%" 
            height="400"
            :src="previewResourceData.file_path"
          >
            您的浏览器不支持视频播放
          </video>
        </div>

        <!-- 文本预览 -->
        <div v-else-if="previewResourceData.resource_type === 'text'" class="text-preview">
          <div class="text-content">
            <pre>{{ previewTextContent }}</pre>
          </div>
        </div>

        <!-- 不支持预览的类型 -->
        <div v-else class="unsupported-preview">
          <el-result
            icon="warning"
            title="不支持预览"
            :sub-title="`当前不支持预览 ${getFileTypeText(previewResourceData.resource_type)} 类型的文件`"
          >
            <template #extra>
              <el-button 
                type="primary" 
                @click="downloadResource(previewResourceData)"
                :loading="downloadingResources[previewResourceData.id]"
              >
                {{ downloadingResources[previewResourceData.id] ? '下载中...' : '下载文件' }}
              </el-button>
            </template>
          </el-result>
        </div>
      </div>

      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button 
          v-if="previewResourceData" 
          type="primary" 
          @click="downloadResource(previewResourceData)"
          :loading="downloadingResources[previewResourceData.id]"
        >
          {{ downloadingResources[previewResourceData.id] ? '下载中...' : '下载资源' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  VideoPlay,
  Document,
  Notebook,
  Files,
  View,
  Download,
  User,
  Collection,
  Folder,
  Clock
} from '@element-plus/icons-vue'

// 响应式数据
const loading = ref(false)
const searchQuery = ref('')
const filterType = ref('')
const filterCourse = ref('')
const filterChapter = ref('')
const previewVisible = ref(false)
const previewResourceData = ref(null)
const previewTextContent = ref('')

// 下载状态管理
const downloadingResources = ref({})
const downloadProgress = ref({})

// 资源数据
const resources = ref([])

// 模拟数据 - 在实际应用中这些数据应该从后端API获取
const courses = ref(['大数据分析', '机器学习', '数据可视化'])
const chapters = ref(['课程概述', '第1章 基础概念', '第2章 核心算法', '第3章 高级应用'])

// 计算属性 - 过滤资源
const filteredResources = computed(() => {
  let result = resources.value

  // 搜索过滤
  if (searchQuery.value) {
    const keyword = searchQuery.value.toLowerCase()
    result = result.filter(resource => 
      resource.metadata.title.toLowerCase().includes(keyword) ||
      resource.metadata.keywords.some(kw => kw.toLowerCase().includes(keyword)) ||
      resource.metadata.course.toLowerCase().includes(keyword) ||
      resource.metadata.chapter.toLowerCase().includes(keyword)
    )
  }

  // 类型过滤
  if (filterType.value) {
    result = result.filter(resource => resource.resource_type === filterType.value)
  }

  // 课程过滤
  if (filterCourse.value) {
    result = result.filter(resource => resource.metadata.course === filterCourse.value)
  }

  // 章节过滤
  if (filterChapter.value) {
    result = result.filter(resource => resource.metadata.chapter === filterChapter.value)
  }

  return result
})

// 方法
const formatTime = (timeString) => {
  const date = new Date(timeString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileTypeText = (type) => {
  const types = {
    video: '视频',
    pdf: 'PDF文档',
    ppt: 'PPT',
    text: '文本',
    image: '图片'
  }
  return types[type] || '文件'
}

const canPreview = (resource) => {
  const previewableTypes = ['pdf', 'video', 'text']
  return previewableTypes.includes(resource.resource_type)
}

const handleSearch = () => {
  // 搜索逻辑已经在计算属性中处理
  console.log('搜索关键词:', searchQuery.value)
}

const handleFilter = () => {
  // 筛选逻辑已经在计算属性中处理
  console.log('筛选条件:', {
    type: filterType.value,
    course: filterCourse.value,
    chapter: filterChapter.value
  })
}

// 预览资源
const previewResource = async (resource) => {
  if (!canPreview(resource)) {
    ElMessage.warning('该类型文件不支持预览')
    return
  }

  try {
    loading.value = true
    previewResourceData.value = resource

    if (resource.resource_type === 'text') {
      // 对于文本文件，需要先获取内容
      const response = await fetch(resource.file_path)
      const text = await response.text()
      previewTextContent.value = text
    }

    previewVisible.value = true
  } catch (error) {
    console.error('预览资源失败:', error)
    ElMessage.error('预览资源失败')
  } finally {
    loading.value = false
  }
}

// 下载资源 - 后台下载版本
const downloadResource = async (resource) => {
  // 如果正在下载，直接返回
  if (downloadingResources.value[resource.id]) {
    return
  }

  try {
    // 设置下载状态
    downloadingResources.value[resource.id] = true
    downloadProgress.value[resource.id] = 0

    // 调用后端下载接口
    const response = await fetch(
      `http://patrickshao.site:8000/api/v1/resources/${resource.id}/download`
    )

    if (!response.ok) {
      throw new Error(`下载失败: ${response.status} ${response.statusText}`)
    }

    // 获取内容长度用于进度计算
    const contentLength = response.headers.get('content-length')
    const total = parseInt(contentLength, 10)
    let loaded = 0

    // 创建读取器
    const reader = response.body.getReader()
    const chunks = []

    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break
      
      chunks.push(value)
      loaded += value.length
      
      // 更新下载进度
      if (total) {
        const progress = Math.round((loaded / total) * 100)
        downloadProgress.value[resource.id] = progress
      }
    }

    // 完成下载
    const blob = new Blob(chunks)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = resource.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success(`"${resource.metadata.title}" 下载成功`)
    
  } catch (error) {
    console.error('下载资源失败:', error)
    ElMessage.error(`下载失败: ${error.message}`)
  } finally {
    // 清理下载状态
    downloadingResources.value[resource.id] = false
    downloadProgress.value[resource.id] = 0
  }
}

// 加载资源列表
const loadResources = async () => {
  try {
    loading.value = true
    
    // 调用后端获取资源列表接口
    const response = await fetch('http://patrickshao.site:8000/api/v1/resources/', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    })

    if (!response.ok) {
      throw new Error('获取资源列表失败')
    }

    const data = await response.json()
    resources.value = data
    
    // 更新课程和章节列表
    updateFilterOptions(data)
  } catch (error) {
    console.error('加载资源失败:', error)
    ElMessage.error('加载资源失败')
    
    // 如果API调用失败，使用模拟数据
    loadMockData()
  } finally {
    loading.value = false
  }
}

// 更新筛选选项
const updateFilterOptions = (resources) => {
  const courseSet = new Set<string>()
  const chapterSet = new Set<string>()
  
  resources.forEach(resource => {
    if (resource.metadata.course) {
      courseSet.add(resource.metadata.course)
    }
    if (resource.metadata.chapter) {
      chapterSet.add(resource.metadata.chapter)
    }
  })
  
  courses.value = Array.from(courseSet) as string[]
  chapters.value = Array.from(chapterSet) as string[]
}

// 模拟数据加载（备用）
const loadMockData = () => {
  resources.value = [
    {
      filename: "[1.1.1]--课程概述.mp4",
      content_type: "video/mp4",
      size: 97945065,
      resource_type: "video",
      metadata: {
        title: "[1.1.1]--课程概述",
        author: "车海莺",
        keywords: ["大数据", "概述"],
        course: "大数据分析",
        chapter: "课程概述"
      },
      id: "5c79fd07-3e33-4f6d-abdd-d30a6969b8fe",
      upload_time: "2025-11-03T22:34:21",
      file_path: "uploads/[1.1.1]--课程概述.mp4",
      vector_id: "461898758002411733"
    },
    {
      filename: "(1.1.1)--概述PPT.pdf",
      content_type: "application/pdf",
      size: 2732158,
      resource_type: "pdf",
      metadata: {
        title: "(1.1.1)--概述PPT",
        author: "车海莺",
        keywords: ["大数据基本概念", "数据获取", "数据预处理"],
        course: "大数据分析",
        chapter: "课程概述"
      },
      id: "65461d44-4098-4641-865c-ba4b6c3bef99",
      upload_time: "2025-11-03T23:07:46",
      file_path: "uploads/(1.1.1)--概述PPT.pdf",
      vector_id: "461898758002411769"
    }
  ]
  
  updateFilterOptions(resources.value)
}

// 生命周期
onMounted(() => {
  loadResources()
})
</script>

<style scoped>
.resource-center {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  color: #303133;
  font-weight: bold;
}

.page-subtitle {
  margin: 5px 0 0 0;
  color: #606266;
  font-size: 14px;
}

.search-card {
  margin-bottom: 20px;
}

.search-controls {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.search-input {
  width: 100%;
}

.filter-controls {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.resource-list-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.resource-count {
  color: #909399;
  font-size: 14px;
}

.resource-container {
  min-height: 400px;
}

.empty-state {
  padding: 40px 0;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.resource-card {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.resource-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.resource-card.video-type {
  border-left: 4px solid #409eff;
}

.resource-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.resource-type-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #f0f2f5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #409eff;
  font-size: 20px;
}

.resource-actions {
  display: flex;
  gap: 5px;
}

.resource-content {
  flex: 1;
}

.resource-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.resource-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #606266;
}

.meta-item .el-icon {
  font-size: 14px;
}

.resource-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 12px;
}

.more-keywords {
  font-size: 12px;
  color: #909399;
  align-self: center;
}

.resource-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  gap: 8px;
}

.file-info {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
}

.file-type {
  background: #f0f2f5;
  padding: 2px 6px;
  border-radius: 3px;
}

.download-progress {
  flex: 1;
  min-width: 60px;
}

.preview-dialog {
  max-width: 1200px;
}

.preview-content {
  min-height: 400px;
}

.pdf-preview,
.video-preview,
.text-preview,
.unsupported-preview {
  width: 100%;
}

.text-preview {
  max-height: 600px;
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 16px;
}

.text-content pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
}

.mgb20 {
  margin-bottom: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .resource-grid {
    grid-template-columns: 1fr;
  }
  
  .filter-controls {
    flex-direction: column;
  }
  
  .search-controls {
    gap: 10px;
  }
  
  .resource-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .download-progress {
    width: 100%;
  }
}
</style>