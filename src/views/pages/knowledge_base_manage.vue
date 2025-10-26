<template>
  <div class="knowledge-page">
    <!-- 左侧图谱 -->
    <div class="graph-box">
      <div ref="graphRef" class="graph"></div>
      
      <!-- 工具栏 -->
      <div class="toolbar">
        <el-button type="primary" @click="showCreateNodeDialog">新建节点</el-button>
        <el-button @click="deleteSelectedNode" :disabled="!selectedNode">删除节点</el-button>
        <el-button @click="linkingMode = !linkingMode" :type="linkingMode ? 'success' : ''">
          {{ linkingMode ? '连线模式(点击连接)' : '开始连线' }}
        </el-button>
      </div>
    </div>

    <!-- 右侧节点类型筛选和资源区 -->
    <div class="res-box">
      <!-- 节点类型筛选 -->
      <div class="filter-panel">
        <h4>节点类型筛选</h4>
        <el-checkbox-group v-model="selectedNodeTypes">
          <el-checkbox 
            v-for="type in nodeTypes" 
            :key="type.value" 
            :label="type.value"
            :style="{ color: type.color }"
          >
            {{ type.label }} ({{ getNodeCountByType(type.value) }})
          </el-checkbox>
        </el-checkbox-group>
      </div>

      <!-- 上传 -->
      <el-upload
        class="upload"
        drag
        multiple
        :show-file-list="false"
        :http-request="handleUpload"
        accept=".pdf,.ppt,.pptx,.mp4,.zip,.txt,.doc,.docx"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div>拖拽或点击上传资源</div>
        <template #tip>
          <div class="el-upload__tip">支持pdf,ppt,pptx,mp4,zip,txt,doc,docx等格式</div>
        </template>
      </el-upload>

      <!-- 节点列表 -->
      <div class="node-list">
        <h4>节点列表 ({{ filteredNodes.length }})</h4>
        <el-input
          v-model="nodeSearch"
          placeholder="搜索节点..."
          clearable
          prefix-icon="Search"
          size="small"
          style="margin-bottom: 10px;"
        />
        <el-scrollbar height="280px">
          <div
            v-for="node in filteredNodes"
            :key="node.id"
            class="node-item"
            :class="{ selected: selectedNode === node.id }"
            @click="selectNode(node.id)"
            @dblclick="focusOnNode(node.id)"
          >
            <div class="node-color" :style="{ backgroundColor: node.color }"></div>
            <div class="node-info">
              <div class="node-name">{{ node.name }}</div>
              <div class="node-type">{{ getNodeTypeLabel(node.type) }}</div>
            </div>
            <div class="node-actions">
              <el-button link type="primary" @click.stop="editNode(node)">编辑</el-button>
              <el-button link type="danger" @click.stop="deleteNode(node.id)">删除</el-button>
            </div>
          </div>
        </el-scrollbar>
      </div>

      <!-- 历史记录入口 -->
      <el-button class="hist-btn" text @click="histDrawer = true">
        版本历史
      </el-button>
    </div>

    <!-- 历史抽屉 -->
    <el-drawer v-model="histDrawer" title="版本历史" direction="rtl" size="400">
      <el-timeline>
        <el-timeline-item
          v-for="h in history"
          :key="h.id"
          :timestamp="h.time"
          :color="h.color"
        >
          {{ h.desc }}
        </el-timeline-item>
      </el-timeline>
    </el-drawer>

    <!-- 节点编辑弹窗 -->
    <el-dialog v-model="nodeDlg" :title="isEditing ? '编辑节点' : '创建节点'" width="500px">
      <el-form :model="nodeForm" label-width="80px">
        <el-form-item label="节点名称">
          <el-input v-model="nodeForm.name" placeholder="输入节点名称" />
        </el-form-item>
        <el-form-item label="节点类型">
          <el-select v-model="nodeForm.type" placeholder="选择节点类型">
            <el-option
              v-for="type in nodeTypes"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            >
              <span :style="{ color: type.color }">{{ type.label }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="nodeForm.desc" type="textarea" :rows="3" placeholder="节点描述" />
        </el-form-item>
        <el-form-item label="节点颜色">
          <el-color-picker v-model="nodeForm.color" show-alpha />
        </el-form-item>
        <el-form-item label="大小">
          <el-slider v-model="nodeForm.symbolSize" :min="20" :max="100" show-input />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="nodeDlg = false">取消</el-button>
        <el-button type="primary" @click="saveNode">{{ isEditing ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import * as echarts from 'echarts'
import { UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { ECBasicOption } from 'echarts/types/dist/shared'

// 1. 图谱实例
const graphRef = ref<HTMLDivElement>()
let chart: echarts.ECharts

// 2. 节点类型定义
const nodeTypes = ref([
  { value: 'concept', label: '概念', color: '#2d8cf0' },
  { value: 'resource', label: '资源', color: '#00bcd4' },
  { value: 'knowledge1', label: '一级知识点', color: '#64d572' },
  { value: 'knowledge2', label: '二级知识点', color: '#f25e43' },
  { value: 'knowledge3', label: '三级知识点', color: '#ff9f40' }
])

// 3. 筛选状态
const selectedNodeTypes = ref(['concept', 'resource', 'knowledge1', 'knowledge2', 'knowledge3'])
const nodeSearch = ref('')
const selectedNode = ref<string | null>(null)
const linkingMode = ref(false)
const linkStartNode = ref<string | null>(null)

// 4. 节点和连线数据
interface KnowledgeNode {
  id: string
  name: string
  x: number
  y: number
  symbolSize: number
  color: string
  desc: string
  type: string
}

interface KnowledgeLink {
  source: string
  target: string
}

const nodes = ref<KnowledgeNode[]>([
  { 
    id: 'n1', 
    name: '函数概念', 
    x: 100, 
    y: 100, 
    symbolSize: 60, 
    color: '#2d8cf0', 
    desc: '数学中的函数基本概念', 
    type: 'concept' 
  },
  { 
    id: 'n2', 
    name: '几何证明', 
    x: 300, 
    y: 100, 
    symbolSize: 60, 
    color: '#64d572', 
    desc: '几何证明方法', 
    type: 'concept' 
  },
])

const links = ref<KnowledgeLink[]>([
  { source: 'n1', target: 'n2' }
])

// 5. 过滤后的节点列表
const filteredNodes = computed(() => {
  return nodes.value.filter(node => 
    selectedNodeTypes.value.includes(node.type) &&
    node.name.toLowerCase().includes(nodeSearch.value.toLowerCase())
  )
})

// 6. 节点操作函数
const getNodeCountByType = (type: string) => {
  return nodes.value.filter(node => node.type === type).length
}

const getNodeTypeLabel = (type: string) => {
  const found = nodeTypes.value.find(t => t.value === type)
  return found ? found.label : type
}

const selectNode = (nodeId: string) => {
  selectedNode.value = nodeId
  // 高亮显示选中的节点
  highlightNode(nodeId)
}

const focusOnNode = (nodeId: string) => {
  const node = nodes.value.find(n => n.id === nodeId)
  if (node && chart) {
    chart.dispatchAction({
      type: 'focusNodeAdjacency',
      dataIndex: nodes.value.findIndex(n => n.id === nodeId)
    })
  }
}

const highlightNode = (nodeId: string) => {
  if (chart) {
    chart.dispatchAction({
      type: 'highlight',
      dataIndex: nodes.value.findIndex(n => n.id === nodeId)
    })
  }
}

// 7. 初始化图谱
function initGraph() {
  chart = echarts.init(graphRef.value!)
  
  const option: ECBasicOption = {
    backgroundColor: 'transparent',
    tooltip: {
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          const node = nodes.value.find(n => n.id === params.data.id)
          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${params.data.name}</div>
              <div style="color: #666; font-size: 12px;">类型: ${getNodeTypeLabel(node?.type || '')}</div>
              ${node?.desc ? `<div style="color: #666; font-size: 12px;">描述: ${node.desc}</div>` : ''}
            </div>
          `
        }
        return params.dataType === 'edge' ? `关联: ${params.data.source} → ${params.data.target}` : ''
      }
    },
    animationDurationUpdate: 300,
    series: [{
      type: 'graph',
      layout: 'force',
      force: {
        repulsion: 200,
        edgeLength: 100,
        gravity: 0.1
      },
      roam: true,
      draggable: true,
      data: nodes.value.map(n => ({ 
        ...n, 
        value: n.symbolSize,
        itemStyle: { color: n.color },
        label: { show: true, formatter: n.name }
      })),
      links: links.value,
      emphasis: { 
        focus: 'adjacency', 
        itemStyle: { borderColor: '#ffdf22', borderWidth: 3 } 
      },
      lineStyle: {
        color: 'source',
        curveness: 0.3
      }
    }]
  }
  
  chart.setOption(option)
  
  // 节点点击事件
  chart.on('click', (params: any) => {
    if (params.dataType === 'node') {
      const nodeId = params.data.id
      selectNode(nodeId)
      
      if (linkingMode.value) {
        if (!linkStartNode.value) {
          linkStartNode.value = nodeId
          ElMessage.info(`已选择起始节点: ${params.data.name}`)
        } else {
          if (linkStartNode.value === nodeId) {
            ElMessage.warning('不能连接节点自身')
            linkStartNode.value = null
            return
          }
          
          // 创建新连接
          const newLink: KnowledgeLink = {
            source: linkStartNode.value,
            target: nodeId
          }
          
          // 检查是否已存在连接
          const exists = links.value.some(link => 
            (link.source === newLink.source && link.target === newLink.target) ||
            (link.source === newLink.target && link.target === newLink.source)
          )
          
          if (!exists) {
            links.value.push(newLink)
            history.value.unshift({
              id: Date.now().toString(),
              time: new Date().toLocaleString(),
              desc: `创建连接: ${nodes.value.find(n => n.id === newLink.source)?.name} → ${nodes.value.find(n => n.id === newLink.target)?.name}`,
              color: '#00bcd4'
            })
            updateChart()
            ElMessage.success('连接创建成功')
          } else {
            ElMessage.warning('连接已存在')
          }
          
          linkStartNode.value = null
          linkingMode.value = false
        }
      }
    }
  })
  
  // 右键点击删除节点
  chart.getZr().on('contextmenu', (event: any) => {
    event.preventDefault();
    const point = [event.offsetX, event.offsetY];
    // 获取所有节点的像素位置，判断是否点击在某个节点上
    const seriesData = chart.getOption().series?.[0]?.data || [];
    let foundNodeIndex = -1;
    for (let i = 0; i < seriesData.length; i++) {
      const nodePixel = chart.convertToPixel({ seriesIndex: 0 }, [seriesData[i].x, seriesData[i].y]);
      if (
        Math.abs(point[0] - nodePixel[0]) < seriesData[i].symbolSize &&
        Math.abs(point[1] - nodePixel[1]) < seriesData[i].symbolSize
      ) {
        foundNodeIndex = i;
        break;
      }
    }
    if (foundNodeIndex !== -1) {
      const node = nodes.value[foundNodeIndex];
      if (confirm(`确定要删除节点"${node.name}"吗？`)) {
        deleteNode(node.id);
      }
    }
  });
}

// 8. 更新图表
function updateChart() {
  if (chart) {
    chart.setOption({
      series: [{
        data: nodes.value.map(n => ({ 
          ...n, 
          value: n.symbolSize,
          itemStyle: { color: n.color },
          label: { show: true, formatter: n.name }
        })),
        links: links.value
      }]
    })
  }
}

// 9. 节点创建和编辑
const nodeDlg = ref(false)
const isEditing = ref(false)
const nodeForm = ref({
  id: '',
  name: '',
  type: 'concept',
  desc: '',
  color: '#2d8cf0',
  symbolSize: 60,
  x: 0,
  y: 0
})

const showCreateNodeDialog = () => {
  isEditing.value = false
  nodeForm.value = {
    id: '',
    name: '',
    type: 'concept',
    desc: '',
    color: nodeTypes.value[0].color,
    symbolSize: 60,
    x: Math.random() * 400 + 100,
    y: Math.random() * 300 + 100
  }
  nodeDlg.value = true
}

const editNode = (node: KnowledgeNode) => {
  isEditing.value = true
  nodeForm.value = { ...node }
  nodeDlg.value = true
}

const saveNode = () => {
  if (!nodeForm.value.name.trim()) {
    ElMessage.error('请输入节点名称')
    return
  }

  if (isEditing.value) {
    // 更新现有节点
    const index = nodes.value.findIndex(n => n.id === nodeForm.value.id)
    if (index !== -1) {
      nodes.value[index] = { ...nodeForm.value }
    }
  } else {
    // 创建新节点
    const newNode: KnowledgeNode = {
      ...nodeForm.value,
      id: 'node_' + Date.now().toString()
    }
    nodes.value.push(newNode)
  }

  updateChart()
  nodeDlg.value = false
  ElMessage.success(isEditing.value ? '节点更新成功' : '节点创建成功')
}

// 10. 节点删除
const deleteNode = (nodeId: string) => {
  const nodeIndex = nodes.value.findIndex(n => n.id === nodeId)
  if (nodeIndex === -1) return

  const node = nodes.value[nodeIndex]
  nodes.value.splice(nodeIndex, 1)
  
  // 删除相关连接
  links.value = links.value.filter(link => 
    link.source !== nodeId && link.target !== nodeId
  )

  history.value.unshift({
    id: Date.now().toString(),
    time: new Date().toLocaleString(),
    desc: `删除节点: ${node.name}`,
    color: '#f44336'
  })

  updateChart()
  ElMessage.success('节点删除成功')
}

const deleteSelectedNode = () => {
  if (selectedNode.value) {
    deleteNode(selectedNode.value)
    selectedNode.value = null
  }
}

// 11. 文件上传处理
const handleUpload = ({ file }: { file: File }) => {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const allow = ['pdf', 'ppt', 'pptx', 'mp4', 'zip', 'txt', 'doc', 'docx']
  
  if (!allow.includes(ext)) {
    ElMessage.error('不支持的文件类型')
    return
  }

  const nodeName = file.name.replace(/\.[^.]+$/, '')
  const resourceType = nodeTypes.value.find(t => t.value === 'resource')
  
  const newNode: KnowledgeNode = {
    id: 'res_' + Date.now().toString(),
    name: nodeName,
    x: Math.random() * 400 + 100,
    y: Math.random() * 300 + 100,
    symbolSize: 50,
    color: resourceType?.color || '#64d572',
    desc: `资源文件: ${file.name}`,
    type: 'resource'
  }

  nodes.value.push(newNode)
  updateChart()

  history.value.unshift({
    id: Date.now().toString(),
    time: new Date().toLocaleString(),
    desc: `上传资源: ${file.name}`,
    color: '#64d572'
  })

  ElMessage.success('资源上传成功')
}

// 12. 历史记录
const history = ref([
  { id: '1', time: '2025-06-20 10:12', desc: '新建节点「二次函数」', color: '#00bcd4' },
  { id: '2', time: '2025-06-19 18:45', desc: '上传资源《代数教案》', color: '#64d572' },
])
const histDrawer = ref(false)

// 13. 监视筛选条件变化
watch([selectedNodeTypes, nodeSearch], () => {
  updateChart()
})

// 14. 挂载
onMounted(() => {
  initGraph()
  // 窗口大小变化时重绘图表
  window.addEventListener('resize', () => {
    if (chart) {
      chart.resize()
    }
  })
})
</script>

<style scoped>
.knowledge-page {
  display: flex;
  height: 100vh;
  background: #f5f7fa;
}

.graph-box {
  flex: 1;
  position: relative;
  padding: 12px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
}

.graph {
  width: 100%;
  height: 100%;
}

.toolbar {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 100;
  display: flex;
  gap: 10px;
}

.res-box {
  width: 320px;
  padding: 16px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-panel {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
}

.filter-panel h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.node-list {
  flex: 1;
}

.node-list h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.node-item {
  display: flex;
  align-items: center;
  padding: 8px;
  margin-bottom: 6px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.node-item:hover {
  background-color: #f5f7fa;
}

.node-item.selected {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.node-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 8px;
}

.node-info {
  flex: 1;
}

.node-name {
  font-weight: 500;
  font-size: 14px;
}

.node-type {
  font-size: 12px;
  color: #909399;
}

.node-actions {
  opacity: 0;
  transition: opacity 0.3s;
}

.node-item:hover .node-actions {
  opacity: 1;
}

.upload {
  margin-bottom: 0;
}

.hist-btn {
  align-self: flex-end;
}
</style>