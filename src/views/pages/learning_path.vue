<template>
  <div class="learning-path-page">
    <h1>学习路径推荐</h1>

    <div v-if="isLoading" class="loading">
      正在为你生成学习路径...
    </div>

    <div v-if="error" class="error">
      加载路径失败: {{ error }}
    </div>

    <div v-if="learningPathData && !isLoading" class="dual-view-container">
      <!-- 左侧：知识图谱可视化 -->
      <div class="left-panel">
        <div class="panel-header">
          <h2>学习进度</h2>
          <div class="graph-stats">
            <span class="stat">概念节点: {{ conceptNodesCount }}</span>
            <span class="stat">关联关系: {{ edgeCount }}</span>
          </div>
        </div>
        <div ref="graphContainer" class="graph-container"></div>
        
        <!-- 图例说明 -->
        <div class="legend">
          <div class="legend-item">
            <span class="legend-color student"></span>
            <span>学生</span>
          </div>
          <div class="legend-item">
            <span class="legend-color not_started"></span>
            <span>未开始</span>
          </div>
          <div class="legend-item">
            <span class="legend-color in_progress"></span>
            <span>进行中</span>
          </div>
          <div class="legend-item">
            <span class="legend-color completed"></span>
            <span>已完成</span>
          </div>
        </div>
      </div>

      <!-- 右侧：学习路径列表 -->
      <div class="right-panel">
        <div class="panel-header">
          <h2>推荐学习路径</h2>
          <div class="path-stats">
            <span class="stat">推荐步骤: {{ recommendedPathCount }}</span>
            <span class="stat">学习资源: {{ totalResources }}</span>
          </div>
        </div>

        <!-- 内容区域，添加滚动容器 -->
        <div class="panel-content">
          <div v-if="!learningPathData.visualization_data?.recommended_path || learningPathData.visualization_data.recommended_path.length === 0" class="placeholder">
            暂未找到推荐的学习路径。
          </div>

          <ol v-else class="path-list">
            <li 
              v-for="(step, index) in learningPathData.visualization_data.recommended_path" 
              :key="step.concept_id" 
              class="path-item"
              :class="{ active: activeStepIndex === index }"
              @mouseenter="setActiveStep(index)"
              @mouseleave="clearActiveStep"
            >
              <div class="step-indicator">步骤 {{ index + 1 }}</div>
              <div class="step-header">
                <span class="step-concept-name">{{ step.concept_name }}</span>
                <div class="step-meta">
                  <span class="status" :class="step.status">
                    {{ getStatusText(step.status) }}
                  </span>
                  <span v-if="step.progress > 0" class="progress">
                    ({{ step.progress }}%)
                  </span>
                  <!-- <span class="score">推荐度: {{ (step.score * 100).toFixed(1) }}%</span> -->
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
                    :data-type="getResourceType(resource.resource_type)"
                  >
                    {{ getResourceTypeText(resource.resource_type) }}
                  </span>
                  
                  <div class="resource-info">
                    <span class="resource-title">
                      {{ decodeURIComponent(resource.title || resource.filename) }}
                    </span>
                    <span class="resource-type">{{ resource.resource_type }}</span>
                  </div>
                  <div class="resource-actions">
                    <button 
                      class="action-btn download-btn" 
                      @click.stop="downloadResource(resource)"
                      :disabled="downloadingResources.includes(resource.id)"
                      :title="`下载${decodeURIComponent(resource.title || resource.filename)}`"
                    >
                      <span v-if="downloadingResources.includes(resource.id)" class="loading-spinner"></span>
                      📥 {{ downloadingResources.includes(resource.id) ? '下载中...' : '下载' }}
                    </button>
                  </div>
                </li>
              </ul>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang='ts'>
import { ref, onMounted, nextTick, computed } from 'vue';
import * as echarts from 'echarts';

