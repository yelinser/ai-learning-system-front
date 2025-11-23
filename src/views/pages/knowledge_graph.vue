<template>
  <div class="knowledge-graph-container">
    <el-card class="mgb20" shadow="hover">
      <template #header>
        <div class="content-title">
          课程知识图谱
          <el-tag v-if="expandedNodes.size > 0" type="info" size="small" style="margin-left: 10px;">
            已展开: {{ expandedNodes.size }}个节点
          </el-tag>
        </div>
      </template>

      <div class="graph-container">
        <div class="graph-controls">
          <el-button-group>
            <el-button @click="zoomIn">
              <el-icon><ZoomIn /></el-icon>放大
            </el-button>
            <el-button @click="zoomOut">
              <el-icon><ZoomOut /></el-icon>缩小
            </el-button>
            <el-button @click="resetView">
              <el-icon><Refresh /></el-icon>重置
            </el-button>
            <el-button @click="toggleForceLayout">
              <el-icon><Position /></el-icon>{{ forceLayout ? '停止布局' : '力导向布局' }}
            </el-button>
            <el-button 
              type="primary" 
              @click="toggleAllNodes"
              :icon="isAllExpanded ? 'Fold' : 'Expand'"
            >
              {{ isAllExpanded ? '一键收起所有节点' : '一键展开所有节点' }}
            </el-button>
          </el-button-group>
        </div>

        <div class="graph-canvas" ref="graphCanvas"></div>
        
        <div class="debug-info" v-if="showDebug">
          <el-tag>总节点: {{ graphData.nodes.length }}</el-tag>
          <el-tag type="success">总连接: {{ graphData.links.length }}</el-tag>
          <el-tag type="warning">当前显示: {{ filteredGraphData.nodes.length }}</el-tag>
          <el-tag type="info">已展开: {{ expandedNodes.size }}</el-tag>
        </div>

        <div class="graph-legend">
          <div class="legend-item">
            <svg class="legend-symbol" viewBox="0 0 20 20">
              <polygon points="10,2 18,18 2,18" fill="#67c23a" stroke="#fff" stroke-width="2"/>
            </svg>
            <span>章节节点</span>
          </div>
          <div class="legend-item">
            <svg class="legend-symbol" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" fill="#409eff" stroke="#fff" stroke-width="2"/>
            </svg>
            <span>知识点</span>
          </div>
          <div class="legend-item">
            <svg class="legend-symbol" viewBox="0 0 20 20">
              <rect x="2" y="6" width="16" height="12" rx="3" fill="#e6a23c" stroke="#fff" stroke-width="2"/>
            </svg>
            <span>学习资源</span>
          </div>
        </div>
      </div>
    </el-card>

    <el-dialog v-model="nodeDetailVisible" :title="selectedNode?.name" width="600px">
      <div v-if="selectedNode" class="node-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="节点类型">
            <el-tag :type="getNodeTypeTag(selectedNode.category)">
              {{ getNodeTypeText(selectedNode.category) }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item v-if="selectedNode.chapter" label="所属章节">
            {{ selectedNode.chapter }}
          </el-descriptions-item>

          <el-descriptions-item v-if="selectedNode.description" label="描述" :span="2">
            {{ selectedNode.description }}
          </el-descriptions-item>

          <el-descriptions-item v-if="selectedNode.meta?.connectionCount !== undefined" label="关联知识点">
            {{ selectedNode.meta.connectionCount }} 个
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="selectedNode.relatedResources && selectedNode.relatedResources.length" class="related-resources">
          <h4>相关资源</h4>
          <el-space wrap>
            <el-tag v-for="resource in selectedNode.relatedResources" :key="resource.id" type="info"
              @click="openResource(resource)" style="cursor: pointer;">
              <el-icon><Document /></el-icon>
              {{ resource.filename }}
            </el-tag>
          </el-space>
        </div>

        <div v-if="selectedNode.prerequisites && selectedNode.prerequisites.length" class="prerequisites">
          <h4>前置知识点</h4>
          <el-space wrap>
            <el-tag v-for="prereq in selectedNode.prerequisites" :key="prereq.id" type="warning"
              @click="focusNode(prereq.id)" style="cursor: pointer;">
              {{ prereq.name }}
            </el-tag>
          </el-space>
        </div>

        <div v-if="selectedNode.suggestions && selectedNode.suggestions.length" class="learning-suggestions">
          <h4>学习建议</h4>
          <ul>
            <li v-for="suggestion in selectedNode.suggestions" :key="suggestion">
              {{ suggestion }}
            </li>
          </ul>
        </div>
      </div>

      <template #footer>
        <el-button @click="nodeDetailVisible = false">关闭</el-button>
        <el-button v-if="selectedNode?.category === 'resource'" type="primary" @click="openResource(selectedNode)">
          下载资源
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts';
import {
  ZoomIn,
  ZoomOut,
  Refresh,
  Document,
  Position,
  Expand,
  Fold
} from '@element-plus/icons-vue';
import {
  getGraphData,
  type GraphNode,
  type GraphLink,
  type GraphData,
  type Resource,
  recommendResourcesForConcept,
  downloadResource
} from '@/api/knowledgeGraph';

/* ---------- 响应式状态 ---------- */
const graphCanvas = ref<HTMLElement>();
let chart: echarts.ECharts | null = null;
const nodeDetailVisible = ref(false);
const selectedNode = ref<GraphNode | null>(null);
const forceLayout = ref(true);
const graphData = ref<GraphData>({ nodes: [], links: [] });
const showDebug = ref(true);

// 用于记录已展开的节点ID
const expandedNodes = ref(new Set<string>());

// 添加状态标记是否已展开所有节点
const isAllExpanded = ref(false);

// 添加单击/双击处理相关的变量
let clickTimer: number | null = null;
let lastClickTime = 0;
const CLICK_DELAY = 300; // 单击延迟时间（毫秒）

/* ---------- 计算属性 ---------- */
const filteredGraphData = computed(() => {
  // 过滤掉学生节点和学习记录节点
  const validNodes = graphData.value.nodes.filter(n => 
    n.category === 'chapter' || n.category === 'concept' || n.category === 'resource'
  );
  
  // 初始只显示章节节点，或者已展开的节点
  const chapterNodes = validNodes.filter(n => n.category === 'chapter');
  const expandedNodeIds = expandedNodes.value;
  
  // 包含所有章节节点 + 已展开的节点
  const visibleNodeIds = new Set([
    ...chapterNodes.map(n => n.id),
    ...Array.from(expandedNodeIds)
  ]);

  // 过滤节点
  const nodes = validNodes.filter(n => visibleNodeIds.has(n.id));
  
  // 过滤连接：只显示两个端点都可见的连接
  const links = graphData.value.links.filter(l =>
    visibleNodeIds.has(l.source as string) && visibleNodeIds.has(l.target as string)
  );

  return { nodes, links };
});

/* ---------- 数据加载 ---------- */
const loadGraphData = async () => {
  try {
    const data = await getGraphData();
    graphData.value = {
      nodes: Array.isArray(data?.nodes) ? data.nodes : [],
      links: Array.isArray(data?.links) ? data.links : []
    };

    // 初始展开所有章节节点
    const chapterNodeIds = graphData.value.nodes
      .filter(n => n.category === 'chapter')
      .map(n => n.id);
    
    chapterNodeIds.forEach(id => expandedNodes.value.add(id));
    
    // 重置展开状态
    isAllExpanded.value = false;

    if (graphData.value.nodes.length === 0) {
      ElMessage.warning('后端返回数据为空');
    } else {
      ElMessage.success(`加载成功：${graphData.value.nodes.length}个节点，${graphData.value.links.length}条连接`);
    }
  } catch (e: any) {
    console.error('❌ 加载失败:', e);
    ElMessage.error(`图谱数据加载失败: ${e.message}`);
    graphData.value = { nodes: [], links: [] };
  }
};

const loadResources = async (conceptName: string) => {
  if (!conceptName) return;
  try {
    const list = await recommendResourcesForConcept(conceptName);
    if (selectedNode.value) {
      selectedNode.value.relatedResources = list;
    }
  } catch (e) {
    ElMessage.error('资源加载失败');
  }
};

/* ---------- 节点展开功能 ---------- */
// 展开单个节点的相邻节点
const expandNodeNeighbors = (nodeId: string) => {
  // 找到与当前节点相连的所有连接
  const connectedLinks = graphData.value.links.filter(link => 
    link.source === nodeId || link.target === nodeId
  );

  // 获取相邻节点的ID
  const neighborIds = new Set<string>();
  connectedLinks.forEach(link => {
    if (link.source === nodeId) {
      neighborIds.add(link.target as string);
    } else {
      neighborIds.add(link.source as string);
    }
  });

  // 添加到已展开节点集合
  neighborIds.forEach(id => expandedNodes.value.add(id));
  
  // 添加当前节点（确保它也被显示）
  expandedNodes.value.add(nodeId);
  
  // 检查是否已展开所有节点
  checkAllExpanded();

  console.log(`🔍 展开节点 ${nodeId} 的 ${neighborIds.size} 个相邻节点`);
};

// 检查是否已展开所有节点
const checkAllExpanded = () => {
  const allNodeIds = new Set(
    graphData.value.nodes
      .filter(n => n.category === 'chapter' || n.category === 'concept' || n.category === 'resource')
      .map(n => n.id)
  );
  isAllExpanded.value = expandedNodes.value.size === allNodeIds.size;
};

// 切换所有节点的展开/收起状态
const toggleAllNodes = () => {
  if (isAllExpanded.value) {
    // 如果已展开全部，则收起所有节点（只显示章节节点）
    const chapterNodeIds = graphData.value.nodes
      .filter(n => n.category === 'chapter')
      .map(n => n.id);
    
    expandedNodes.value = new Set(chapterNodeIds);
    isAllExpanded.value = false;
    updateChart();
    ElMessage.success('已收起所有节点，仅显示章节节点');
  } else {
    // 如果未展开全部，则展开所有节点
    const allNodeIds = graphData.value.nodes
      .filter(n => n.category === 'chapter' || n.category === 'concept' || n.category === 'resource')
      .map(n => n.id);
    expandedNodes.value = new Set(allNodeIds);
    isAllExpanded.value = true;
    updateChart();
    ElMessage.success(`已展开所有 ${allNodeIds.length} 个节点`);
  }
};

// 一键展开所有节点（保持向后兼容）
const expandAllNodes = () => {
  if (!isAllExpanded.value) {
    toggleAllNodes();
  }
};

/* ---------- 图表控制 ---------- */
const initChart = () => {
  if (!graphCanvas.value) return;

  chart = echarts.init(graphCanvas.value);
  updateChart();
};

// 分离图表配置更新函数
const updateChart = () => {
  if (!chart) return;
  
  const option = {
    tooltip: {
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          const node = params.data as GraphNode;
          return `<div style="text-align:left">
            <div style="font-weight:bold;margin-bottom:5px">${node.name}</div>
            <div>类型：${getNodeTypeText(node.category)}</div>
            ${node.chapter ? `<div>章节：${node.chapter}</div>` : ''}
            ${node.category === 'chapter' ? '<div style="color:#67c23a;font-size:12px">(双击展开相关节点)</div>' : ''}
          </div>`;
        } else if (params.dataType === 'edge') {
          return `<div style="text-align:left">
            <div style="font-weight:bold">关系类型</div>
            <div>${params.data.label || '相关'}</div>
          </div>`;
        }
        return '';
      }
    },
    series: [{
      type: 'graph',
      layout: forceLayout.value ? 'force' : 'circular',
      force: { 
        repulsion: 300,
        gravity: 0.05,
        edgeLength: 150,
        layoutAnimation: true,
        friction: 0.6
      },
      circular: { rotateLabel: true },
      data: filteredGraphData.value.nodes.map(node => ({
        ...node,
        symbolSize: getSymbolSize(node.category),
        symbol: getSymbol(node.category),
        itemStyle: getItemStyle(node.category)
      })),
      links: filteredGraphData.value.links,
      categories: [
        { name: 'chapter', itemStyle: { color: '#67c23a' } },
        { name: 'concept', itemStyle: { color: '#409eff' } },
        { name: 'resource', itemStyle: { color: '#e6a23c' } }
      ],
      roam: true,
      focusNodeAdjacency: true,
      draggable: true,
      label: { 
        show: true, 
        position: 'right', 
        formatter: '{b}', 
        fontSize: 12 
      },
      lineStyle: { 
        color: 'source',
        curveness: 0.2,
        width: 2,
        opacity: 0.7
      },
      edgeLabel: {
        show: false,
        formatter: '{c}'
      },
      emphasis: { 
        focus: 'adjacency',
        lineStyle: { 
          width: 4,
          opacity: 1
        },
        edgeLabel: {
          show: true
        }
      }
    }]
  };
  
  chart.setOption(option, true);

  // 移除旧的事件监听器，避免重复绑定
  chart.off('click');
  chart.off('dblclick');

  // 处理节点点击事件（区分单击和双击）
  chart.on('click', (params: any) => {
    if (params.dataType === 'node') {
      const currentTime = new Date().getTime();
      
      // 如果是双击的一部分，不处理单击
      if (currentTime - lastClickTime < CLICK_DELAY) {
        if (clickTimer !== null) {
          clearTimeout(clickTimer);
          clickTimer = null;
        }
        return;
      }
      
      lastClickTime = currentTime;
      
      // 设置延迟处理单击事件
      clickTimer = window.setTimeout(() => {
        showNodeDetail(params.data as GraphNode);
        clickTimer = null;
      }, CLICK_DELAY);
    }
  });
  
  // 处理节点双击事件
  chart.on('dblclick', (params: any) => {
    if (params.dataType === 'node') {
      // 清除单击定时器
      if (clickTimer !== null) {
        clearTimeout(clickTimer);
        clickTimer = null;
      }
      
      const node = params.data as GraphNode;
      expandNodeNeighbors(node.id);
      updateChart();
      ElMessage.info(`已展开与"${node.name}"相关的节点`);
    }
  });
};

