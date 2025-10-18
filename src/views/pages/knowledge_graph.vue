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
                    </el-button-group>
                    
                    <div class="filter-controls">
                        <el-select v-model="selectedChapter" placeholder="选择章节" clearable>
                            <el-option label="全部章节" value=""></el-option>
                            <el-option v-for="chapter in chapters" :key="chapter" :label="chapter" :value="chapter"></el-option>
                        </el-select>
                        
                        <el-select v-model="selectedStatus" placeholder="学习状态" clearable>
                            <el-option label="全部状态" value=""></el-option>
                            <el-option label="已掌握" value="mastered"></el-option>
                            <el-option label="学习中" value="learning"></el-option>
                            <el-option label="未学习" value="unlearned"></el-option>
                        </el-select>
                    </div>
                </div>
                
                <!-- 知识图谱画布 -->
                <div class="graph-canvas" ref="graphCanvas">
                    <div class="graph-nodes">
                        <div 
                            v-for="node in filteredNodes" 
                            :key="node.id"
                            :class="[
                                'graph-node',
                                `node-type-${node.type}`,
                                `node-status-${node.status}`
                            ]"
                            :style="{
                                left: node.x + 'px',
                                top: node.y + 'px',
                                backgroundColor: getNodeColor(node)
                            }"
                            @click="showNodeDetail(node)"
                        >
                            <div class="node-icon">
                                <el-icon v-if="node.type === 'concept'"><Collection /></el-icon>
                                <el-icon v-if="node.type === 'resource'"><Document /></el-icon>
                                <el-icon v-if="node.type === 'chapter'"><Folder /></el-icon>
                            </div>
                            <div class="node-label">{{ node.label }}</div>
                            <div v-if="node.progress !== undefined" class="node-progress">
                                <el-progress 
                                    :percentage="node.progress" 
                                    :show-text="false"
                                    :stroke-width="4"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <!-- 连接线 -->
                    <svg class="graph-connections" :width="canvasWidth" :height="canvasHeight">
                        <line 
                            v-for="connection in filteredConnections" 
                            :key="connection.id"
                            :x1="connection.source.x" 
                            :y1="connection.source.y"
                            :x2="connection.target.x" 
                            :y2="connection.target.y"
                            :stroke="getConnectionColor(connection.type)"
                            stroke-width="2"
                            marker-end="url(#arrowhead)"
                        />
                        <defs>
                            <marker 
                                id="arrowhead" 
                                markerWidth="10" 
                                markerHeight="7" 
                                refX="9" 
                                refY="3.5" 
                                orient="auto"
                            >
                                <polygon points="0 0, 10 3.5, 0 7" fill="#409eff" />
                            </marker>
                        </defs>
                    </svg>
                </div>
            </div>
        </el-card>

        <!-- 节点详情弹窗 -->
        <el-dialog v-model="nodeDetailVisible" :title="selectedNode?.label" width="600px">
            <div v-if="selectedNode" class="node-detail">
                <el-descriptions :column="2" border>
                    <el-descriptions-item label="节点类型">
                        <el-tag :type="getNodeTypeTag(selectedNode.type)">
                            {{ getNodeTypeText(selectedNode.type) }}
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
                <el-button v-if="selectedNode?.type === 'resource'" type="primary" @click="openResource(selectedNode)">
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
import { ref, computed, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import {
    ZoomIn,
    ZoomOut,
    Refresh,
    Collection,
    Document,
    Folder
} from '@element-plus/icons-vue';

// 节点类型定义
interface GraphNode {
    id: string;
    label: string;
    type: 'concept' | 'resource' | 'chapter';
    status: 'mastered' | 'learning' | 'unlearned';
    progress?: number;
    chapter?: string;
    description?: string;
    relatedResources?: any[];
    suggestions?: string[];
    x: number;
    y: number;
}

interface GraphConnection {
    id: string;
    source: GraphNode;
    target: GraphNode;
    type: 'prerequisite' | 'related' | 'contains';
}

// 响应式数据
const graphCanvas = ref<HTMLElement>();
const canvasWidth = ref(800);
const canvasHeight = ref(600);
const selectedChapter = ref('');
const selectedStatus = ref('');
const nodeDetailVisible = ref(false);
const selectedNode = ref<GraphNode | null>(null);

// 模拟数据 - 在实际应用中这些数据应该从后端API获取
const chapters = ref(['第一章: 基础概念', '第二章: 核心算法', '第三章: 高级应用']);
const graphNodes = ref<GraphNode[]>([
    {
        id: '1',
        label: '机器学习基础',
        type: 'chapter',
        status: 'mastered',
        progress: 100,
        chapter: '第一章: 基础概念',
        description: '机器学习的基本概念和原理',
        x: 400,
        y: 100
    },
    {
        id: '2',
        label: '监督学习',
        type: 'concept',
        status: 'mastered',
        progress: 90,
        chapter: '第一章: 基础概念',
        description: '使用标注数据进行模型训练',
        x: 300,
        y: 200
    },
    {
        id: '3',
        label: '线性回归',
        type: 'concept',
        status: 'learning',
        progress: 60,
        chapter: '第一章: 基础概念',
        description: '最基本的回归算法',
        x: 200,
        y: 300
    },
    {
        id: '4',
        label: '逻辑回归',
        type: 'concept',
        status: 'unlearned',
        progress: 0,
        chapter: '第一章: 基础概念',
        description: '用于分类问题的回归算法',
        x: 400,
        y: 300
    },
    {
        id: '5',
        label: '神经网络',
        type: 'concept',
        status: 'unlearned',
        progress: 0,
        chapter: '第二章: 核心算法',
        description: '模拟人脑神经网络的算法',
        x: 600,
        y: 200
    },
    {
        id: '6',
        label: '深度学习讲义',
        type: 'resource',
        status: 'unlearned',
        chapter: '第二章: 核心算法',
        description: '深度学习的详细讲解',
        x: 500,
        y: 400
    }
]);

const graphConnections = ref<GraphConnection[]>([
    { id: 'c1', source: graphNodes.value[0], target: graphNodes.value[1], type: 'contains' },
    { id: 'c2', source: graphNodes.value[1], target: graphNodes.value[2], type: 'prerequisite' },
    { id: 'c3', source: graphNodes.value[1], target: graphNodes.value[3], type: 'prerequisite' },
    { id: 'c4', source: graphNodes.value[1], target: graphNodes.value[4], type: 'related' },
    { id: 'c5', source: graphNodes.value[4], target: graphNodes.value[5], type: 'contains' }
]);

// 计算属性
const filteredNodes = computed(() => {
    let nodes = graphNodes.value;
    
    if (selectedChapter.value) {
        nodes = nodes.filter(node => node.chapter === selectedChapter.value);
    }
    
    if (selectedStatus.value) {
        nodes = nodes.filter(node => node.status === selectedStatus.value);
    }
    
    return nodes;
});

const filteredConnections = computed(() => {
    return graphConnections.value.filter(conn => 
        filteredNodes.value.includes(conn.source) && 
        filteredNodes.value.includes(conn.target)
    );
});

// 方法
const getNodeColor = (node: GraphNode) => {
    const colors = {
        mastered: '#67c23a',
        learning: '#e6a23c',
        unlearned: '#909399'
    };
    return colors[node.status];
};

const getConnectionColor = (type: string) => {
    const colors = {
        prerequisite: '#f56c6c',
        related: '#409eff',
        contains: '#67c23a'
    };
    return colors[type] || '#409eff';
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

const openResource = (resource: any) => {
    ElMessage.success(`打开资源: ${resource.label}`);
    // 实际应用中这里应该跳转到资源详情页面
};

const startLearning = (node: GraphNode) => {
    ElMessage.success(`开始学习: ${node.label}`);
    // 实际应用中这里应该跳转到学习页面
};

const zoomIn = () => {
    ElMessage.info('放大功能');
    // 实现放大逻辑
};

const zoomOut = () => {
    ElMessage.info('缩小功能');
    // 实现缩小逻辑
};

const resetView = () => {
    selectedChapter.value = '';
    selectedStatus.value = '';
    ElMessage.success('视图已重置');
};

// 生命周期
onMounted(() => {
    nextTick(() => {
        if (graphCanvas.value) {
            canvasWidth.value = graphCanvas.value.clientWidth;
            canvasHeight.value = graphCanvas.value.clientHeight;
        }
    });
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
    position: relative;
    width: 100%;
    height: 600px;
    overflow: hidden;
}

.graph-connections {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
}

.graph-nodes {
    position: relative;
    width: 100%;
    height: 100%;
}

.graph-node {
    position: absolute;
    width: 120px;
    padding: 10px;
    border-radius: 8px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: center;
    color: white;
    transform: translate(-50%, -50%);
}

.graph-node:hover {
    transform: translate(-50%, -50%) scale(1.05);
    box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.2);
}

.node-icon {
    font-size: 24px;
    margin-bottom: 5px;
}

.node-label {
    font-size: 12px;
    font-weight: bold;
    margin-bottom: 5px;
}

.node-progress {
    margin-top: 5px;
}

.node-type-chapter {
    width: 140px;
    min-height: 80px;
}

.node-type-concept {
    width: 100px;
    min-height: 60px;
}

.node-type-resource {
    width: 110px;
    min-height: 70px;
}

.node-detail {
    line-height: 1.6;
}

.related-resources,
.learning-suggestions {
    margin-top: 20px;
}

.related-resources h4,
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