// --- 状态定义 ---
const BASE_URL = 'http://patrickshao.site:8000';
const learningPathData = ref(null);
const isLoading = ref(false);
const error = ref(null);
const graphContainer = ref(null);
const activeStepIndex = ref(-1);
const downloadingResources = ref<string[]>([]); // 正在下载的资源ID列表
const showDownloadProgress = ref(false);
const downloadProgress = ref<Array<{resourceId: string, filename: string, progress: number}>>([]);
let chartInstance = null;

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

// 计算属性
const conceptNodesCount = computed(() => {
  if (!learningPathData.value?.visualization_data?.nodes) return 0;
  return learningPathData.value.visualization_data.nodes.filter(node => node.group === 'Concept').length;
});

const edgeCount = computed(() => {
  return learningPathData.value?.visualization_data?.edges?.length || 0;
});

const recommendedPathCount = computed(() => {
  return learningPathData.value?.visualization_data?.recommended_path?.length || 0;
});

const totalResources = computed(() => {
  if (!learningPathData.value?.visualization_data?.recommended_path) return 0;
  return learningPathData.value.visualization_data.recommended_path.reduce((total, step) => {
    return total + (step.resources?.length || 0);
  }, 0);
});

const answerStats = computed(() => {
  return learningPathData.value?.visualization_data?.answer_stats || {};
});

const inProgressConcepts = computed(() => {
  if (!learningPathData.value?.visualization_data?.nodes) return 0;
  return learningPathData.value.visualization_data.nodes.filter(node => 
    node.status === 'in_progress' && node.group === 'Concept'
  ).length;
});

const completedConcepts = computed(() => {
  if (!learningPathData.value?.visualization_data?.nodes) return 0;
  return learningPathData.value.visualization_data.nodes.filter(node => 
    node.status === 'completed' && node.group === 'Concept'
  ).length;
});

// 从localStorage获取用户信息
const getUserInfoFromStorage = (): UserInfo | null => {
    try {
        const userInfoStr = localStorage.getItem('user_info')
        if (userInfoStr) {
            return JSON.parse(userInfoStr) as UserInfo
        }
    } catch (err) {
        console.error('解析用户信息失败:', err)
    }
    return null
}

const userInfo = getUserInfoFromStorage();
const STUDENT_ID_FOR_DEMO = userInfo?.username || 'test3';

/**
 * 获取学习路径可视化数据
 */
async function fetchLearningPathVisualization(studentId: string) {
  if (!studentId) {
    error.value = "没有提供学生 ID。";
    return;
  }

  isLoading.value = true;
  error.value = null;
  learningPathData.value = null;
  
  const url = `${BASE_URL}/knowledge-graph/students/${studentId}/learning-path-visualization`;
  console.log(`开始获取 ID 为 ${studentId} 的学习路径可视化数据...`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP 错误! 状态: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('学习路径可视化响应数据:', data);
    
    learningPathData.value = data;
    
    // 数据加载完成后初始化图表
    nextTick(() => {
      initKnowledgeGraph();
    });

  } catch (err) {
    console.error('获取学习路径可视化数据失败:', err);
    error.value = err.message;
  } finally {
    isLoading.value = false;
  }
}

/**
 * 初始化知识图谱
 */