// 更新图表数据和布局
const updateGraph = () => {
  updateChart();
};

/* ---------- 辅助函数 ---------- */
const getSymbolSize = (category: string) => {
  const size = { resource: 30, concept: 35, chapter: 40 }[category] || 35;
  return category === 'resource' ? [30, 24] : size;
};

const getSymbol = (category: string) => {
  return { concept: 'circle', resource: 'rect', chapter: 'triangle' }[category] || 'circle';
};

const getItemStyle = (category: string) => {
  const color = { chapter: '#67c23a', concept: '#409eff', resource: '#e6a23c' }[category] || '#909399';
  return { 
    color: color, 
    borderWidth: category === 'resource' ? 2 : 0, 
    borderColor: '#fff' 
  };
};

/* ---------- 功能函数 ---------- */
const getNodeTypeTag = (type: string) => ({ concept: 'success', resource: 'info', chapter: 'warning' }[type] || 'info');
const getNodeTypeText = (type: string) => ({ concept: '知识点', resource: '学习资源', chapter: '章节' }[type] || '节点');

const showNodeDetail = (node: GraphNode) => {
  selectedNode.value = node;
  nodeDetailVisible.value = true;
  if (node.category === 'concept' && node.name) loadResources(node.name);
};

const focusNode = (nodeId: string) => {
  if (!chart) return;

  const filteredNodes = filteredGraphData.value.nodes;
  const dataIndex = filteredNodes.findIndex(n => n.id === nodeId);

  if (dataIndex === -1) return;

  chart.dispatchAction({
    type: 'focusNodeAdjacency',
    dataIndex: dataIndex
  });
};

