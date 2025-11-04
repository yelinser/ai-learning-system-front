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

    <!-- 右侧 -->
    <div class="res-box">
      <!-- 节点类型筛选 -->
      <div class="filter-panel">
        <h4>节点类型筛选</h4>
        <el-checkbox-group v-model="selectedNodeTypes">
          <el-checkbox v-for="type in nodeTypes" :key="type.value" :label="type.value" :style="{ color: type.color }">
            {{ type.label }} ({{ getNodeCountByType(type.value) }})
          </el-checkbox>
        </el-checkbox-group>
      </div>

      <!-- 上传 -->
      <el-upload class="upload" drag multiple :show-file-list="false" :http-request="handleUpload"
        accept=".pdf,.ppt,.pptx,.mp4,.zip,.txt,.doc,.docx">
        <el-icon class="el-icon--upload">
          <UploadFilled />
        </el-icon>
        <div>拖拽或点击上传资源</div>
        <template #tip>
          <div class="el-upload__tip">支持pdf,ppt,pptx,mp4,zip,txt,doc,docx等格式</div>
        </template>
      </el-upload>

      <!-- 节点列表 -->
      <div class="node-list">
        <h4>节点列表 ({{ filteredNodes.length }})</h4>
        <el-input v-model="nodeSearch" placeholder="搜索节点..." clearable prefix-icon="Search" size="small"
          style="margin-bottom: 10px" />
        <el-scrollbar height="280px">
          <div v-for="node in filteredNodes" :key="node.id" class="node-item"
            :class="{ selected: selectedNode === node.id }" @click="selectNode(node.id)"
            @dblclick="focusOnNode(node.id)">
            <div class="node-color" :style="{ backgroundColor: node.color }"></div>
            <div class="node-info">
              <div class="node-name">{{ node.name }}</div>
              <div class="node-type">{{ getNodeTypeLabel(node.type) }}</div>
            </div>
            <div class="node-actions">
              <el-button link type="primary" @click.stop="editNode(node)">编辑</el-button>
              <el-button link type="danger" @click.stop="deleteNode(node.id)">删除</el-button>
              <!-- 资源独有 -->
              <el-button v-if="node.resourceId" link type="primary" @click.stop="downloadRes(node.resourceId)">下载
              </el-button>
              <el-button v-if="node.resourceId" link @click.stop="extractK(node.resourceId)">提取知识点</el-button>
            </div>
          </div>
        </el-scrollbar>
      </div>

      <!-- 历史记录入口 -->
      <el-button class="hist-btn" text @click="histDrawer = true">版本历史</el-button>
    </div>

    <!-- 历史抽屉 -->
    <el-drawer v-model="histDrawer" title="版本历史" direction="rtl" size="400">
      <el-timeline>
        <el-timeline-item v-for="h in history" :key="h.id" :timestamp="h.time" :color="h.color">
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
            <el-option v-for="type in nodeTypes" :key="type.value" :label="type.label" :value="type.value">
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
import axios from 'axios'

const BASE = 'http://patrickshao.site:8000'

/* ========== 资源管理接口封装（统一规范） ========== */
const ResourceAPI = {
  list: () => $get('/api/v1/resources/'),
  upload: (form: FormData) =>
    $post('/api/v1/resources/upload', form, {
      'Content-Type': 'multipart/form-data',
    }),
  delete: (id: string) => $del(`/api/v1/resources/${id}`),
  download: (id: string) =>
    axios.get(`${BASE}/api/v1/resources/${id}/download`, { responseType: 'blob' }),
  extract: (id: string) => $post(`/api/v1/resources/${id}/auto-extract-knowledge`),
}

/* ========== 2. 内联工具：get/post/put/delete ========== */
const $get = (url: string) => axios.get(BASE + url).then(r => r.data)
const $post = (url: string, data?: any, headers?: any) =>
  axios.post(BASE + url, data, { headers }).then(r => r.data)
const $del = (url: string) => axios.delete(BASE + url).then(r => r.data)

/* ========== 3. 接口（不封装文件，直接函数） ========== */
/* 知识图谱 */
const getConcepts = () => $get('/concepts')
const getRelations = () => $get('/relationships')
const addConcept = (body: { name: string; description?: string }) => $post('/concepts', body)
const delConcept = (name: string) => $del(`/concepts/${encodeURIComponent(name)}`)

