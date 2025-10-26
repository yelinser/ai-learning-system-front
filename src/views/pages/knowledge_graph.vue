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
                        <el-tag 
                            v-for="resource in selectedNode.relatedResources" 
                            :key="resource.id"
                            type="info"
                            @click="openResource(resource)"
                            style="cursor: pointer;"
                        >
                            <el-icon><Document /></el-icon>
                            {{ resource.name }}
                        </el-tag>
                    </el-space>
                </div>

                <!-- 前置知识点 -->
                <div v-if="selectedNode.prerequisites && selectedNode.prerequisites.length" class="prerequisites">
                    <h4>前置知识点</h4>
                    <el-space wrap>
                        <el-tag 
                            v-for="prereq in selectedNode.prerequisites" 
                            :key="prereq.id"
                            type="warning"
                            @click="focusNode(prereq.id)"
                            style="cursor: pointer;"
                        >
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

// 节点类型定义
interface GraphNode {
    id: string;
    name: string;
    category: 'concept' | 'resource' | 'chapter';
    status: 'mastered' | 'learning' | 'unlearned';
    progress?: number;
    chapter?: string;
    description?: string;
    relatedResources?: any[];
    prerequisites?: { id: string; name: string }[];
    suggestions?: string[];
    symbolSize?: number;
    itemStyle?: any;
    label?: any;
}

interface GraphLink {
    source: string;
    target: string;
    lineStyle?: any;
    label?: any;
}

// 响应式数据
const graphCanvas = ref<HTMLElement>();
let chart: echarts.ECharts | null = null;
const selectedChapter = ref('');
const selectedStatus = ref('');
const selectedType = ref('');
const nodeDetailVisible = ref(false);
const selectedNode = ref<GraphNode | null>(null);
const forceLayout = ref(true);

// 模拟数据 - 在实际应用中这些数据应该从后端API获取
const chapters = ref(['第一章: 基础概念', '第二章: 核心算法', '第三章: 高级应用']);

// 知识图谱数据
const graphData = ref({
    nodes: [
        {
            id: '1',
            name: '机器学习基础',
            category: 'chapter',
            status: 'mastered',
            progress: 100,
            chapter: '第一章: 基础概念',
            description: '机器学习的基本概念和原理',
            symbolSize: 50,
            itemStyle: { color: '#67c23a' },
            label: { show: true, fontSize: 14, fontWeight: 'bold' }
        },
        {
            id: '2',
            name: '监督学习',
            category: 'concept',
            status: 'mastered',
            progress: 90,
            chapter: '第一章: 基础概念',
            description: '使用标注数据进行模型训练',
            symbolSize: 40,
            itemStyle: { color: '#67c23a' },
            label: { show: true, fontSize: 12 }
        },
        {
            id: '3',
            name: '线性回归',
            category: 'concept',
            status: 'learning',
            progress: 60,
            chapter: '第一章: 基础概念',
            description: '最基本的回归算法',
            symbolSize: 35,
            itemStyle: { color: '#e6a23c' },
            label: { show: true, fontSize: 12 }
        },
        {
            id: '4',
            name: '逻辑回归',
            category: 'concept',
            status: 'unlearned',
            progress: 0,
            chapter: '第一章: 基础概念',
            description: '用于分类问题的回归算法',
            symbolSize: 35,
            itemStyle: { color: '#909399' },
            label: { show: true, fontSize: 12 }
        },
        {
            id: '5',
            name: '神经网络',
            category: 'concept',
            status: 'unlearned',
            progress: 0,
            chapter: '第二章: 核心算法',
            description: '模拟人脑神经网络的算法',
            symbolSize: 40,
            itemStyle: { color: '#909399' },
            label: { show: true, fontSize: 12 }
        },
        {
            id: '6',
            name: '深度学习讲义',
            category: 'resource',
            status: 'unlearned',
            chapter: '第二章: 核心算法',
            description: '深度学习的详细讲解',
            symbolSize: 30,
            itemStyle: { color: '#909399' },
            label: { show: true, fontSize: 10 }
        },
        {
            id: '7',
            name: '无监督学习',
            category: 'concept',
            status: 'learning',
            progress: 40,
            chapter: '第一章: 基础概念',
            description: '从无标注数据中学习模式',
            symbolSize: 35,
            itemStyle: { color: '#e6a23c' },
            label: { show: true, fontSize: 12 }
        },
        {
            id: '8',
            name: '聚类算法',
            category: 'concept',
            status: 'unlearned',
            progress: 0,
            chapter: '第一章: 基础概念',
            description: '将数据分组到不同的簇中',
            symbolSize: 30,
            itemStyle: { color: '#909399' },
            label: { show: true, fontSize: 12 }
        }
    ] as GraphNode[],
    links: [
        { source: '1', target: '2', lineStyle: { color: '#67c23a', width: 3 } },
        { source: '2', target: '3', lineStyle: { color: '#f56c6c', width: 2 } },
        { source: '2', target: '4', lineStyle: { color: '#f56c6c', width: 2 } },
        { source: '2', target: '5', lineStyle: { color: '#409eff', width: 2 } },
        { source: '5', target: '6', lineStyle: { color: '#67c23a', width: 2 } },
        { source: '2', target: '7', lineStyle: { color: '#409eff', width: 2 } },
        { source: '7', target: '8', lineStyle: { color: '#f56c6c', width: 2 } }
    ] as GraphLink[]
});

