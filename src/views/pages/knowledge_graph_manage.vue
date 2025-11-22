<template>
  <div class="knowledge-graph-management">
    <div class="header">
      <h1>知识图谱管理</h1>
      <div class="actions">
        <el-button type="primary" @click="showAddNodeDialog = true">
          <el-icon><Plus /></el-icon>添加节点
        </el-button>
        <el-button @click="showAddRelationshipDialog = true">
          <el-icon><Connection /></el-icon>添加关系
        </el-button>
        <el-button @click="refreshGraphData">
          <el-icon><Refresh /></el-icon>刷新数据
        </el-button>
        <el-button @click="toggleDragMode" :type="dragMode ? 'success' : ''">
          <el-icon><Position /></el-icon>{{ dragMode ? '退出拖拽模式' : '进入拖拽模式' }}
        </el-button>
        <el-button @click="resetToInitialView" type="warning">
          <el-icon><RefreshLeft /></el-icon>重置视图
        </el-button>
      </div>
    </div>

    <div class="main-content">
      <!-- 左侧知识图谱可视化区域 -->
      <div class="graph-section">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>知识图谱可视化</span>
              <div class="graph-controls">
                <el-button-group>
                  <el-button @click="zoomIn">
                    <el-icon><ZoomIn /></el-icon>
                  </el-button>
                  <el-button @click="zoomOut">
                    <el-icon><ZoomOut /></el-icon>
                  </el-button>
                  <el-button @click="resetView">
                    <el-icon><Refresh /></el-icon>
                  </el-button>
                </el-button-group>
                <div v-if="dragMode" class="drag-mode-indicator">
                  <el-tag type="success" size="small">
                    <el-icon><Position /></el-icon>拖拽模式已启用
                  </el-tag>
                </div>
              </div>
            </div>
          </template>
          
          <div class="graph-container">
            <div class="graph-canvas" ref="graphCanvas"></div>
          </div>
        </el-card>
      </div>

      <!-- 右侧节点列表区域 -->
      <div class="nodes-section">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>节点管理</span>
              <div class="filter-controls">
                <el-input
                  v-model="searchKeyword"
                  placeholder="搜索节点..."
                  clearable
                  @input="filterNodes"
                  style="width: 200px; margin-right: 10px;"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </div>
            </div>
          </template>

          <div class="nodes-list" ref="nodesListContainer">
            <div
              v-for="node in filteredNodes"
              :key="node.id"
              class="node-item"
              :class="{ active: selectedNodeId === node.id }"
              @click="selectNode(node)"
              :ref="setNodeRef"
            >
              <div class="node-header">
                <div class="node-type">
                  <el-tag :type="getNodeTypeTag(node.labels[0])" size="small">
                    {{ getNodeTypeText(node.labels[0]) }}
                  </el-tag>
                </div>
                <div class="node-actions">
                  <el-button
                    type="danger"
                    size="small"
                    text
                    @click.stop="deleteNode(node)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
              
              <div class="node-content">
                <div class="node-name">
                  {{ getNodeName(node) }}
                </div>
                <div class="node-properties">
                  <div
                    v-for="(value, key) in getDisplayProperties(node)"
                    :key="key"
                    class="property-item"
                  >
                    <span class="property-key">{{ getPropertyLabel(key) }}:</span>
                    <span class="property-value">{{ formatPropertyValue(value) }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="filteredNodes.length === 0" class="empty-state">
              <el-empty description="暂无节点数据" />
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 添加节点弹窗 -->
    <el-dialog
      v-model="showAddNodeDialog"
      title="添加节点"
      width="600px"
      @closed="resetAddNodeForm"
    >
      <el-form :model="addNodeForm" label-width="100px">
        <el-form-item label="节点类型" required>
          <el-select v-model="addNodeForm.type" placeholder="选择节点类型">
            <el-option label="概念节点" value="Concept"></el-option>
            <el-option label="资源节点" value="Resource"></el-option>
            <el-option label="章节节点" value="Chapter"></el-option>
          </el-select>
        </el-form-item>

        <!-- 概念节点字段 -->
        <el-form-item v-if="addNodeForm.type === 'Concept'" label="概念名称" required>
          <el-input v-model="addNodeForm.name" placeholder="请输入概念名称" />
        </el-form-item>

        <el-form-item v-if="addNodeForm.type === 'Concept'" label="概念描述">
          <el-input
            v-model="addNodeForm.description"
            type="textarea"
            placeholder="请输入概念描述"
            :rows="3"
          />
        </el-form-item>

        <!-- 章节节点字段 -->
        <el-form-item v-if="addNodeForm.type === 'Chapter'" label="章节名称" required>
          <el-input v-model="addNodeForm.chapterName" placeholder="请输入章节名称" />
        </el-form-item>

        <!-- 资源节点字段 -->
        <el-form-item v-if="addNodeForm.type === 'Resource'" label="文件" required>
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :on-change="handleFileChange"
            :show-file-list="false"
            accept=".mp4,.avi,.mov,.pdf,.ppt,.pptx,.doc,.docx,.txt"
          >
            <el-button type="primary">
              <el-icon><Upload /></el-icon>
              选择文件
            </el-button>
            <template #tip>
              <div class="el-upload__tip">
                支持视频、文档等格式，文件大小不超过100MB
              </div>
            </template>
          </el-upload>
          <div v-if="selectedFile" class="file-info">
            <el-icon><Document /></el-icon>
            {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
          </div>
        </el-form-item>

        <el-form-item v-if="addNodeForm.type === 'Resource'" label="课程名称" required>
          <el-input v-model="addNodeForm.course" placeholder="请输入课程名称" />
        </el-form-item>

        <el-form-item v-if="addNodeForm.type === 'Resource'" label="章节">
          <el-input v-model="addNodeForm.chapter" placeholder="请输入章节名称" />
        </el-form-item>

        <el-form-item v-if="addNodeForm.type === 'Resource'" label="标题" required>
          <el-input v-model="addNodeForm.title" placeholder="请输入资源标题" />
        </el-form-item>

        <el-form-item v-if="addNodeForm.type === 'Resource'" label="作者">
          <el-input v-model="addNodeForm.author" placeholder="请输入作者姓名" />
        </el-form-item>

        <el-form-item v-if="addNodeForm.type === 'Resource'" label="关键词">
          <el-input 
            v-model="addNodeForm.keyword" 
            placeholder="请输入关键词，多个关键词用逗号分隔"
          />
        </el-form-item>

        <el-form-item v-if="addNodeForm.type === 'Resource'" label="自动提取">
          <el-switch v-model="addNodeForm.auto_extract" />
          <span class="switch-label">自动从文件中提取元数据</span>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddNodeDialog = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="addNode" 
          :loading="addingNode"
          :disabled="isResourceFormInvalid"
        >
          添加
        </el-button>
      </template>
    </el-dialog>

    <!-- 添加关系弹窗 -->
    <el-dialog
      v-model="showAddRelationshipDialog"
      title="添加关系"
      width="500px"
      @closed="resetAddRelationshipForm"
    >
      <el-form :model="addRelationshipForm" label-width="80px">
        <el-form-item label="起始节点" required>
          <el-select v-model="addRelationshipForm.source" placeholder="选择起始节点">
            <el-option
              v-for="node in allNodes"
              :key="node.id"
              :label="getNodeName(node)"
              :value="getNodeName(node)"
            ></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="关系类型" required>
          <el-select v-model="addRelationshipForm.type" placeholder="选择关系类型">
            <el-option label="包含" value="CONTAINS"></el-option>
            <el-option label="依赖" value="DEPENDS_ON"></el-option>
            <el-option label="关联" value="RELATED_TO"></el-option>
            <el-option label="属于" value="BELONGS_TO"></el-option>
            <el-option label="关键字" value="HAS_KEYWORD"></el-option>
            <el-option label="包含" value="INCLUDES"></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="目标节点" required>
          <el-select v-model="addRelationshipForm.target" placeholder="选择目标节点">
            <el-option
              v-for="node in allNodes"
              :key="node.id"
              :label="getNodeName(node)"
              :value="getNodeName(node)"
            ></el-option>
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddRelationshipDialog = false">取消</el-button>
        <el-button type="primary" @click="addRelationship" :loading="addingRelationship">
          添加
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import {
  Plus,
  Refresh,
  ZoomIn,
  ZoomOut,
  Search,
  Delete,
  Connection,
  Upload,
  Document,
  Position,
  RefreshLeft
} from '@element-plus/icons-vue'

// 类型定义
interface GraphNode {
  id: string
  labels: string[]
  properties: Record<string, any>
  x?: number
  y?: number
  fixed?: boolean
}

interface GraphRelationship {
  id: string
  start_node_id: string
  end_node_id: string
  type: string
  properties: Record<string, any>
}

interface GraphData {
  nodes: GraphNode[]
  relationships: GraphRelationship[]
}

// 响应式数据
const graphCanvas = ref<HTMLElement>()
const nodesListContainer = ref<HTMLElement>()
let chart: echarts.ECharts | null = null
const graphData = ref<GraphData>({ nodes: [], relationships: [] })
const allNodes = ref<GraphNode[]>([])
const filteredNodes = ref<GraphNode[]>([])
const selectedNodeId = ref<string>('')
const searchKeyword = ref('')
const uploadRef = ref()
const selectedFile = ref<File | null>(null)
const dragMode = ref(false) // 拖拽模式状态
const nodePositions = ref<Map<string, { x: number; y: number; fixed: boolean }>>(new Map()) // 保存节点位置

// 添加节点refs映射
const nodeRefs = ref<Map<string, HTMLElement>>(new Map())
// 弹窗控制
const showAddNodeDialog = ref(false)
const showAddRelationshipDialog = ref(false)
const addingNode = ref(false)
const addingRelationship = ref(false)

// 当前可见的节点ID集合
const visibleNodeIds = ref<Set<string>>(new Set())

// 表单数据
const addNodeForm = ref({
  type: '',
  name: '',
  description: '',
  chapterName: '',
  course: '',
  chapter: '',
  title: '',
  author: '',
  keyword: '',
  auto_extract: true
})

const addRelationshipForm = ref({
  source: '',
  type: '',
  target: ''
})

// 定义每种节点类型应该显示的属性
const nodeDisplayProperties = {
  Resource: ['title', 'course', 'chapter', 'author', 'keyword', 'file_type', 'file_size', 'upload_time'],
  Concept: ['name', 'description'],
  Chapter: ['name']
}

// 定义属性标签映射（将属性键转换为更友好的中文标签）
const propertyLabels: Record<string, string> = {
  'title': '标题',
  'course': '课程',
  'chapter': '章节',
  'author': '作者',
  'keyword': '关键词',
  'file_type': '文件类型',
  'file_size': '文件大小',
  'upload_time': '上传时间',
  'name': '名称',
  'description': '描述',
  'student_id': '学号',
  'student_name': '学生姓名',
  'status': '状态',
  'progress': '进度'
}

const setNodeRef = (el: any) => {
  if (el && el.__vnode) {
    const nodeId = el.__vnode.key as string
    if (nodeId) {
      nodeRefs.value.set(nodeId, el)
    }
  }
}

// 计算属性
const isResourceFormInvalid = computed(() => {
  if (addNodeForm.value.type !== 'Resource') return false
  return !selectedFile.value || 
         !addNodeForm.value.course || 
         !addNodeForm.value.title
})

// 方法定义
const loadGraphData = async () => {
  try {
    const response = await fetch('http://patrickshao.site:8000/knowledge-graph/graph-data', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`获取数据失败: ${response.status}`)
    }

    const data = await response.json()
    
    // 过滤掉学生节点和学习记录节点
    const filteredData = {
      nodes: data.nodes.filter((node: GraphNode) => 
        !node.labels.includes('Student') && !node.labels.includes('LearningRecord')
      ),
      relationships: data.relationships
    }
    
    graphData.value = filteredData
    allNodes.value = filteredData.nodes
    
    // 初始只显示章节节点
    initializeVisibleNodes()
    
    initChart()
    ElMessage.success('数据加载成功')
  } catch (error) {
    console.error('加载知识图谱数据失败:', error)
    ElMessage.error('数据加载失败')
  }
}

// 获取应该显示的属性
const getDisplayProperties = (node: GraphNode): Record<string, any> => {
  const nodeType = node.labels[0]
  const displayProps = nodeDisplayProperties[nodeType as keyof typeof nodeDisplayProperties] || []
  const filteredProperties: Record<string, any> = {}
  
  displayProps.forEach(prop => {
    if (node.properties[prop] !== undefined && node.properties[prop] !== null && node.properties[prop] !== '') {
      filteredProperties[prop] = node.properties[prop]
    }
  })
  
  return filteredProperties
}

// 获取属性标签
const getPropertyLabel = (propertyKey: string): string => {
  return propertyLabels[propertyKey] || propertyKey
}

// 初始化可见节点（只显示章节节点）
const initializeVisibleNodes = () => {
  visibleNodeIds.value.clear()
  // 添加所有章节节点
  allNodes.value.forEach(node => {
    if (node.labels.includes('Chapter')) {
      visibleNodeIds.value.add(node.id)
    }
  })
  filterNodes()
}

// 获取相邻节点（通过关系连接的节点）
const getAdjacentNodes = (nodeId: string): Set<string> => {
  const adjacentNodeIds = new Set<string>()
  
  graphData.value.relationships.forEach(relationship => {
    if (relationship.start_node_id === nodeId) {
      adjacentNodeIds.add(relationship.end_node_id)
    }
    if (relationship.end_node_id === nodeId) {
      adjacentNodeIds.add(relationship.start_node_id)
    }
  })
  
  return adjacentNodeIds
}

// 展开节点（显示该节点及其相邻节点）
const expandNode = (nodeId: string) => {
  const adjacentNodes = getAdjacentNodes(nodeId)
  
  // 添加当前节点和相邻节点到可见集合
  visibleNodeIds.value.add(nodeId)
  adjacentNodes.forEach(adjacentId => {
    visibleNodeIds.value.add(adjacentId)
  })
  
  filterNodes()
}

const initChart = () => {
  if (!graphCanvas.value) return

  chart = echarts.init(graphCanvas.value)
  
  const categories = [
    { name: 'Concept' },
    { name: 'Resource' },
    { name: 'Chapter' }
  ]

  // 准备节点数据，只显示可见节点
  const nodeData = filteredNodes.value.map(node => {
    const nodeId = node.id
    const savedPosition = nodePositions.value.get(nodeId)
    
    return {
      id: node.id,
      name: getNodeName(node),
      category: node.labels[0],
      symbolSize: getNodeSize(node.labels[0]),
      itemStyle: {
        color: getNodeColor(node.labels[0])
      },
      label: {
        show: true,
        position: 'right',
        formatter: '{b}',
        fontSize: 12
      },
      x: savedPosition?.x,
      y: savedPosition?.y,
      fixed: savedPosition?.fixed || false,
      ...node
    }
  })

  // 准备关系数据，只显示两个端点都可见的关系
  const visibleRelationships = graphData.value.relationships.filter(rel => 
    visibleNodeIds.value.has(rel.start_node_id) && visibleNodeIds.value.has(rel.end_node_id)
  )

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          const node = params.data as GraphNode
          const displayProperties = getDisplayProperties(node)
          return `
            <div style="text-align: left; max-width: 300px;">
              <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px; color: #409eff;">${getNodeName(node)}</div>
              <div style="margin-bottom: 6px; font-size: 12px; color: #909399;">类型: ${getNodeTypeText(node.labels[0])}</div>
              ${Object.entries(displayProperties).map(([key, value]) => 
                `<div style="margin-bottom: 4px; font-size: 12px;">
                  <span style="color: #606266; font-weight: 500;">${getPropertyLabel(key)}:</span>
                  <span style="color: #303133;">${formatPropertyValue(value)}</span>
                </div>`
              ).join('')}
            </div>
          `
        } else if (params.dataType === 'edge') {
          const relationship = params.data.relationship
          return `
            <div style="text-align: left;">
              <div style="font-weight: bold; margin-bottom: 5px;">关系类型: ${getRelationshipLabel(relationship.type)}</div>
              <div>起始节点: ${getNodeNameById(relationship.start_node_id)}</div>
              <div>目标节点: ${getNodeNameById(relationship.end_node_id)}</div>
              ${Object.entries(relationship.properties).map(([key, value]) => 
                `<div>${key}: ${formatPropertyValue(value)}</div>`
              ).join('')}
            </div>
          `
        }
        return ''
      }
    },
    series: [{
      type: 'graph',
      layout: 'force',
      force: {
        repulsion: 200,
        gravity: 0.1,
        edgeLength: 100,
        layoutAnimation: true
      },
      data: nodeData,
      links: visibleRelationships.map(rel => ({
        source: rel.start_node_id,
        target: rel.end_node_id,
        relationship: rel,
        lineStyle: {
          color: '#aaa',
          width: 2,
          curveness: 0.3
        },
        label: {
          show: false,
          formatter: getRelationshipLabel(rel.type),
          fontSize: 10,
          backgroundColor: '#fff',
          borderColor: '#ddd',
          borderWidth: 1,
          borderRadius: 4,
          padding: [4, 6],
          color: '#333'
        },
        emphasis: {
          lineStyle: {
            width: 3,
            color: '#409eff'
          },
          label: {
            show: true,
            formatter: getRelationshipLabel(rel.type),
            fontSize: 10,
            fontWeight: 'normal',
            backgroundColor: '#fff',
            color: '#333',
            borderColor: '#ddd',
            borderWidth: 1,
            borderRadius: 4,
            padding: [4, 6]
          }
        }
      })),
      categories: categories,
      roam: true,
      focusNodeAdjacency: true,
      lineStyle: {
        color: 'source',
        curveness: 0.3
      },
      emphasis: {
        focus: 'adjacency',
        lineStyle: {
          width: 4
        }
      },
      edgeLabel: {
        show: false
      },
      // 启用拖拽功能
      draggable: dragMode.value
    }]
  }

  chart.setOption(option)

  // 添加点击事件
  chart.on('click', (params: any) => {
    if (params.dataType === 'node') {
      selectNode(params.data)
    }
  })

  // 添加双击事件（展开节点）
  chart.on('dblclick', (params: any) => {
    if (params.dataType === 'node') {
      expandNode(params.data.id)
    }
  })

  // 添加拖拽事件监听
  chart.on('drag', (params: any) => {
    if (params.dataType === 'node') {
      // 保存节点位置
      const nodeId = params.data.id
      const position = {
        x: params.data.x,
        y: params.data.y,
        fixed: true // 拖拽后固定位置
      }
      nodePositions.value.set(nodeId, position)
    }
  })

  // 拖拽结束事件
  chart.on('dragend', (params: any) => {
    if (params.dataType === 'node') {
      ElMessage.success('节点位置已更新')
    }
  })

  // 鼠标悬停事件
  chart.on('mouseover', (params: any) => {
    if (params.dataType === 'edge') {
      chart.dispatchAction({
        type: 'highlight',
        edgeIndex: params.dataIndex
      })
    }
  })

  chart.on('mouseout', (params: any) => {
    if (params.dataType === 'edge') {
      chart.dispatchAction({
        type: 'downplay',
        edgeIndex: params.dataIndex
      })
    }
  })
}