const openResource = async (resource: Resource | GraphNode) => {
  let downloadUrl = '';
  
  try {
    const resourceId = 'resourceId' in resource && resource.resourceId 
      ? resource.resourceId 
      : resource.id;
    
    if (!resourceId) {
      throw new Error('资源ID无效或为空');
    }

    let filename: string;
    if ('filename' in resource && resource.filename) {
      filename = resource.filename;
    } else if ('name' in resource && resource.name) {
      filename = resource.name;
    } else {
      filename = `resource_${resourceId}`;
    }

    const loadingInstance = ElMessage({
      message: '正在下载文件...',
      duration: 0,
      type: 'info'
    });

    const result = await downloadResource(resourceId);
    const blob = result.data;
    
    if (result.filename && result.filename !== `resource_${resourceId}`) {
      filename = result.filename;
    }
    
    downloadUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
      URL.revokeObjectURL(downloadUrl);
    }, 3000);
    
    loadingInstance.close();
    ElMessage.success(`已开始下载: ${filename}`);
    
  } catch (error) {
    console.error('❌ 下载失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    ElMessage.error(`下载失败: ${errorMessage}`);
    
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
  }
};

const startLearning = (node: GraphNode) => {
  ElMessage.success(`开始学习: ${node.name}`);
};

const zoomIn = () => chart?.dispatchAction({ type: 'zoomIn' });
const zoomOut = () => chart?.dispatchAction({ type: 'zoomOut' });