// 计算属性 - 过滤节点
const filteredGraphData = computed(() => {
    let nodes = [...graphData.value.nodes];
    let links = [...graphData.value.links];

    // 根据章节过滤
    if (selectedChapter.value) {
        nodes = nodes.filter(node => node.chapter === selectedChapter.value);
    }
    
    // 根据状态过滤
    if (selectedStatus.value) {
        nodes = nodes.filter(node => node.status === selectedStatus.value);
    }

    // 根据类型过滤
    if (selectedType.value) {
        nodes = nodes.filter(node => node.category === selectedType.value);
    }

    // 过滤连接，只保留两个端点都在过滤后节点中的连接
    const nodeIds = new Set(nodes.map(node => node.id));
    links = links.filter(link => 
        nodeIds.has(link.source as string) && nodeIds.has(link.target as string)
    );

    return { nodes, links };
});

// 方法
const initChart = () => {
    if (!graphCanvas.value) return;

    chart = echarts.init(graphCanvas.value);
    
    const option = {
        tooltip: {
            formatter: (params: any) => {
                if (params.dataType === 'node') {
                    const node = params.data as GraphNode;
                    return `
                        <div style="text-align: left;">
                            <div style="font-weight: bold; margin-bottom: 5px;">${node.name}</div>
                            <div>类型: ${getNodeTypeText(node.category)}</div>
                            <div>状态: ${getStatusText(node.status)}</div>
                            ${node.progress !== undefined ? `<div>进度: ${node.progress}%</div>` : ''}
                            ${node.chapter ? `<div>章节: ${node.chapter}</div>` : ''}
                        </div>
                    `;
                }
                return '';
            }
        },
        series: [{
            type: 'graph',
            layout: forceLayout.value ? 'force' : 'circular',
            force: {
                repulsion: 200,
                gravity: 0.1,
                edgeLength: 100,
                layoutAnimation: true
            },
            circular: {
                rotateLabel: true
            },
            data: filteredGraphData.value.nodes,
            links: filteredGraphData.value.links,
            categories: [
                { name: 'chapter', itemStyle: { color: '#67c23a' } },
                { name: 'concept', itemStyle: { color: '#409eff' } },
                { name: 'resource', itemStyle: { color: '#e6a23c' } }
            ],
            roam: true,
            focusNodeAdjacency: true,
            label: {
                show: true,
                position: 'right',
                formatter: '{b}',
                fontSize: 12
            },
            lineStyle: {
                color: 'source',
                curveness: 0.3
            },
            emphasis: {
                focus: 'adjacency',
                lineStyle: {
                    width: 4
                }
            }
        }]
    };

    chart.setOption(option);

    // 添加点击事件
    chart.on('click', (params: any) => {
        if (params.dataType === 'node') {
            showNodeDetail(params.data as GraphNode);
        }
    });

    // 添加双击事件 - 聚焦节点
    chart.on('dblclick', (params: any) => {
        if (params.dataType === 'node') {
            focusNode(params.data.id);
        }
    });
};

const updateGraph = () => {
    if (!chart) return;
    
    const option = {
        series: [{
            data: filteredGraphData.value.nodes,
            links: filteredGraphData.value.links,
            layout: forceLayout.value ? 'force' : 'circular'
        }]
    };
    
    chart.setOption(option);
};

const getNodeTypeTag = (type: string) => {
    const tags = {
        concept: 'success',
        resource: 'info',
        chapter: 'warning'
    };
    return tags[type] || 'info';
};

const getNodeTypeText = (type: string) => {
    const texts = {
        concept: '知识点',
        resource: '学习资源',
        chapter: '章节'
    };
    return texts[type] || '节点';
};

const getStatusTag = (status: string) => {
    const tags = {
        mastered: 'success',
        learning: 'warning',
        unlearned: 'info'
    };
    return tags[status] || 'info';
};

const getStatusText = (status: string) => {
    const texts = {
        mastered: '已掌握',
        learning: '学习中',
        unlearned: '未学习'
    };
    return texts[status] || '未知';
};

const showNodeDetail = (node: GraphNode) => {
    selectedNode.value = node;
    nodeDetailVisible.value = true;
};

const focusNode = (nodeId: string) => {
    if (!chart) return;
    
    chart.dispatchAction({
        type: 'focusNodeAdjacency',
        dataIndex: graphData.value.nodes.findIndex(node => node.id === nodeId)
    });
};

const openResource = (resource: any) => {
    ElMessage.success(`打开资源: ${resource.name}`);
    // 实际应用中这里应该跳转到资源详情页面
};

const startLearning = (node: GraphNode) => {
    ElMessage.success(`开始学习: ${node.name}`);
    // 实际应用中这里应该跳转到学习页面
};

const zoomIn = () => {
    if (!chart) return;
    chart.dispatchAction({
        type: 'zoom',
        scale: 1.2
    });
};

const zoomOut = () => {
    if (!chart) return;
    chart.dispatchAction({
        type: 'zoom',
        scale: 0.8
    });
};

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

const handleResize = () => {
    if (chart) {
        chart.resize();
    }
};

// 生命周期
onMounted(() => {
    nextTick(() => {
        initChart();
        window.addEventListener('resize', handleResize);
    });
});

onUnmounted(() => {
    if (chart) {
        chart.dispose();
    }
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