function initKnowledgeGraph() {
  if (!graphContainer.value || !learningPathData.value?.visualization_data) return;
  
  // 销毁现有图表实例
  if (chartInstance) {
    chartInstance.dispose();
  }
  
  chartInstance = echarts.init(graphContainer.value);
  
  const { nodes, edges } = learningPathData.value.visualization_data;
  
  // 处理节点数据
  const graphNodes = nodes.map(node => ({
    id: node.id,
    name: node.label,
    category: node.group,
    symbolSize: node.group === 'Student' ? 50 : 40,
    itemStyle: {
      color: getNodeColor(node)
    },
    label: {
      show: true,
      fontSize: node.group === 'Student' ? 14 : 12,
      fontWeight: node.group === 'Student' ? 'bold' : 'normal'
    },
    progress: node.progress || 0,
    status: node.status || 'not_started'
  }));
  
  // 处理边数据
  const graphLinks = edges.map(edge => ({
    source: edge.from,
    target: edge.to,
    lineStyle: {
      color: '#aaa',
      width: 2,
      curveness: 0.2
    }
  }));
  
  const option = {
    tooltip: {
      formatter: function(params: any) {
        if (params.dataType === 'node') {
          const node = nodes.find(n => n.id === params.data.id);
          return `
            <div style="text-align: left; padding: 8px;">
              <div style="font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #333;">${params.data.name}</div>
              <div style="font-size: 12px; color: #666;">类型: ${params.data.category}</div>
              ${node.progress !== undefined ? `<div style="font-size: 12px; color: #666;">进度: ${node.progress}%</div>` : ''}
              ${node.status ? `<div style="font-size: 12px; color: #666;">状态: ${getStatusText(node.status)}</div>` : ''}
            </div>
          `;
        }
        return '';
      }
    },
    animation: true,
    series: [{
      type: 'graph',
      layout: 'force',
      data: graphNodes,
      links: graphLinks,
      roam: true,
      focusNodeAdjacency: true,
      label: {
        show: true,
        position: 'right',
        formatter: '{b}',
        fontSize: 12
      },
      force: {
        repulsion: 200,
        gravity: 0.1,
        edgeLength: 100
      },
      lineStyle: {
        color: 'source',
        curveness: 0.2
      },
      emphasis: {
        focus: 'adjacency',
        lineStyle: {
          width: 3
        }
      }
    }]
  };
  
  chartInstance.setOption(option);
  
  // 响应窗口大小变化
  window.addEventListener('resize', () => {
    chartInstance?.resize();
  });
}

/**
 * 设置激活的学习步骤（高亮对应节点）
 */
function setActiveStep(index: number) {
  activeStepIndex.value = index;
}

function clearActiveStep() {
  activeStepIndex.value = -1;
}

/**
 * 预览资源
 */
function previewResource(resource: any) {
  console.log('预览资源:', resource);
  // 这里可以打开资源预览模态框或跳转到资源页面
  alert(`预览资源: ${decodeURIComponent(resource.title || resource.filename)}`);
}

/**
 * 下载资源
 */
async function downloadResource(resource: any) {
  if (downloadingResources.value.includes(resource.id)) {
    return; // 防止重复点击
  }

  // 添加到下载中列表
  downloadingResources.value.push(resource.id);
  
  const resourceId = resource.id;
  const filename = decodeURIComponent(resource.filename || resource.title || 'resource');
  
  // 添加到下载进度
  const progressItem = {
    resourceId,
    filename,
    progress: 0
  };
  downloadProgress.value.push(progressItem);
  showDownloadProgress.value = true;

  try {
    const downloadUrl = `${BASE_URL}/api/v1/resources/${resourceId}/download`;
    console.log(`开始下载资源: ${filename}`, downloadUrl);

    // 更新进度
    progressItem.progress = 30;

    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`下载失败: ${response.status} ${response.statusText}`);
    }

    // 更新进度
    progressItem.progress = 70;

    const blob = await response.blob();
    
    // 更新进度
    progressItem.progress = 90;

    // 创建下载链接
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // 从响应头或资源信息中获取文件名
    const contentDisposition = response.headers.get('content-disposition');
    let downloadFilename = filename;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
      if (filenameMatch && filenameMatch[1]) {
        downloadFilename = filenameMatch[1];
      }
    }
    
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    
    // 清理
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    // 更新进度为完成
    progressItem.progress = 100;

    console.log(`资源下载成功: ${downloadFilename}`);

    // 3秒后从下载列表中移除
    setTimeout(() => {
      downloadingResources.value = downloadingResources.value.filter(id => id !== resourceId);
      downloadProgress.value = downloadProgress.value.filter(item => item.resourceId !== resourceId);
      
      if (downloadProgress.value.length === 0) {
        showDownloadProgress.value = false;
      }
    }, 3000);

  } catch (err) {
    console.error('下载资源失败:', err);
    
    // 下载失败，从列表中移除
    downloadingResources.value = downloadingResources.value.filter(id => id !== resourceId);
    downloadProgress.value = downloadProgress.value.filter(item => item.resourceId !== resourceId);
    
    alert(`下载失败: ${err.message}`);
    
    if (downloadProgress.value.length === 0) {
      showDownloadProgress.value = false;
    }
  }
}