// 切换拖拽模式
const toggleDragMode = () => {
  dragMode.value = !dragMode.value
  
  if (chart) {
    // 更新图表选项，启用或禁用拖拽
    chart.setOption({
      series: [{
        draggable: dragMode.value
      }]
    })
    
    if (dragMode.value) {
      ElMessage.success('拖拽模式已启用，可以拖动节点调整位置')
    } else {
      ElMessage.info('已退出拖拽模式')
    }
  }
}

// 重置所有节点位置
const resetNodePositions = () => {
  nodePositions.value.clear()
  if (chart) {
    initChart()
    ElMessage.success('节点位置已重置')
  }
}

// 重置到初始视图（只显示章节节点）
const resetToInitialView = () => {
  initializeVisibleNodes()
  if (chart) {
    initChart()
  }
  ElMessage.success('已重置到初始视图')
}

// 根据关系类型获取显示标签
const getRelationshipLabel = (type: string): string => {
  const labelMap: Record<string, string> = {
    'CONTAINS': '包含',
    'DEPENDS_ON': '依赖',
    'RELATED_TO': '关联',
    'BELONGS_TO': '属于',
    'HAS_KEYWORD': '关键字',
    'INCLUDES': '包含'
  }
  return labelMap[type] || type
}

// 添加根据节点ID获取节点名称的辅助函数
const getNodeNameById = (nodeId: string): string => {
  const node = allNodes.value.find(n => n.id === nodeId)
  return node ? getNodeName(node) : '未知节点'
}