/* 资源模块 */
/* 资源模块 - 改为真实接口路径 */
const listResources = () => $get('/api/v1/resources/') as Promise<Resource[]>

const uploadResource = (form: FormData) =>
  $post('/api/v1/resources/upload', form, {
    'Content-Type': 'multipart/form-data',
  }) as Promise<Resource>

const deleteResource = (id: string) => $del(`/api/v1/resources/${id}`)

const downloadResource = (id: string) =>
  axios.get(`${BASE}/api/v1/resources/${id}/download`, {
    responseType: 'blob',
  })

const autoExtractKnowledge = (id: string) =>
  $post(`/api/v1/resources/${id}/auto-extract-knowledge`)

/* ========== 4. 类型 ========== */
interface Resource {
  id: string
  title: string
  filename: string
  course: string
  chapter: string
}
interface KnowledgeNode {
  id: string
  name: string
  x: number
  y: number
  symbolSize: number
  color: string
  desc: string
  type: string
  resourceId?: string // 资源节点特有
}
interface KnowledgeLink {
  source: string
  target: string
}

/* ========== 5. 响应式数据 ========== */
const graphRef = ref<HTMLDivElement>()
let chart: echarts.ECharts

const nodeTypes = ref([
  { value: 'concept', label: '概念', color: '#2d8cf0' },
  { value: 'resource', label: '资源', color: '#00bcd4' },
  { value: 'knowledge1', label: '一级知识点', color: '#64d572' },
  { value: 'knowledge2', label: '二级知识点', color: '#f25e43' },
  { value: 'knowledge3', label: '三级知识点', color: '#ff9f40' },
])

const selectedNodeTypes = ref(['concept', 'resource', 'knowledge1', 'knowledge2', 'knowledge3'])
const nodeSearch = ref('')
const selectedNode = ref<string | null>(null)
const linkingMode = ref(false)
const linkStartNode = ref<string | null>(null)

const nodes = ref<KnowledgeNode[]>([])
const links = ref<KnowledgeLink[]>([])

const filteredNodes = computed(() =>
  nodes.value.filter(
    node =>
      selectedNodeTypes.value.includes(node.type) &&
      node.name.toLowerCase().includes(nodeSearch.value.toLowerCase()),
  ),
)

const history = ref<{ id: string; time: string; desc: string; color: string }[]>([])
const histDrawer = ref(false)

/* ========== 6. 工具函数 ========== */
const getNodeCountByType = (type: string) => nodes.value.filter(n => n.type === type).length
const getNodeTypeLabel = (type: string) => nodeTypes.value.find(t => t.value === type)?.label || type

const selectNode = (id: string) => {
  selectedNode.value = id
  highlightNode(id)
}
const focusOnNode = (id: string) => {
  const idx = nodes.value.findIndex(n => n.id === id)
  if (idx >= 0 && chart) chart.dispatchAction({ type: 'focusNodeAdjacency', dataIndex: idx })
}
const highlightNode = (id: string) => {
  const idx = nodes.value.findIndex(n => n.id === id)
  if (idx >= 0 && chart) chart.dispatchAction({ type: 'highlight', dataIndex: idx })
}
const pushHistory = (desc: string) => {
  history.value.unshift({ id: Date.now().toString(), time: new Date().toLocaleString(), desc, color: '#00bcd4' })
}

