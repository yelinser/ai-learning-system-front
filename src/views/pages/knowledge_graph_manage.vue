<template>
    <div class="knowledge-graph-management">
        <!-- 页面头部 -->
        <div class="page-header">
            <h1 class="page-title">知识图谱管理</h1>
            <p class="page-subtitle">管理课程知识点、关系和资源关联</p>
        </div>

        <!-- 操作工具栏 -->
        <el-card class="mgb20" shadow="hover">
            <div class="toolbar">
                <el-button type="primary" @click="showAddConceptDialog = true">
                    <el-icon><Plus /></el-icon>添加概念
                </el-button>
                <el-button type="success" @click="showAddRelationshipDialog = true">
                    <el-icon><Connection /></el-icon>添加关系
                </el-button>
                <el-button type="warning" @click="showAddStudentDialog = true">
                    <el-icon><User /></el-icon>添加学生
                </el-button>
                <el-button @click="refreshGraphData">
                    <el-icon><Refresh /></el-icon>刷新数据
                </el-button>
                
                <div class="toolbar-right">
                    <el-button type="info" @click="exportGraphData">
                        <el-icon><Download /></el-icon>导出数据
                    </el-button>
                </div>
            </div>
        </el-card>

        <!-- 知识图谱可视化区域 -->
        <el-row :gutter="20">
            <el-col :span="16">
                <el-card class="mgb20" shadow="hover">
                    <template #header>
                        <div class="card-header">
                            <span>知识图谱可视化</span>
                            <div class="header-actions">
                                <el-button-group>
                                    <el-button size="small" @click="zoomIn">
                                        <el-icon><ZoomIn /></el-icon>
                                    </el-button>
                                    <el-button size="small" @click="zoomOut">
                                        <el-icon><ZoomOut /></el-icon>
                                    </el-button>
                                    <el-button size="small" @click="resetView">
                                        <el-icon><Refresh /></el-icon>
                                    </el-button>
                                </el-button-group>
                            </div>
                        </div>
                    </template>
                    
                    <div class="graph-container">
                        <div class="graph-canvas" ref="graphCanvas"></div>
                    </div>
                </el-card>
            </el-col>

            <el-col :span="8">
                <!-- 统计信息 -->
                <el-card class="mgb20" shadow="hover">
                    <template #header>
                        <div class="card-header">
                            <span>统计信息</span>
                        </div>
                    </template>
                    <div class="stats-container">
                        <div class="stat-item">
                            <div class="stat-value">{{ stats.concepts }}</div>
                            <div class="stat-label">概念节点</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">{{ stats.relationships }}</div>
                            <div class="stat-label">关系数量</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">{{ stats.resources }}</div>
                            <div class="stat-label">资源节点</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">{{ stats.students }}</div>
                            <div class="stat-label">学生数量</div>
                        </div>
                    </div>
                </el-card>

                <!-- 快速操作 -->
                <el-card shadow="hover">
                    <template #header>
                        <div class="card-header">
                            <span>快速操作</span>
                        </div>
                    </template>
                    <div class="quick-actions">
                        <el-button type="primary" plain @click="showBatchImport = true" class="action-btn">
                            <el-icon><Upload /></el-icon>
                            批量导入概念
                        </el-button>
                        <el-button type="success" plain @click="showResourceLink = true" class="action-btn">
                            <el-icon><Link /></el-icon>
                            关联资源到概念
                        </el-button>
                        <el-button type="warning" plain @click="showLearningRecord = true" class="action-btn">
                            <el-icon><DocumentAdd /></el-icon>
                            添加学习记录
                        </el-button>
                        <el-button type="info" plain @click="clearAllData" class="action-btn">
                            <el-icon><Delete /></el-icon>
                            清空所有数据
                        </el-button>
                    </div>
                </el-card>
            </el-col>
        </el-row>

        <!-- 添加概念对话框 -->
        <el-dialog v-model="showAddConceptDialog" title="添加概念" width="500px">
            <el-form :model="conceptForm" :rules="conceptRules" ref="conceptFormRef" label-width="80px">
                <el-form-item label="概念名称" prop="name">
                    <el-input v-model="conceptForm.name" placeholder="请输入概念名称" />
                </el-form-item>
                <el-form-item label="概念描述" prop="description">
                    <el-input 
                        v-model="conceptForm.description" 
                        type="textarea" 
                        :rows="3" 
                        placeholder="请输入概念描述" 
                    />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showAddConceptDialog = false">取消</el-button>
                <el-button type="primary" @click="addConcept" :loading="loading">
                    添加
                </el-button>
            </template>
        </el-dialog>

        <!-- 添加关系对话框 -->
        <el-dialog v-model="showAddRelationshipDialog" title="添加关系" width="500px">
            <el-form :model="relationshipForm" :rules="relationshipRules" ref="relationshipFormRef" label-width="80px">
                <el-form-item label="概念1" prop="concept1">
                    <el-select v-model="relationshipForm.concept1" placeholder="请选择概念" filterable>
                        <el-option 
                            v-for="concept in concepts" 
                            :key="concept.name" 
                            :label="concept.name" 
                            :value="concept.name" 
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="关系类型" prop="relationship">
                    <el-select v-model="relationshipForm.relationship" placeholder="请选择关系类型">
                        <el-option label="包含" value="contains" />
                        <el-option label="依赖" value="depends_on" />
                        <el-option label="对比" value="contrasts_with" />
                        <el-option label="相关" value="related_to" />
                        <el-option label="前置" value="prerequisite" />
                    </el-select>
                </el-form-item>
                <el-form-item label="概念2" prop="concept2">
                    <el-select v-model="relationshipForm.concept2" placeholder="请选择概念" filterable>
                        <el-option 
                            v-for="concept in concepts" 
                            :key="concept.name" 
                            :label="concept.name" 
                            :value="concept.name" 
                        />
                    </el-select>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showAddRelationshipDialog = false">取消</el-button>
                <el-button type="primary" @click="addRelationship" :loading="loading">
                    添加
                </el-button>
            </template>
        </el-dialog>

        <!-- 添加学生对话框 -->
        <el-dialog v-model="showAddStudentDialog" title="添加学生" width="500px">
            <el-form :model="studentForm" :rules="studentRules" ref="studentFormRef" label-width="80px">
                <el-form-item label="学生ID" prop="student_id">
                    <el-input v-model="studentForm.student_id" placeholder="请输入学生ID" />
                </el-form-item>
                <el-form-item label="学生姓名" prop="name">
                    <el-input v-model="studentForm.name" placeholder="请输入学生姓名" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showAddStudentDialog = false">取消</el-button>
                <el-button type="primary" @click="addStudent" :loading="loading">
                    添加
                </el-button>
            </template>
        </el-dialog>

        <!-- 节点详情弹窗 -->
        <el-dialog v-model="nodeDetailVisible" :title="selectedNode?.name" width="600px">
            <div v-if="selectedNode" class="node-detail">
                <el-descriptions :column="2" border>
                    <el-descriptions-item label="节点类型">
                        <el-tag :type="getNodeTypeTag(selectedNode.category)">
                            {{ getNodeTypeText(selectedNode.category) }}
                        </el-tag>
                    </el-descriptions-item>
                    
                    <el-descriptions-item v-if="selectedNode.category === 'student'" label="学生ID">
                        {{ selectedNode.id }}
                    </el-descriptions-item>
                    
                    <el-descriptions-item v-if="selectedNode.description" label="描述" :span="2">
                        {{ selectedNode.description }}
                    </el-descriptions-item>
                </el-descriptions>

                <div class="node-actions" style="margin-top: 20px;">
                    <el-button 
                        v-if="selectedNode.category === 'concept'" 
                        type="danger" 
                        @click="deleteConcept(selectedNode.name)"
                    >
                        删除概念
                    </el-button>
                    <el-button 
                        v-if="selectedNode.category === 'student'" 
                        type="danger" 
                        @click="deleteStudent(selectedNode.id)"
                    >
                        删除学生
                    </el-button>
                </div>
            </div>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import * as echarts from 'echarts';