const getNodeName = (node: GraphNode): string => {
  if (node.labels.includes('Concept')) {
    return node.properties.name || '未命名概念'
  } else if (node.labels.includes('Resource')) {
    return node.properties.title || node.properties.filename || '未命名资源'
  } else if (node.labels.includes('Chapter')) {
    return node.properties.name || '未命名章节'
  }
  return node.id
}

const getNodeTypeText = (type: string): string => {
  const typeMap: Record<string, string> = {
    'Concept': '概念节点',
    'Resource': '资源节点',
    'Chapter': '章节节点'
  }
  return typeMap[type] || type
}

const getNodeTypeTag = (type: string): string => {
  const tagMap: Record<string, string> = {
    'Concept': 'success',
    'Resource': 'info',
    'Chapter': 'danger'
  }
  return tagMap[type] || 'info'
}

const getNodeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    'Concept': '#67c23a',
    'Resource': '#409eff',
    'Chapter': '#f56c6c'
  }
  return colorMap[type] || '#909399'
}

const getNodeSize = (type: string): number => {
  const sizeMap: Record<string, number> = {
    'Concept': 40,
    'Resource': 35,
    'Chapter': 50
  }
  return sizeMap[type] || 30
}

const formatPropertyValue = (value: any): string => {
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  if (typeof value === 'string' && value.length > 50) {
    return value.substring(0, 50) + '...'
  }
  return String(value)
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const selectNode = async (node: GraphNode) => {
  selectedNodeId.value = node.id
  if (chart) {
    const nodeIndex = filteredNodes.value.findIndex(n => n.id === node.id)
    if (nodeIndex !== -1) {
      chart.dispatchAction({
        type: 'focusNodeAdjacency',
        dataIndex: nodeIndex
      })
    }
  }
  await nextTick()
  scrollToNode(node.id)
}

const scrollToNode = (nodeId: string) => {
  const nodeElement = nodeRefs.value.get(nodeId)
  const container = nodesListContainer.value
  
  if (nodeElement && container) {
    const containerRect = container.getBoundingClientRect()
    const nodeRect = nodeElement.getBoundingClientRect()
    const containerScrollTop = container.scrollTop
    
    const nodeTop = nodeRect.top - containerRect.top + containerScrollTop
    const nodeBottom = nodeRect.bottom - containerRect.top + containerScrollTop
    
    if (nodeTop < containerScrollTop || nodeBottom > containerScrollTop + containerRect.height) {
      const scrollTo = nodeTop - containerRect.height * 0.1
      container.scrollTo({
        top: scrollTo,
        behavior: 'smooth'
      })
    }
  }
}

const filterNodes = () => {
  // 首先根据可见节点ID过滤
  let filtered = allNodes.value.filter(node => visibleNodeIds.value.has(node.id))
  
  // 然后根据关键词搜索过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(node => 
      getNodeName(node).toLowerCase().includes(keyword) ||
      JSON.stringify(node.properties).toLowerCase().includes(keyword)
    )
  }
  
  filteredNodes.value = filtered
  
  if (chart) {
    initChart()
  }
}