/* ========== 7. 图谱初始化 ========== */
function initGraph() {
  if (!graphRef.value) return
  chart = echarts.init(graphRef.value)
  const option: ECBasicOption = {
    backgroundColor: 'transparent',
    tooltip: {
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          const node = nodes.value.find(n => n.id === params.data.id)!
          return `<div style="padding:8px">
            <div style="font-weight:bold;margin-bottom:4px">${params.data.name}</div>
            <div style="color:#666;font-size:12px">类型：${getNodeTypeLabel(node.type)}</div>
            ${node.desc ? `<div style="color:#666;font-size:12px">描述：${node.desc}</div>` : ''}
          </div>`
        }
        return params.dataType === 'edge' ? `关联：${params.data.source} → ${params.data.target}` : ''
      },
    },
    animationDurationUpdate: 300,
    series: [
      {
        type: 'graph',
        layout: 'force',
        force: { repulsion: 600, edgeLength: 200, gravity: 0.05 },
        roam: true,
        draggable: true,
        data: nodes.value.map(n => ({
          ...n,
          symbolSize: n.symbolSize || 24,
          itemStyle: { color: n.color },
          label: { show: true, formatter: n.name },
        })),
        links: links.value,
        lineStyle: { color: 'source', width: 3, curveness: 0.3 },
        emphasis: { focus: 'adjacency', lineStyle: { width: 5 } },
      },
    ],
  }
  chart.setOption(option)

  chart.on('click', (params: any) => {
    if (params.dataType !== 'node') return
    const id = params.data.id
    selectNode(id)
    if (!linkingMode.value) return
    if (!linkStartNode.value) {
      linkStartNode.value = id
      ElMessage.info(`已选起始节点：${params.data.name}`)
      return
    }
    if (linkStartNode.value === id) {
      ElMessage.warning('不能连接自身')
      linkStartNode.value = null
      return
    }
    const newLink: KnowledgeLink = { source: linkStartNode.value, target: id }
    const exist = links.value.some(
      l =>
        (l.source === newLink.source && l.target === newLink.target) ||
        (l.source === newLink.target && l.target === newLink.source),
    )
    if (!exist) {
      links.value.push(newLink)
      pushHistory(`创建连接：${nodes.value.find(n => n.id === newLink.source)?.name} → ${nodes.value.find(n => n.id === newLink.target)?.name}`)
      updateChart()
      ElMessage.success('连接成功')
    } else ElMessage.warning('连接已存在')
    linkingMode.value = false
    linkStartNode.value = null
  })

  chart.getZr().on('contextmenu', (ev: any) => {
    ev.preventDefault()
    const point = [ev.offsetX, ev.offsetY]
    const seriesData: any[] = chart.getOption().series![0].data as any[]
    let idx = -1
    for (let i = 0; i < seriesData.length; i++) {
      const px = chart.convertToPixel({ seriesIndex: 0 }, [seriesData[i].x, seriesData[i].y])
      if (Math.abs(point[0] - px[0]) < seriesData[i].symbolSize && Math.abs(point[1] - px[1]) < seriesData[i].symbolSize) {
        idx = i
        break
      }
    }
    if (idx >= 0) {
      const node = nodes.value[idx]
      if (confirm(`确定删除节点「${node.name}」？`)) deleteNode(node.id)
    }
  })
}

function updateChart() {
  if (!chart) return
  chart.setOption({
    series: [
      {
        data: nodes.value.map(n => ({
          ...n,
          value: n.symbolSize,
          itemStyle: { color: n.color },
          label: { show: true, formatter: n.name },
        })),
        links: links.value,
      },
    ],
  })
}

/* ========== 8. 节点增删改 ========== */
const nodeDlg = ref(false)
const isEditing = ref(false)
const nodeForm = ref<KnowledgeNode>({
  id: '',
  name: '',
  type: 'concept',
  desc: '',
  color: '#2d8cf0',
  symbolSize: 60,
  x: 0,
  y: 0,
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
    y: Math.random() * 300 + 100,
  }
  nodeDlg.value = true
}
const editNode = (node: KnowledgeNode) => {
  isEditing.value = true
  nodeForm.value = { ...node }
  nodeDlg.value = true
}
const saveNode = async () => {
  if (!nodeForm.value.name.trim()) return ElMessage.error('请输入名称')
  if (isEditing.value) {
    const idx = nodes.value.findIndex(n => n.id === nodeForm.value.id)
    if (idx >= 0) nodes.value[idx] = { ...nodeForm.value }
    pushHistory(`编辑节点：${nodeForm.value.name}`)
  } else {
    await addConcept({ name: nodeForm.value.name, description: nodeForm.value.desc })
    const newNode: KnowledgeNode = { ...nodeForm.value, id: 'node_' + Date.now() }
    nodes.value.push(newNode)
    pushHistory(`新建节点：${newNode.name}`)
  }
  updateChart()
  nodeDlg.value = false
  ElMessage.success(isEditing.value ? '保存成功' : '创建成功')
}

const deleteNode = async (id: string) => {
  const idx = nodes.value.findIndex(n => n.id === id)
  if (idx < 0) return
  const node = nodes.value[idx]
  if (node.type === 'concept') await delConcept(node.name)
  else await $del(`/nodes/${id}`)
  nodes.value.splice(idx, 1)
  links.value = links.value.filter(l => l.source !== id && l.target !== id)
  pushHistory(`删除节点：${node.name}`)
  updateChart()
  ElMessage.success('删除成功')
}
const deleteSelectedNode = () => {
  if (selectedNode.value) {
    deleteNode(selectedNode.value)
    selectedNode.value = null
  }
}