import {
    Plus,
    Connection,
    User,
    Refresh,
    Download,
    ZoomIn,
    ZoomOut,
    Upload,
    Link,
    DocumentAdd,
    Delete
} from '@element-plus/icons-vue';

// 类型定义
interface GraphNode {
    id: string;
    name: string;
    category: 'concept' | 'resource' | 'student' | 'chapter';
    description?: string;
    symbolSize?: number;
    itemStyle?: any;
    label?: any;
}

interface GraphLink {
    source: string;
    target: string;
    name?: string;
    lineStyle?: any;
    label?: any;
}

interface Concept {
    name: string;
    description?: string;
}

interface Student {
    student_id: string;
    name: string;
}

// 响应式数据
const graphCanvas = ref<HTMLElement>();
let chart: echarts.ECharts | null = null;
const loading = ref(false);

// 对话框控制
const showAddConceptDialog = ref(false);
const showAddRelationshipDialog = ref(false);
const showAddStudentDialog = ref(false);
const showBatchImport = ref(false);
const showResourceLink = ref(false);
const showLearningRecord = ref(false);
const nodeDetailVisible = ref(false);

// 表单引用
const conceptFormRef = ref();
const relationshipFormRef = ref();
const studentFormRef = ref();

// 表单数据
const conceptForm = reactive({
    name: '',
    description: ''
});