const handleFileChange = (file: any) => {
  selectedFile.value = file.raw
  if (!addNodeForm.value.title && file.name) {
    addNodeForm.value.title = file.name.replace(/\.[^/.]+$/, "")
  }
}

const addNode = async () => {
  addingNode.value = true
  
  try {
    let url = ''
    
    switch (addNodeForm.value.type) {
      case 'Concept':
        url = `http://patrickshao.site:8000/knowledge-graph/concepts?name=${encodeURIComponent(addNodeForm.value.name)}&description=${encodeURIComponent(addNodeForm.value.description || '')}`
        break
      case 'Chapter':
        url = `http://patrickshao.site:8000/knowledge-graph/chapters?name=${encodeURIComponent(addNodeForm.value.chapterName)}`
        break
      case 'Resource':
        await uploadResource()
        showAddNodeDialog.value = false
        ElMessage.success('资源上传成功')
        await loadGraphData()
        addingNode.value = false
        return
      default:
        throw new Error('不支持的节点类型')
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`添加节点失败: ${response.status}`)
    }
    
    await response.json()
    showAddNodeDialog.value = false
    ElMessage.success('节点添加成功')
    await loadGraphData()
  } catch (error) {
    console.error('添加节点失败:', error)
    ElMessage.error('节点添加失败')
  } finally {
    addingNode.value = false
  }
}