const resetView = () => {
  // 重置时只显示章节节点
  const chapterNodeIds = graphData.value.nodes
    .filter(n => n.category === 'chapter')
    .map(n => n.id);
  
  expandedNodes.value = new Set(chapterNodeIds);
  isAllExpanded.value = false;
  updateChart();
  ElMessage.success('视图已重置，仅显示章节节点');
};

const toggleForceLayout = () => {
  forceLayout.value = !forceLayout.value;
  updateChart();
};

const handleResize = () => chart?.resize();

/* ---------- 生命周期 ---------- */
onMounted(async () => {
  await nextTick();
  await loadGraphData();
  initChart();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  // 清理定时器
  if (clickTimer !== null) {
    clearTimeout(clickTimer);
  }
  chart?.dispose();
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.knowledge-graph-container {
  padding: 20px;
}

.graph-container {
  position: relative;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background-color: #f8f9fa;
  min-height: 600px;
}

.graph-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  flex-wrap: wrap;
  gap: 10px;
}

.graph-canvas {
  width: 100%;
  height: 600px;
}

.debug-info {
  position: absolute;
  top: 580px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  background: rgba(255, 255, 255, 0.95);
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.graph-legend {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 10;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.legend-symbol {
  width: 20px;
  height: 20px;
  margin-right: 8px;
}

.node-detail {
  line-height: 1.6;
}

.related-resources,
.prerequisites,
.learning-suggestions {
  margin-top: 20px;
}

.related-resources h4,
.prerequisites h4,
.learning-suggestions h4 {
  margin-bottom: 10px;
  color: #303133;
}

.learning-suggestions ul {
  padding-left: 20px;
  color: #606266;
}

.learning-suggestions li {
  margin-bottom: 5px;
}
</style>