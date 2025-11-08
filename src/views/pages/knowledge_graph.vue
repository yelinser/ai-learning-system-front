<template>
  <div class="knowledge-graph-container">
    <el-card class="mgb20" shadow="hover">
      <template #header>
        <div class="content-title">课程知识图谱</div>
      </template>

      <!-- 知识图谱可视化区域 -->
      <div class="graph-container">
        <div class="graph-controls">
          <el-button-group>
            <el-button @click="zoomIn">
              <el-icon>
                <ZoomIn />
              </el-icon>放大
            </el-button>
            <el-button @click="zoomOut">
              <el-icon>
                <ZoomOut />
              </el-icon>缩小
            </el-button>
            <el-button @click="resetView">
              <el-icon>
                <Refresh />
              </el-icon>重置
            </el-button>
            <el-button @click="toggleForceLayout">
              <el-icon>
                <Position />
              </el-icon>{{ forceLayout ? '停止布局' : '力导向布局' }}
            </el-button>
          </el-button-group>

          <div class="filter-controls">
            <el-select v-model="selectedChapter" placeholder="选择章节" clearable @change="updateGraph">
              <el-option label="全部章节" value=""></el-option>
              <el-option v-for="chapter in chapters" :key="chapter" :label="chapter" :value="chapter"></el-option>
            </el-select>

            <el-select v-model="selectedStatus" placeholder="学习状态" clearable @change="updateGraph">
              <el-option label="全部状态" value=""></el-option>
              <el-option label="已掌握" value="mastered"></el-option>
              <el-option label="学习中" value="learning"></el-option>
              <el-option label="未学习" value="unlearned"></el-option>
            </el-select>

            <el-select v-model="selectedType" placeholder="节点类型" clearable @change="updateGraph">
              <el-option label="全部类型" value=""></el-option>
              <el-option label="章节" value="chapter"></el-option>
              <el-option label="知识点" value="concept"></el-option>
              <el-option label="学习资源" value="resource"></el-option>
            </el-select>
          </div>
        </div>

        <!-- ECharts 知识图谱画布 -->
        <div class="graph-canvas" ref="graphCanvas"></div>
        
        <!-- ✅ 添加调试信息面板 -->
        <div class="debug-info" v-if="showDebug">
          <el-tag>节点: {{ graphData.nodes.length }}</el-tag>
          <el-tag type="success">连接: {{ graphData.links.length }}</el-tag>
          <el-tag type="warning">过滤后节点: {{ filteredGraphData.nodes.length }}</el-tag>
          <el-tag type="danger">过滤后连接: {{ filteredGraphData.links.length }}</el-tag>
        </div>
      </div>
    </el-card>

    <!-- 节点详情弹窗 -->
    <el-dialog v-model="nodeDetailVisible" :title="selectedNode?.name" width="600px">
      <div v-if="selectedNode" class="node-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="节点类型">
            <el-tag :type="getNodeTypeTag(selectedNode.category)">
              {{ getNodeTypeText(selectedNode.category) }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="学习状态">
            <el-tag :type="getStatusTag(selectedNode.status)">
              {{ getStatusText(selectedNode.status) }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item v-if="selectedNode.progress !== undefined" label="掌握进度">
            <el-progress :percentage="selectedNode.progress" />
          </el-descriptions-item>

          <el-descriptions-item v-if="selectedNode.chapter" label="所属章节">
            {{ selectedNode.chapter }}
          </el-descriptions-item>

          <el-descriptions-item v-if="selectedNode.description" label="描述" :span="2">
            {{ selectedNode.description }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 相关资源 -->
        <div v-if="selectedNode.relatedResources && selectedNode.relatedResources.length" class="related-resources">
          <h4>相关资源</h4>
          <el-space wrap>
            <el-tag v-for="resource in selectedNode.relatedResources" :key="resource.id" type="info"
              @click="openResource(resource)" style="cursor: pointer;">
              <el-icon>
                <Document />
              </el-icon>
              {{ resource.filename }}
            </el-tag>
          </el-space>
        </div>

        <!-- 前置知识点 -->
        <div v-if="selectedNode.prerequisites && selectedNode.prerequisites.length" class="prerequisites">
          <h4>前置知识点</h4>
          <el-space wrap>
            <el-tag v-for="prereq in selectedNode.prerequisites" :key="prereq.id" type="warning"
              @click="focusNode(prereq.id)" style="cursor: pointer;">
              {{ prereq.name }}
            </el-tag>
          </el-space>
        </div>

        <!-- 学习建议 -->
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
          查看资源
        </el-button>
        <el-button v-else type="primary" @click="startLearning(selectedNode)">
          开始学习
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
  Position
} from '@element-plus/icons-vue';
import {
  getGraphData,
  type GraphNode,
  type GraphLink,
  type GraphData,
  type Resource,
  recommendResourcesForConcept
} from '@/api/knowledgeGraph';

/* ---------- 响应式 ---------- */
const graphCanvas = ref<HTMLElement>();
let chart: echarts.ECharts | null = null;
const selectedChapter = ref('');
const selectedStatus = ref('');
const selectedType = ref('');
const nodeDetailVisible = ref(false);
const selectedNode = ref<GraphNode | null>(null);
const forceLayout = ref(true);
const chapters = ref<string[]>([]);
const graphData = ref<GraphData>({ nodes: [], links: [] });
const showDebug = ref(true); // ✅ 显示调试信息

/* ---------- 数据获取(调后端) ---------- */
const loadGraphData = async () => {
  try {
    const data = await getGraphData();

    // ✅ 终极容错：确保 nodes 和 links 永远是数组
    graphData.value = {
      nodes: Array.isArray(data?.nodes) ? data.nodes : [],
      links: Array.isArray(data?.links) ? data.links : []
    };

    // 🔍 关键调试信息
    console.log('📊 图谱数据摘要:', {
      节点总数: graphData.value.nodes.length,
      连接总数: graphData.value.links.length,
      章节数: new Set(graphData.value.nodes.map(n => n.chapter).filter(Boolean)).size,
      节点类型分布: Object.fromEntries(
        ['chapter', 'concept', 'resource'].map(t => [
          t,
          graphData.value.nodes.filter(n => n.category === t).length
        ])
      ),
      连接样本: graphData.value.links.slice(0, 5),
      孤立节点数: graphData.value.nodes.filter(n =>
        !graphData.value.links.some(l => l.source === n.id || l.target === n.id)
      ).length
    });

    // 如果没有连线，立即提示
    if (graphData.value.links.length === 0) {
      ElMessage.warning('未获取到有效的节点连接关系，请检查后端数据');
    } else {
      ElMessage.success(`加载成功：${graphData.value.nodes.length}个节点，${graphData.value.links.length}条连接`);
    }

    const chapterSet = new Set(graphData.value.nodes.map(n => n.chapter).filter(Boolean));
    chapters.value = Array.from(chapterSet) as string[];

    if (graphData.value.nodes.length === 0) {
      ElMessage.warning('后端返回数据为空，显示空图谱');
    }

  } catch (e: any) {
    console.error('❌ 加载失败:', e);
    ElMessage.error(`图谱数据加载失败: ${e.message}`);

    // 降级方案
    graphData.value = { nodes: [], links: [] };
  }
};

/* ---------- 资源加载 ---------- */
const loadResources = async (conceptName: string) => {
  if (!conceptName) return;
  try {
    const list = await recommendResourcesForConcept(conceptName);
    selectedNode.value!.relatedResources = list;
  } catch (e) {
    ElMessage.error('资源加载失败');
  }
};

/* ---------- 过滤 & 图表 ---------- */
const filteredGraphData = computed(() => {
  let nodes = [...graphData.value.nodes];
  let links = [...graphData.value.links];

  if (selectedChapter.value)
    nodes = nodes.filter(n => n.chapter === selectedChapter.value);

  if (selectedStatus.value)
    nodes = nodes.filter(n => n.status === selectedStatus.value);

  if (selectedType.value)
    nodes = nodes.filter(n => n.category === selectedType.value);

  // 根据过滤后的节点重新筛选连接
  const nodeIds = new Set(nodes.map(n => n.id));
  links = links.filter(l =>
    nodeIds.has(l.source as string) && nodeIds.has(l.target as string)
  );

  console.log('🔄 过滤后数据:', {
    原始节点: graphData.value.nodes.length,
    过滤后节点: nodes.length,
    原始连接: graphData.value.links.length,
    过滤后连接: links.length
  });

  return { nodes, links };
});

const initChart = () => {
  if (!graphCanvas.value) return;

  // 再次验证数据
  if (filteredGraphData.value.links.length === 0) {
    console.warn('⚠️ 当前过滤条件下没有连接数据！');
  }

  chart = echarts.init(graphCanvas.value);
  
  // ✅ 优化后的ECharts配置
  const option = {
    tooltip: {
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          const node = params.data as GraphNode;
          return `<div style="text-align:left">
            <div style="font-weight:bold;margin-bottom:5px">${node.name}</div>
            <div>类型：${getNodeTypeText(node.category)}</div>
            <div>状态：${getStatusText(node.status)}</div>
            ${node.progress !== undefined ? `<div>进度：${node.progress}%</div>` : ''}
            ${node.chapter ? `<div>章节：${node.chapter}</div>` : ''}
          </div>`;
        } else if (params.dataType === 'edge') {
          // ✅ 显示连接关系信息
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
        repulsion: 300,      // ✅ 增加排斥力
        gravity: 0.05,       // ✅ 降低重力
        edgeLength: 150,     // ✅ 增加边长
        layoutAnimation: true,
        friction: 0.6        // ✅ 添加摩擦力
      },
      circular: { rotateLabel: true },
      data: filteredGraphData.value.nodes,
      links: filteredGraphData.value.links,
      categories: [
        { name: 'chapter', itemStyle: { color: '#67c23a' } },
        { name: 'concept', itemStyle: { color: '#409eff' } },
        { name: 'resource', itemStyle: { color: '#e6a23c' } }
      ],
      roam: true,
      focusNodeAdjacency: true,
      draggable: true,     // ✅ 允许拖拽
      label: { 
        show: true, 
        position: 'right', 
        formatter: '{b}', 
        fontSize: 12 
      },
      // ✅ 重要：确保边的样式配置正确
      lineStyle: { 
        color: 'source',   // 使用源节点颜色
        curveness: 0.2,    // 曲度
        width: 2,          // 默认宽度
        opacity: 0.7       // 透明度
      },
      // ✅ 边的标签显示
      edgeLabel: {
        show: false,       // 默认不显示，鼠标悬停时显示
        formatter: '{c}'   // 显示关系类型
      },
      emphasis: { 
        focus: 'adjacency',
        lineStyle: { 
          width: 4,
          opacity: 1
        },
        edgeLabel: {
          show: true      // 高亮时显示标签
        }
      }
    }]
  };
  
  chart.setOption(option);

  // ✅ 添加更多事件监听
  chart.on('click', (params: any) => {
    if (params.dataType === 'node') {
      showNodeDetail(params.data as GraphNode);
    } else if (params.dataType === 'edge') {
      console.log('点击了连接:', params.data);
    }
  });
  
  chart.on('dblclick', (params: any) => {
    if (params.dataType === 'node') focusNode(params.data.id);
  });
};