const uploadResource = async () => {
  if (!selectedFile.value) {
    throw new Error('请选择要上传的文件')
  }

  const formData = new FormData()
  formData.append('file', selectedFile.value)
  formData.append('course', addNodeForm.value.course)
  formData.append('chapter', addNodeForm.value.chapter)
  formData.append('title', addNodeForm.value.title)
  formData.append('author', addNodeForm.value.author)
  formData.append('keyword', addNodeForm.value.keyword)
  formData.append('auto_extract', addNodeForm.value.auto_extract.toString())

  const response = await fetch('http://patrickshao.site:8000/api/v1/resources/upload', {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    throw new Error(`文件上传失败: ${response.status}`)
  }

  return await response.json()
}

const addRelationship = async () => {
  addingRelationship.value = true
  
  try {
    const url = `http://patrickshao.site:8000/knowledge-graph/relationships?concept1=${encodeURIComponent(addRelationshipForm.value.source)}&relationship=${encodeURIComponent(addRelationshipForm.value.type)}&concept2=${encodeURIComponent(addRelationshipForm.value.target)}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`添加关系失败: ${response.status}`)
    }
    
    await response.json()
    showAddRelationshipDialog.value = false
    ElMessage.success('关系添加成功')
    await loadGraphData()
  } catch (error) {
    console.error('添加关系失败:', error)
    ElMessage.error('关系添加失败')
  } finally {
    addingRelationship.value = false
  }
}

const deleteNode = async (node: GraphNode) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除节点 "${getNodeName(node)}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    let url = ''
    
    if (node.labels.includes('Concept')) {
      const conceptName = node.properties.name || getNodeName(node)
      url = `http://patrickshao.site:8000/knowledge-graph/concepts/${encodeURIComponent(conceptName)}`
    } else if (node.labels.includes('Chapter')) {
      const chapterName = node.properties.name || getNodeName(node)
      url = `http://patrickshao.site:8000/knowledge-graph/chapters/${encodeURIComponent(chapterName)}`
    } else {
      url = `http://patrickshao.site:8000/knowledge-graph/nodes/${encodeURIComponent(node.id)}`
    }
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`删除节点失败: ${response.status}`)
    }
    
    await response.json()
    ElMessage.success('节点删除成功')
    await loadGraphData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除节点失败:', error)
      ElMessage.error('节点删除失败')
    }
  }
}