/**
 * 获取节点颜色
 */
function getNodeColor(node: any): string {
  if (node.group === 'Student') return '#5470c6';
  
  switch (node.status) {
    case 'completed': return '#67c23a';
    case 'in_progress': return '#e6a23c';
    case 'not_started': return '#909399';
    default: return '#909399';
  }
}

// (辅助函数) 转换 status 文本
function getStatusText(status: string) {
  if (status === 'not_started') return '未开始';
  if (status === 'in_progress') return '进行中';
  if (status === 'completed') return '已完成';
  return status;
}

// (辅助函数) 获取资源类型
function getResourceType(resourceType: string) {
  if (resourceType === 'pdf') return 'pdf';
  if (resourceType === 'ppt' || resourceType === 'pptx') return 'ppt';
  if (resourceType === 'doc' || resourceType === 'docx') return 'doc';
  return 'other';
}

// (辅助函数) 获取资源类型显示文本
function getResourceTypeText(resourceType: string) {
  if (resourceType === 'pdf') return 'PDF';
  if (resourceType === 'ppt' || resourceType === 'pptx') return 'PPT';
  if (resourceType === 'doc' || resourceType === 'docx') return 'DOC';
  return 'FILE';
}

// (辅助函数) URL解码
function decodeURIComponent(str: string) {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

// (生命周期) 组件挂载时获取数据
onMounted(() => {
  fetchLearningPathVisualization(STUDENT_ID_FOR_DEMO);
});

// 组件卸载时清理图表实例
import { onUnmounted } from 'vue';
onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose();
  }
});
</script>

<style scoped>
.learning-path-page {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  height: 100vh; /* 确保页面有固定高度 */
  display: flex;
  flex-direction: column;
}

.learning-path-page h1 {
  margin: 0 0 20px 0;
  flex-shrink: 0; /* 防止标题被压缩 */
}

/* 双视图容器 */
.dual-view-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  flex: 1; /* 占据剩余空间 */
  min-height: 0; /* 重要：防止内容溢出 */
}

/* 左右面板通用样式 */
.left-panel, .right-panel {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0; /* 重要：防止内容溢出 */
}

.panel-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  flex-shrink: 0; /* 防止标题区域被压缩 */
}

.panel-header h2 {
  margin: 0 0 10px 0;
  font-size: 1.4em;
}

.graph-stats, .path-stats {
  display: flex;
  gap: 20px;
  font-size: 0.9em;
  opacity: 0.9;
}

.stat {
  background: rgba(255,255,255,0.2);
  padding: 4px 8px;
  border-radius: 4px;
}

/* --- 左侧：知识图谱 --- */
.left-panel {
  /* 左侧面板保持原有布局 */
}

.graph-container {
  flex: 1;
  min-height: 300px; /* 减小最小高度 */
  padding: 10px;
}

/* 图例 */
.legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 15px;
  border-top: 1px solid #e0e0e0;
  background: #f8f9fa;
  flex-shrink: 0; /* 防止图例被压缩 */
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: inline-block;
}