const updateGraph = () => {
  if (!chart) return;
  
  console.log('🔄 更新图表, 连接数:', filteredGraphData.value.links.length);
  
  chart.setOption({
    series: [{
      data: filteredGraphData.value.nodes,
      links: filteredGraphData.value.links,
      layout: forceLayout.value ? 'force' : 'circular'
    }]
  });
};

const getNodeTypeTag = (type: string) => ({ concept: 'success', resource: 'info', chapter: 'warning' }[type] || 'info');
const getNodeTypeText = (type: string) => ({ concept: '知识点', resource: '学习资源', chapter: '章节' }[type] || '节点');
const getStatusTag = (status: string) => ({ mastered: 'success', learning: 'warning', unlearned: 'info' }[status] || 'info');
const getStatusText = (status: string) => ({ mastered: '已掌握', learning: '学习中', unlearned: '未学习' }[status] || '未知');

const showNodeDetail = (node: GraphNode) => {
  selectedNode.value = node;
  nodeDetailVisible.value = true;
  if (node.category === 'concept' && node.name) loadResources(node.name);
};

const focusNode = (nodeId: string) => {
  if (!chart) return;

  // 在过滤后的数据中查找索引
  const filteredNodes = filteredGraphData.value.nodes;
  const dataIndex = filteredNodes.findIndex(n => n.id === nodeId);

  if (dataIndex === -1) return; // 如果被过滤了就不聚焦

  chart.dispatchAction({
    type: 'focusNodeAdjacency',
    dataIndex: dataIndex  // 使用过滤后的正确索引
  });
};