const resetAddNodeForm = () => {
  addNodeForm.value = {
    type: '',
    name: '',
    description: '',
    chapterName: '',
    course: '',
    chapter: '',
    title: '',
    author: '',
    keyword: '',
    auto_extract: true
  }
  selectedFile.value = null
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

const resetAddRelationshipForm = () => {
  addRelationshipForm.value = {
    source: '',
    type: '',
    target: ''
  }
}

const zoomIn = () => {
  if (chart) {
    chart.dispatchAction({
      type: 'zoom',
      scale: 1.2
    })
  }
}

const zoomOut = () => {
  if (chart) {
    chart.dispatchAction({
      type: 'zoom',
      scale: 0.8
    })
  }
}

const resetView = () => {
  if (chart) {
    // 重置视图但不重置可见节点
    chart.dispatchAction({
      type: 'restore'
    })
    ElMessage.success('视图已重置')
  }
}

const refreshGraphData = () => {
  loadGraphData()
}

const handleResize = () => {
  if (chart) {
    chart.resize()
  }
}

// 生命周期
onMounted(() => {
  nextTick(() => {
    loadGraphData()
    window.addEventListener('resize', handleResize)
  })
})
</script>

<style scoped>
.knowledge-graph-management {
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e4e7ed;
}

.header h1 {
  margin: 0;
  color: #303133;
}

.actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.main-content {
  flex: 1;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  min-height: 0;
}

.graph-section,
.nodes-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.graph-controls {
  display: flex;
  gap: 5px;
  align-items: center;
}

.drag-mode-indicator {
  margin-left: 10px;
}

.filter-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.graph-container {
  flex: 1;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background-color: #f8f9fa;
  min-height: 500px;
  cursor: move;
}

.graph-canvas {
  width: 100%;
  height: 100%;
  min-height: 500px;
}

.nodes-list {
  flex: 1;
  overflow-y: auto;
  max-height: 600px;
  scrollbar-width: thin;
  scrollbar-color: #c0c4cc #f5f7fa;
}

.node-item {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
}

.node-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.node-item.active {
  border-color: #409eff;
  background-color: #f0f7ff;
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.node-actions {
  opacity: 0;
  transition: opacity 0.3s;
}

.node-item:hover .node-actions {
  opacity: 1;
}

.node-content {
  padding: 8px 0;
}

.node-name {
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
  font-size: 14px;
  line-height: 1.4;
}

.node-properties {
  font-size: 12px;
  color: #606266;
}

.property-item {
  display: flex;
  margin-bottom: 4px;
  line-height: 1.4;
}

.property-key {
  font-weight: 500;
  margin-right: 6px;
  min-width: 60px;
  color: #909399;
  flex-shrink: 0;
}

.property-value {
  flex: 1;
  word-break: break-word;
  color: #606266;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
}

.file-info {
  margin-top: 8px;
  padding: 8px;
  background-color: #f5f7fa;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch-label {
  margin-left: 8px;
  font-size: 14px;
  color: #606266;
}

@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
  }
  
  .graph-container,
  .graph-canvas {
    min-height: 400px;
  }
  
  .actions {
    flex-wrap: wrap;
  }
}
</style>