.legend-color.student { background: #5470c6; }
.legend-color.not_started { background: #909399; }
.legend-color.in_progress { background: #e6a23c; }
.legend-color.completed { background: #67c23a; }

/* --- 右侧：学习路径列表 --- */
.right-panel {
  /* 移除原有的 max-height 和 overflow-y */
}

/* 新增内容区域样式 */
.panel-content {
  flex: 1;
  overflow-y: auto; /* 只有内容区域可滚动 */
  min-height: 0; /* 重要：允许内容区域收缩 */
}

/* 路径列表样式 */
.path-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.path-item {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  transition: all 0.3s ease;
  cursor: pointer;
}

.path-item:hover, .path-item.active {
  background: #f8f9fa;
  transform: translateX(5px);
}

.path-item:last-child {
  border-bottom: none;
}

.step-indicator {
  font-size: 0.8em;
  color: #667eea;
  font-weight: bold;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.step-concept-name {
  font-weight: bold;
  font-size: 1.2em;
  color: #2c3e50;
  flex: 1;
  min-width: 200px;
}

.step-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.status {
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8em;
}

.status.not_started {
  color: #6c757d;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
}

.status.in_progress {
  color: #e6a23c;
  background-color: #fdf6ec;
  border: 1px solid #e6a23c;
}

.status.completed {
  color: #67c23a;
  background-color: #f0f9eb;
  border: 1px solid #67c23a;
}

.progress {
  color: #28a745;
  font-weight: bold;
  font-size: 0.9em;
}

.score {
  color: #667eea;
  font-weight: bold;
  font-size: 0.9em;
  background: #f0f4ff;
  padding: 4px 8px;
  border-radius: 4px;
}

/* 资源列表 */
.resource-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.resource-item {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  margin: 5px 0;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.resource-item:hover {
  transform: translateX(5px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border-color: #667eea;
}

.resource-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8em;
  font-weight: bold;
  color: #fff;
  margin-right: 15px;
}

.resource-icon[data-type="pdf"] {
  background: linear-gradient(135deg, #dc3545, #c82333);
}

.resource-icon[data-type="ppt"] {
  background: linear-gradient(135deg, #fd7e14, #e55a00);
}

.resource-icon[data-type="doc"] {
  background: linear-gradient(135deg, #20c997, #17a2b8);
}

.resource-icon[data-type="other"] {
  background: linear-gradient(135deg, #6c757d, #495057);
}

.resource-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0; /* 允许文本截断 */
}

.resource-title {
  font-weight: 600;
  color: #495057;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resource-type {
  font-size: 0.8em;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 资源操作按钮 */
.resource-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 0.85em;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.preview-btn {
  background: #e9ecef;
  color: #495057;
}

.preview-btn:hover {
  background: #dee2e6;
  transform: translateY(-1px);
}

.download-btn {
  background: #28a745;
  color: white;
}

.download-btn:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-1px);
}

.download-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

/* 加载动画 */
.loading-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 下载进度提示 */
.download-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.progress-content {
  background: white;
  padding: 20px;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}

.progress-content h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.progress-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.progress-filename {
  flex: 1;
  font-size: 0.9em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress-bar {
  width: 100px;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #0056b3);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-fill.completed {
  background: #28a745;
}

.progress-percent {
  font-size: 0.8em;
  color: #6c757d;
  min-width: 40px;
  text-align: right;
}

.close-btn {
  margin-top: 15px;
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  width: 100%;
}

.close-btn:hover {
  background: #5a6268;
}

/* 学习统计 */
.learning-stats {
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  background: #f8f9fa;
}

.learning-stats h3 {
  margin: 0 0 15px 0;
  color: #495057;
  font-size: 1.1em;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.stat-card {
  background: white;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.stat-value {
  font-size: 1.5em;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 0.8em;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* --- 状态提示 --- */
.loading, .placeholder {
  color: #777;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  font-style: italic;
  font-size: 1.1em;
  padding: 20px;
}

.error {
  color: #dc3545;
  font-weight: bold;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: 15px;
  border-radius: 8px;
  margin: 20px 0;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .dual-view-container {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .graph-container {
    min-height: 400px;
  }
}

@media (max-width: 768px) {
  .learning-path-page {
    padding: 10px;
    height: auto; /* 移动端恢复自动高度 */
  }
  
  .step-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .step-meta {
    justify-content: flex-start;
  }
  
  .resource-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .resource-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .action-btn {
    flex: 1;
    justify-content: center;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .legend {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
  
  /* 移动端调整滚动区域 */
  .right-panel {
    max-height: 60vh; /* 移动端限制最大高度 */
  }
}
</style>