const openResource = (resource: Resource | GraphNode) => {
  // 类型守卫：明确区分两种类型
  const resourceName = 'filename' in resource
    ? resource.filename  // Resource类型
    : resource.name;     // GraphNode类型

  ElMessage.success(`打开资源: ${resourceName}`);
};

const startLearning = (node: GraphNode) => {
  ElMessage.success(`开始学习: ${node.name}`);
};

const zoomIn = () => chart?.dispatchAction({ type: 'dataZoom', zoom: 1.2 });
const zoomOut = () => chart?.dispatchAction({ type: 'dataZoom', zoom: 0.8 });

const resetView = () => {
  selectedChapter.value = '';
  selectedStatus.value = '';
  selectedType.value = '';
  updateGraph();
  ElMessage.success('视图已重置');
};

const toggleForceLayout = () => {
  forceLayout.value = !forceLayout.value;
  updateGraph();
};

const handleResize = () => chart?.resize();

/* ---------- 生命周期 ---------- */
onMounted(async () => {
  await nextTick();
  await loadGraphData();   // ① 拿数据
  initChart();             // ② 画图
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
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
}

.filter-controls {
  display: flex;
  gap: 10px;
}

.graph-canvas {
  width: 100%;
  height: 600px;
}

/* ✅ 调试信息样式 */
.debug-info {
  position: absolute;
  top: 70px;
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