/* ========== 9. 文件上传（对接真实接口） ========== */
/* ========== 9. 文件上传（对接真实接口） ========== */
const handleUpload = async ({ file }: { file: File }) => {
  const allow = ['pdf', 'ppt', 'pptx', 'mp4', 'zip', 'txt', 'doc', 'docx']
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (!allow.includes(ext)) return ElMessage.error('不支持的文件类型')

const form = new FormData()
  form.append('file', file)
  const res = await ResourceAPI.upload(form)  
  try {
    const res = await uploadResource(form)
    const node: KnowledgeNode = {
      id: 'r_' + res.id,
      name: res.title || res.filename || file.name, // 若返回中title为空，用文件名代替
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
      symbolSize: 50,
      color: nodeTypes.value.find(t => t.value === 'resource')!.color,
      desc: `${res.filename || file.name}（${res.course || '未知课程'} 第${res.chapter || '?'}章）`,
      type: 'resource',
      resourceId: res.id,
    }
    nodes.value.push(node)
    updateChart()
    pushHistory(`上传资源：${node.name}`)
    ElMessage.success('上传成功')
  } catch (e: any) {
    ElMessage.error('上传失败：' + (e.message || '未知错误'))
  }
}

/* ========== 10. 资源下载 & 删除 & 知识点提取 ========== */
const downloadRes = async (id: string) => {
  try {
    const response = await downloadResource(id)
    const blob = response.data
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${id}.zip` // 可根据后端返回的filename字段进一步优化
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('下载开始')
  } catch (e: any) {
    ElMessage.error('下载失败：' + (e.message || '未知错误'))
  }
}

const delRes = async (id: string) => {
  try {
    await deleteResource(id)
    const idx = nodes.value.findIndex(n => n.resourceId === id)
    if (idx > -1) {
      const name = nodes.value[idx].name
      nodes.value.splice(idx, 1)
      links.value = links.value.filter(l => l.source !== nodes.value[idx]?.id && l.target !== nodes.value[idx]?.id)
      updateChart()
      pushHistory(`删除资源节点：${name}`)
      ElMessage.success('已删除')
    }
  } catch (e: any) {
    ElMessage.error('删除失败：' + e.message)
  }
}

const extractK = async (id: string) => {
  try {
    await autoExtractKnowledge(id)
    ElMessage.success('已触发自动知识提取')
    await loadGraph() // 可选：重新加载图谱
  } catch (e: any) {
    ElMessage.error('提取失败：' + (e.message || '未知错误'))
  }
}
/* ========== 11. 加载全图（概念+关系+资源） ========== */
const loadGraph = async () => {
  try {
    const [concepts, relations, resources] = await Promise.all([
      getConcepts(),
      getRelations(),
      listResources(),
    ])
    const conceptNodes: KnowledgeNode[] = concepts.map((c: any, i: number) => ({
      id: 'c_' + i,
      name: c.name,
      x: 100 + Math.random() * 400,
      y: 100 + Math.random() * 300,
      symbolSize: 60,
      color: nodeTypes.value.find(t => t.value === 'concept')!.color,
      desc: c.description || '',
      type: 'concept',
    }))
    const resourceNodes: KnowledgeNode[] = resources.map((r: Resource) => ({
      id: 'r_' + r.id,
      name: r.title,
      x: 100 + Math.random() * 400,
      y: 100 + Math.random() * 300,
      symbolSize: 50,
      color: nodeTypes.value.find(t => t.value === 'resource')!.color,
      desc: `${r.filename}（${r.course} 第${r.chapter}章）`,
      type: 'resource',
      resourceId: r.id,
    }))
    nodes.value = [...conceptNodes, ...resourceNodes]
    links.value = relations.map((r: any) => ({
      source: conceptNodes.find(n => n.name === r.start_node)?.id || '',
      target: conceptNodes.find(n => n.name === r.end_node)?.id || '',
    }))
    updateChart()
  } catch (e: any) {
    ElMessage.error('加载图谱失败：' + e.message)
  }
}

/* ========== 12. 首次挂载 ========== */
onMounted(() => {
  loadGraph()
  window.addEventListener('resize', () => chart?.resize())
})

/* ========== 13. 筛选监听 ========== */
watch([selectedNodeTypes, nodeSearch], () => updateChart())
</script>

<style scoped>
/* 样式保持你原有 */
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