const relationshipForm = reactive({
    concept1: '',
    relationship: '',
    concept2: ''
});

const studentForm = reactive({
    student_id: '',
    name: ''
});

// 表单验证规则
const conceptRules = {
    name: [{ required: true, message: '请输入概念名称', trigger: 'blur' }]
};

const relationshipRules = {
    concept1: [{ required: true, message: '请选择概念1', trigger: 'change' }],
    relationship: [{ required: true, message: '请选择关系类型', trigger: 'change' }],
    concept2: [{ required: true, message: '请选择概念2', trigger: 'change' }]
};

const studentRules = {
    student_id: [{ required: true, message: '请输入学生ID', trigger: 'blur' }],
    name: [{ required: true, message: '请输入学生姓名', trigger: 'blur' }]
};

// 数据存储
const concepts = ref<Concept[]>([]);
const students = ref<Student[]>([]);
const selectedNode = ref<GraphNode | null>(null);
const graphData = ref({
    nodes: [] as GraphNode[],
    links: [] as GraphLink[]
});

// 统计信息
const stats = reactive({
    concepts: 0,
    relationships: 0,
    resources: 0,
    students: 0
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
                            ${node.description ? `<div>描述: ${node.description}</div>` : ''}
                        </div>
                    `;
                } else if (params.dataType === 'edge') {
                    const link = params.data as GraphLink;
                    return `关系: ${link.name || '关联'}`;
                }
                return '';
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
            data: graphData.value.nodes,
            links: graphData.value.links,
            categories: [
                { name: 'concept', itemStyle: { color: '#409eff' } },
                { name: 'resource', itemStyle: { color: '#e6a23c' } },
                { name: 'student', itemStyle: { color: '#67c23a' } },
                { name: 'chapter', itemStyle: { color: '#909399' } }
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
};

const loadGraphData = async () => {
    try {
        loading.value = true;
        
        // 获取所有概念
        const conceptsResponse = await fetch('http://patrickshao.site:8000/knowledge-graph/concepts');
        if (conceptsResponse.ok) {
            const conceptsData = await conceptsResponse.json();
            concepts.value = conceptsData;
            
            // 添加概念节点
            conceptsData.forEach((concept: Concept) => {
                graphData.value.nodes.push({
                    id: `concept_${concept.name}`,
                    name: concept.name,
                    category: 'concept',
                    description: concept.description,
                    symbolSize: 30,
                    itemStyle: { color: '#409eff' }
                });
            });
        }

        // 获取所有关系
        const relationshipsResponse = await fetch('http://patrickshao.site:8000/knowledge-graph/relationships');
        if (relationshipsResponse.ok) {
            const relationshipsData = await relationshipsResponse.json();
            
            // 添加关系边
            relationshipsData.forEach((rel: any) => {
                graphData.value.links.push({
                    source: `concept_${rel.concept1}`,
                    target: `concept_${rel.concept2}`,
                    name: rel.relationship,
                    lineStyle: { color: '#909399', width: 2 }
                });
            });
        }

        // 获取所有学生
        const studentsResponse = await fetch('http://patrickshao.site:8000/knowledge-graph/students');
        if (studentsResponse.ok) {
            const studentsData = await studentsResponse.json();
            students.value = studentsData;
            
            // 添加学生节点
            studentsData.forEach((student: Student) => {
                graphData.value.nodes.push({
                    id: student.student_id,
                    name: student.name,
                    category: 'student',
                    symbolSize: 25,
                    itemStyle: { color: '#67c23a' }
                });
            });
        }

        // 获取所有资源（如果需要）
        const resourcesResponse = await fetch('http://patrickshao.site:8000/knowledge-graph/resources');
        if (resourcesResponse.ok) {
            const resourcesData = await resourcesResponse.json();
            // 这里可以添加资源节点，根据实际数据结构调整
        }

        // 更新统计信息
        updateStats();
        
        // 更新图表
        if (chart) {
            chart.setOption({
                series: [{
                    data: graphData.value.nodes,
                    links: graphData.value.links
                }]
            });
        }

    } catch (error) {
        console.error('加载知识图谱数据失败:', error);
        ElMessage.error('加载数据失败');
    } finally {
        loading.value = false;
    }
};

const addConcept = async () => {
    try {
        await conceptFormRef.value?.validate();
        
        loading.value = true;
        
        const response = await fetch('http://patrickshao.site:8000/knowledge-graph/concepts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                name: conceptForm.name,
                description: conceptForm.description || ''
            })
        });

        if (response.ok) {
            ElMessage.success('概念添加成功');
            showAddConceptDialog.value = false;
            conceptForm.name = '';
            conceptForm.description = '';
            await refreshGraphData();
        } else {
            throw new Error('添加概念失败');
        }
    } catch (error) {
        console.error('添加概念失败:', error);
        ElMessage.error('添加概念失败');
    } finally {
        loading.value = false;
    }
};

const addRelationship = async () => {
    try {
        await relationshipFormRef.value?.validate();
        
        if (relationshipForm.concept1 === relationshipForm.concept2) {
            ElMessage.warning('不能添加相同概念之间的关系');
            return;
        }
        
        loading.value = true;
        
        const response = await fetch('http://patrickshao.site:8000/knowledge-graph/relationships', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                concept1: relationshipForm.concept1,
                relationship: relationshipForm.relationship,
                concept2: relationshipForm.concept2
            })
        });

        if (response.ok) {
            ElMessage.success('关系添加成功');
            showAddRelationshipDialog.value = false;
            relationshipForm.concept1 = '';
            relationshipForm.relationship = '';
            relationshipForm.concept2 = '';
            await refreshGraphData();
        } else {
            throw new Error('添加关系失败');
        }
    } catch (error) {
        console.error('添加关系失败:', error);
        ElMessage.error('添加关系失败');
    } finally {
        loading.value = false;
    }
};

const addStudent = async () => {
    try {
        await studentFormRef.value?.validate();
        
        loading.value = true;
        
        const response = await fetch('http://patrickshao.site:8000/knowledge-graph/students', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                student_id: studentForm.student_id,
                name: studentForm.name
            })
        });

        if (response.ok) {
            ElMessage.success('学生添加成功');
            showAddStudentDialog.value = false;
            studentForm.student_id = '';
            studentForm.name = '';
            await refreshGraphData();
        } else {
            throw new Error('添加学生失败');
        }
    } catch (error) {
        console.error('添加学生失败:', error);
        ElMessage.error('添加学生失败');
    } finally {
        loading.value = false;
    }
};

const deleteConcept = async (conceptName: string) => {
    try {
        await ElMessageBox.confirm(
            `确定要删除概念 "${conceptName}" 吗？此操作会删除相关的所有关系。`,
            '确认删除',
            { type: 'warning' }
        );

        const response = await fetch(`http://patrickshao.site:8000/knowledge-graph/concepts/${encodeURIComponent(conceptName)}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            ElMessage.success('概念删除成功');
            nodeDetailVisible.value = false;
            await refreshGraphData();
        } else {
            throw new Error('删除概念失败');
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('删除概念失败:', error);
            ElMessage.error('删除概念失败');
        }
    }
};

const deleteStudent = async (studentId: string) => {
    try {
        await ElMessageBox.confirm(
            `确定要删除学生 "${studentId}" 吗？`,
            '确认删除',
            { type: 'warning' }
        );

        // 注意：这里需要根据实际的后端API调整删除学生的接口
        const response = await fetch(`http://patrickshao.site:8000/knowledge-graph/students/${studentId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            ElMessage.success('学生删除成功');
            nodeDetailVisible.value = false;
            await refreshGraphData();
        } else {
            throw new Error('删除学生失败');
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('删除学生失败:', error);
            ElMessage.error('删除学生失败');
        }
    }
};

const refreshGraphData = async () => {
    // 清空现有数据
    graphData.value.nodes = [];
    graphData.value.links = [];
    
    await loadGraphData();
    ElMessage.success('数据已刷新');
};

const exportGraphData = () => {
    const dataStr = JSON.stringify(graphData.value, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'knowledge-graph-data.json';
    link.click();
    URL.revokeObjectURL(url);
    ElMessage.success('数据导出成功');
};

const clearAllData = async () => {
    try {
        await ElMessageBox.confirm(
            '确定要清空所有数据吗？此操作不可逆！',
            '确认清空',
            { type: 'warning' }
        );

        const response = await fetch('http://patrickshao.site:8000/api/v1/resources/clear/clear-all-data', {
            method: 'POST'
        });

        if (response.ok) {
            ElMessage.success('所有数据已清空');
            await refreshGraphData();
        } else {
            throw new Error('清空数据失败');
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('清空数据失败:', error);
            ElMessage.error('清空数据失败');
        }
    }
};

const showNodeDetail = (node: GraphNode) => {
    selectedNode.value = node;
    nodeDetailVisible.value = true;
};

const getNodeTypeTag = (type: string) => {
    const tags: { [key: string]: string } = {
        concept: 'primary',
        resource: 'warning',
        student: 'success',
        chapter: 'info'
    };
    return tags[type] || 'info';
};

const getNodeTypeText = (type: string) => {
    const texts: { [key: string]: string } = {
        concept: '概念',
        resource: '资源',
        student: '学生',
        chapter: '章节'
    };
    return texts[type] || '节点';
};

const updateStats = () => {
    stats.concepts = concepts.value.length;
    stats.students = students.value.length;
    stats.relationships = graphData.value.links.length;
    // 资源数量可以根据实际需求从API获取
    stats.resources = graphData.value.nodes.filter(node => node.category === 'resource').length;
};

const zoomIn = () => {
    if (!chart) return;
    chart.dispatchAction({ type: 'zoom', scale: 1.2 });
};

const zoomOut = () => {
    if (!chart) return;
    chart.dispatchAction({ type: 'zoom', scale: 0.8 });
};

const resetView = () => {
    if (!chart) return;
    chart.dispatchAction({ type: 'reset' });
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
        loadGraphData();
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
.knowledge-graph-management {
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

.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
}

.toolbar-right {
    display: flex;
    gap: 10px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header-actions {
    display: flex;
    gap: 10px;
}

.graph-container {
    position: relative;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    background-color: white;
    min-height: 600px;
}

.graph-canvas {
    width: 100%;
    height: 600px;
}

.stats-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

.stat-item {
    text-align: center;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e4e7ed;
}

.stat-value {
    font-size: 24px;
    font-weight: bold;
    color: #409eff;
    margin-bottom: 8px;
}

.stat-label {
    font-size: 14px;
    color: #606266;
}

.quick-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.action-btn {
    width: 100%;
    justify-content: flex-start;
}

.node-detail {
    line-height: 1.6;
}

.node-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.mgb20 {
    margin-bottom: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .toolbar {
        flex-direction: column;
        align-items: stretch;
    }
    
    .toolbar-right {
        justify-content: flex-start;
    }
    
    .stats-container {
        grid-template-columns: 1fr;
    }
}
</style>