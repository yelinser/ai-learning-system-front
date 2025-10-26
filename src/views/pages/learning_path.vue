<template>
    <div class="personalized-learning-path">
        <!-- 页面头部 -->
        <el-card class="page-header mgb20" shadow="hover">
            <div class="header-content">
                <div class="header-left">
                    <h1 class="page-title">个性化学习路径</h1>
                    <p class="page-subtitle">基于您的学习情况和知识图谱，为您量身定制学习计划</p>
                </div>
                <div class="header-right">
                    <el-button type="primary" @click="exportLearningPlan">
                        <el-icon><Download /></el-icon>
                        导出学习计划
                    </el-button>
                    <el-button @click="refreshPath">
                        <el-icon><Refresh /></el-icon>
                        刷新推荐
                    </el-button>
                </div>
            </div>
        </el-card>

        <!-- 学习概览 -->
        <el-row :gutter="20" class="mgb20">
            <el-col :span="6">
                <el-card shadow="hover" class="overview-card">
                    <div class="overview-content">
                        <el-icon class="overview-icon" color="#409eff">
                            <Collection />
                        </el-icon>
                        <div class="overview-info">
                            <div class="overview-value">{{ overview.completedNodes }}/{{ overview.totalNodes }}</div>
                            <div class="overview-label">知识点掌握</div>
                        </div>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="hover" class="overview-card">
                    <div class="overview-content">
                        <el-icon class="overview-icon" color="#67c23a">
                            <Clock />
                        </el-icon>
                        <div class="overview-info">
                            <div class="overview-value">{{ overview.studyTime }}小时</div>
                            <div class="overview-label">总学习时长</div>
                        </div>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="hover" class="overview-card">
                    <div class="overview-content">
                        <el-icon class="overview-icon" color="#e6a23c">
                            <TrendCharts />
                        </el-icon>
                        <div class="overview-info">
                            <div class="overview-value">{{ overview.progress }}%</div>
                            <div class="overview-label">学习进度</div>
                        </div>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="hover" class="overview-card">
                    <div class="overview-content">
                        <el-icon class="overview-icon" color="#f56c6c">
                            <Star />
                        </el-icon>
                        <div class="overview-info">
                            <div class="overview-value">{{ overview.avgScore }}分</div>
                            <div class="overview-label">平均成绩</div>
                        </div>
                    </div>
                </el-card>
            </el-col>
        </el-row>

        <!-- 主要内容和侧边栏 -->
        <div class="main-layout">
            <!-- 侧边栏 -->
            <div class="sidebar">
                <el-card shadow="hover" class="sidebar-card">
                    <template #header>
                        <div class="sidebar-title">学习目标</div>
                    </template>
                    <div class="learning-goals">
                        <div class="goal-item" v-for="goal in learningGoals" :key="goal.id">
                            <div class="goal-header">
                                <el-checkbox v-model="goal.completed" @change="updateGoal(goal)">
                                    {{ goal.title }}
                                </el-checkbox>
                                <el-tag :type="goal.priority === 'high' ? 'danger' : goal.priority === 'medium' ? 'warning' : 'info'" size="small">
                                    {{ goal.priority === 'high' ? '高' : goal.priority === 'medium' ? '中' : '低' }}
                                </el-tag>
                            </div>
                            <div class="goal-desc">{{ goal.description }}</div>
                            <div class="goal-meta">
                                <span>截止: {{ goal.deadline }}</span>
                                <span>预计: {{ goal.estimatedTime }}小时</span>
                            </div>
                        </div>
                    </div>
                </el-card>

                <el-card shadow="hover" class="sidebar-card">
                    <template #header>
                        <div class="sidebar-title">薄弱知识点</div>
                    </template>
                    <div class="weakness-list">
                        <div class="weakness-item" v-for="weakness in weaknesses" :key="weakness.id">
                            <div class="weakness-info">
                                <div class="weakness-name">{{ weakness.name }}</div>
                                <div class="weakness-mastery">
                                    <el-progress 
                                        :percentage="weakness.mastery" 
                                        :color="getMasteryColor(weakness.mastery)"
                                        :show-text="false"
                                    />
                                    <span class="mastery-text">{{ weakness.mastery }}%</span>
                                </div>
                            </div>
                            <el-button size="small" type="primary" @click="focusOnWeakness(weakness)">
                                重点学习
                            </el-button>
                        </div>
                    </div>
                </el-card>
            </div>

            <!-- 主内容区域 -->
            <div class="main-content">
                <!-- 学习路径时间线 -->
                <el-card shadow="hover" class="path-card">
                    <template #header>
                        <div class="card-header">
                            <span class="card-title">推荐学习路径</span>
                            <div class="header-actions">
                                <el-select v-model="timeRange" placeholder="时间范围" style="width: 120px;">
                                    <el-option label="本周" value="week"></el-option>
                                    <el-option label="本月" value="month"></el-option>
                                    <el-option label="本学期" value="semester"></el-option>
                                </el-select>
                                <el-button type="primary" text @click="customizePath">
                                    <el-icon><Setting /></el-icon>
                                    自定义路径
                                </el-button>
                            </div>
                        </div>
                    </template>

                    <div class="learning-path">
                        <div class="path-timeline">
                            <div 
                                v-for="(stage, index) in learningPath" 
                                :key="stage.id"
                                class="path-stage"
                                :class="{
                                    'completed': stage.status === 'completed',
                                    'current': stage.status === 'current',
                                    'upcoming': stage.status === 'upcoming'
                                }"
                            >
                                <div class="stage-header">
                                    <div class="stage-indicator">
                                        <div class="stage-number">
                                            <el-icon v-if="stage.status === 'completed'"><CircleCheck /></el-icon>
                                            <span v-else>{{ index + 1 }}</span>
                                        </div>
                                        <div class="stage-line" v-if="index < learningPath.length - 1"></div>
                                    </div>
                                    <div class="stage-title">
                                        <h3>{{ stage.title }}</h3>
                                        <div class="stage-meta">
                                            <el-tag :type="getStageTagType(stage.status)" size="small">
                                                {{ getStageStatusText(stage.status) }}
                                            </el-tag>
                                            <span class="stage-duration">{{ stage.duration }}天</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="stage-content">
                                    <div class="stage-objectives">
                                        <h4>学习目标</h4>
                                        <ul>
                                            <li v-for="objective in stage.objectives" :key="objective">
                                                {{ objective }}
                                            </li>
                                        </ul>
                                    </div>

                                    <div class="stage-knowledge">
                                        <h4>核心知识点</h4>
                                        <div class="knowledge-tags">
                                            <el-tag 
                                                v-for="knowledge in stage.knowledgePoints" 
                                                :key="knowledge.id"
                                                :type="getKnowledgeTagType(knowledge.mastery)"
                                                @click="showKnowledgeDetail(knowledge)"
                                                class="knowledge-tag"
                                            >
                                                {{ knowledge.name }}
                                                <el-progress 
                                                    v-if="knowledge.mastery < 100"
                                                    :percentage="knowledge.mastery" 
                                                    :show-text="false"
                                                    :stroke-width="6"
                                                    style="margin-top: 2px;"
                                                />
                                            </el-tag>
                                        </div>
                                    </div>

                                    <div class="stage-resources">
                                        <h4>学习资源</h4>
                                        <div class="resource-list">
                                            <div 
                                                v-for="resource in stage.resources" 
                                                :key="resource.id"
                                                class="resource-item"
                                                :class="{
                                                    'completed': resource.completed,
                                                    'recommended': resource.recommended
                                                }"
                                            >
                                                <div class="resource-icon">
                                                    <el-icon v-if="resource.type === 'video'"><VideoPlay /></el-icon>
                                                    <el-icon v-if="resource.type === 'document'"><Document /></el-icon>
                                                    <el-icon v-if="resource.type === 'exam'"><EditPen /></el-icon>
                                                    <el-icon v-if="resource.type === 'practice'"><MagicStick /></el-icon>
                                                </div>
                                                <div class="resource-info">
                                                    <div class="resource-name">{{ resource.name }}</div>
                                                    <div class="resource-meta">
                                                        <span>{{ getResourceTypeText(resource.type) }}</span>
                                                        <span>{{ resource.duration }}分钟</span>
                                                        <span v-if="resource.difficulty">难度: {{ resource.difficulty }}/5</span>
                                                    </div>
                                                </div>
                                                <div class="resource-actions">
                                                    <el-button 
                                                        v-if="!resource.completed"
                                                        size="small" 
                                                        :type="resource.recommended ? 'primary' : 'default'"
                                                        @click="startLearning(resource)"
                                                    >
                                                        {{ resource.recommended ? '开始学习' : '查看' }}
                                                    </el-button>
                                                    <el-tag v-else type="success" size="small">已完成</el-tag>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="stage-actions" v-if="stage.status === 'current'">
                                        <el-button type="primary" @click="startStage(stage)">
                                            开始本阶段学习
                                        </el-button>
                                        <el-button @click="skipStage(stage)">
                                            跳过此阶段
                                        </el-button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </el-card>

                <!-- 学习建议 -->
                <el-card shadow="hover" class="suggestion-card">
                    <template #header>
                        <div class="card-header">
                            <span class="card-title">个性化学习建议</span>
                        </div>
                    </template>
                    <div class="suggestions-content">
                        <div class="suggestion-item" v-for="suggestion in learningSuggestions" :key="suggestion.id">
                            <div class="suggestion-icon" :class="suggestion.type">
                                <el-icon>
                                    <TrendCharts v-if="suggestion.type === 'improvement'" />
                                    <Warning v-if="suggestion.type === 'warning'" />
                                    <Lightning v-if="suggestion.type === 'opportunity'" />
                                </el-icon>
                            </div>
                            <div class="suggestion-content">
                                <div class="suggestion-title">{{ suggestion.title }}</div>
                                <div class="suggestion-desc">{{ suggestion.description }}</div>
                                <div class="suggestion-actions">
                                    <el-button size="small" type="primary" @click="applySuggestion(suggestion)">
                                        立即应用
                                    </el-button>
                                </div>
                            </div>
                        </div>
                    </div>
                </el-card>
            </div>
        </div>

        <!-- 知识点详情弹窗 -->
        <el-dialog v-model="knowledgeDetailVisible" :title="selectedKnowledge?.name" width="600px">
            <div v-if="selectedKnowledge" class="knowledge-detail">
                <el-descriptions :column="2" border>
                    <el-descriptions-item label="掌握程度">
                        <el-progress 
                            :percentage="selectedKnowledge.mastery" 
                            :color="getMasteryColor(selectedKnowledge.mastery)"
                        />
                    </el-descriptions-item>
                    <el-descriptions-item label="重要程度">
                        <el-rate v-model="selectedKnowledge.importance" disabled />
                    </el-descriptions-item>
                    <el-descriptions-item label="学习次数">
                        {{ selectedKnowledge.studyCount }}次
                    </el-descriptions-item>
                    <el-descriptions-item label="最后学习">
                        {{ selectedKnowledge.lastStudied }}
                    </el-descriptions-item>
                </el-descriptions>

                <div class="knowledge-prerequisites" v-if="selectedKnowledge.prerequisites.length">
                    <h4>前置知识</h4>
                    <div class="prerequisites-list">
                        <el-tag 
                            v-for="prereq in selectedKnowledge.prerequisites" 
                            :key="prereq.id"
                            :type="prereq.mastery >= 80 ? 'success' : 'warning'"
                        >
                            {{ prereq.name }} ({{ prereq.mastery }}%)
                        </el-tag>
                    </div>
                </div>

                <div class="knowledge-suggestions">
                    <h4>学习建议</h4>
                    <ul>
                        <li v-for="suggestion in selectedKnowledge.suggestions" :key="suggestion">
                            {{ suggestion }}
                        </li>
                    </ul>
                </div>
            </div>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
    Download,
    Refresh,
    Collection,
    Clock,
    TrendCharts,
    Star,
    Setting,
    CircleCheck,
    VideoPlay,
    Document,
    EditPen,
    MagicStick,
    Warning,
    Lightning
} from '@element-plus/icons-vue'

// 响应式数据
const timeRange = ref('week')
const knowledgeDetailVisible = ref(false)
const selectedKnowledge = ref(null)

// 学习概览数据
const overview = reactive({
    completedNodes: 24,
    totalNodes: 36,
    studyTime: 42,
    progress: 65,
    avgScore: 86
})

// 学习目标
const learningGoals = ref([
    {
        id: 1,
        title: '掌握Hadoop生态系统',
        description: '理解Hadoop核心组件及其工作原理',
        priority: 'high',
        deadline: '2024-01-15',
        estimatedTime: 20,
        completed: false
    },
    {
        id: 2,
        title: '完成Spark编程实践',
        description: '能够独立完成Spark数据处理任务',
        priority: 'medium',
        deadline: '2024-01-30',
        estimatedTime: 15,
        completed: false
    },
    {
        id: 3,
        title: '数据可视化项目',
        description: '使用ECharts完成数据可视化展示',
        priority: 'low',
        deadline: '2024-02-15',
        estimatedTime: 10,
        completed: true
    }
])

// 薄弱知识点
const weaknesses = ref([
    {
        id: 1,
        name: 'MapReduce优化',
        mastery: 45,
        lastStudied: '2024-01-05'
    },
    {
        id: 2,
        name: 'Spark性能调优',
        mastery: 60,
        lastStudied: '2024-01-08'
    },
    {
        id: 3,
        name: 'Hive复杂查询',
        mastery: 55,
        lastStudied: '2024-01-10'
    }
])

// 学习路径
const learningPath = ref([
    {
        id: 1,
        title: 'Hadoop基础巩固',
        status: 'completed',
        duration: 3,
        objectives: [
            '掌握HDFS文件系统操作',
            '理解MapReduce编程模型',
            '熟悉YARN资源管理'
        ],
        knowledgePoints: [
            { id: 'k1', name: 'HDFS原理', mastery: 90 },
            { id: 'k2', name: 'MapReduce基础', mastery: 85 },
            { id: 'k3', name: 'YARN架构', mastery: 80 }
        ],
        resources: [
            {
                id: 'r1',
                name: 'HDFS操作实战',
                type: 'practice',
                duration: 45,
                difficulty: 3,
                completed: true,
                recommended: false
            },
            {
                id: 'r2',
                name: 'MapReduce编程指南',
                type: 'document',
                duration: 30,
                completed: true,
                recommended: false
            }
        ]
    },
    {
        id: 2,
        title: 'Spark核心原理',
        status: 'current',
        duration: 5,
        objectives: [
            '理解Spark运行机制',
            '掌握RDD编程',
            '学习Spark SQL使用'
        ],
        knowledgePoints: [
            { id: 'k4', name: 'Spark架构', mastery: 70 },
            { id: 'k5', name: 'RDD编程', mastery: 65 },
            { id: 'k6', name: 'Spark SQL', mastery: 60 }
        ],
        resources: [
            {
                id: 'r3',
                name: 'Spark核心原理视频',
                type: 'video',
                duration: 60,
                difficulty: 4,
                completed: false,
                recommended: true
            },
            {
                id: 'r4',
                name: 'RDD编程练习',
                type: 'practice',
                duration: 90,
                difficulty: 4,
                completed: false,
                recommended: true
            },
            {
                id: 'r5',
                name: 'Spark SQL教程',
                type: 'document',
                duration: 45,
                completed: false,
                recommended: false
            }
        ]
    },
    {
        id: 3,
        title: '高级应用与优化',
        status: 'upcoming',
        duration: 7,
        objectives: [
            '掌握Spark性能优化',
            '学习机器学习库MLlib',
            '了解实时流处理'
        ],
        knowledgePoints: [
            { id: 'k7', name: 'Spark优化', mastery: 40 },
            { id: 'k8', name: 'MLlib基础', mastery: 30 },
            { id: 'k9', name: 'Structured Streaming', mastery: 25 }
        ],
        resources: [
            {
                id: 'r6',
                name: 'Spark性能调优指南',
                type: 'document',
                duration: 50,
                completed: false,
                recommended: false
            },
            {
                id: 'r7',
                name: '机器学习实战',
                type: 'practice',
                duration: 120,
                difficulty: 5,
                completed: false,
                recommended: false
            }
        ]
    }
])

// 学习建议
const learningSuggestions = ref([
    {
        id: 1,
        type: 'improvement',
        title: '加强薄弱知识点学习',
        description: '您在MapReduce优化和Spark性能调优方面掌握度较低，建议优先学习相关资源'
    },
    {
        id: 2,
        type: 'warning',
        title: '学习进度偏慢',
        description: '当前学习进度落后于计划，建议增加每日学习时间至2小时'
    },
    {
        id: 3,
        type: 'opportunity',
        title: '尝试项目实践',
        description: '建议完成一个完整的大数据处理项目，巩固所学知识'
    }
])

// 方法
const getMasteryColor = (mastery) => {
    if (mastery >= 80) return '#67c23a'
    if (mastery >= 60) return '#e6a23c'
    if (mastery >= 40) return '#409eff'
    return '#f56c6c'
}

const getStageTagType = (status) => {
    const types = {
        completed: 'success',
        current: 'primary',
        upcoming: 'info'
    }
    return types[status] || 'info'
}

const getStageStatusText = (status) => {
    const texts = {
        completed: '已完成',
        current: '进行中',
        upcoming: '待开始'
    }
    return texts[status] || '未知'
}

const getKnowledgeTagType = (mastery) => {
    if (mastery >= 80) return 'success'
    if (mastery >= 60) return 'warning'
    return 'danger'
}

const getResourceTypeText = (type) => {
    const texts = {
        video: '视频',
        document: '文档',
        exam: '测验',
        practice: '练习'
    }
    return texts[type] || '资源'
}

const updateGoal = (goal) => {
    ElMessage.success(`目标"${goal.title}"${goal.completed ? '已完成' : '标记为未完成'}`)
}

const focusOnWeakness = (weakness) => {
    ElMessage.info(`聚焦薄弱知识点: ${weakness.name}`)
    // 实际应用中这里应该跳转到对应的学习页面
}

const showKnowledgeDetail = (knowledge) => {
    selectedKnowledge.value = {
        ...knowledge,
        importance: 4,
        studyCount: 3,
        lastStudied: '2024-01-10',
        prerequisites: [
            { id: 'p1', name: 'Hadoop基础', mastery: 85 },
            { id: 'p2', name: 'Java编程', mastery: 90 }
        ],
        suggestions: [
            '观看相关教学视频加深理解',
            '完成配套的编程练习',
            '参与在线讨论和问答'
        ]
    }
    knowledgeDetailVisible.value = true
}

const startLearning = (resource) => {
    ElMessage.success(`开始学习: ${resource.name}`)
    // 实际应用中这里应该跳转到资源学习页面
}

const startStage = (stage) => {
    ElMessage.success(`开始学习阶段: ${stage.title}`)
    // 实际应用中这里应该跳转到阶段学习页面
}

const skipStage = async (stage) => {
    try {
        await ElMessageBox.confirm(
            `确定要跳过"${stage.title}"阶段吗？跳过可能导致知识掌握不牢固。`,
            '确认跳过',
            {
                confirmButtonText: '确定跳过',
                cancelButtonText: '取消',
                type: 'warning'
            }
        )
        ElMessage.success(`已跳过阶段: ${stage.title}`)
        // 更新阶段状态
        stage.status = 'completed'
    } catch {
        // 用户取消操作
    }
}

const applySuggestion = (suggestion) => {
    ElMessage.success(`已应用建议: ${suggestion.title}`)
    // 实际应用中这里应该执行相应的操作
}

const exportLearningPlan = () => {
    ElMessage.success('学习计划导出成功')
    // 实际应用中这里应该生成并下载学习计划文件
}

const refreshPath = () => {
    ElMessage.info('正在重新生成学习路径...')
    // 模拟重新生成路径
    setTimeout(() => {
        ElMessage.success('学习路径已更新')
    }, 1000)
}

const customizePath = () => {
    ElMessage.info('打开路径自定义界面')
    // 实际应用中这里应该打开路径自定义对话框
}

// 生命周期
onMounted(() => {
    console.log('个性化学习路径页面初始化完成')
})
</script>

<style scoped>
.personalized-learning-path {
    padding: 20px;
    background-color: #f5f7fa;
    min-height: 100vh;
}

.page-header {
    margin-bottom: 20px;
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.page-title {
    margin: 0;
    font-size: 24px;
    color: #303133;
}

.page-subtitle {
    margin: 5px 0 0 0;
    color: #606266;
    font-size: 14px;
}

.overview-card {
    height: 100px;
}

.overview-content {
    display: flex;
    align-items: center;
    gap: 15px;
    height: 100%;
}

.overview-icon {
    font-size: 40px;
}

.overview-info {
    flex: 1;
}

.overview-value {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 5px;
}

.overview-label {
    color: #909399;
    font-size: 14px;
}

.main-layout {
    display: flex;
    gap: 20px;
}

.sidebar {
    width: 320px;
    flex-shrink: 0;
}

.sidebar-card {
    margin-bottom: 20px;
}

.sidebar-title {
    font-weight: bold;
    color: #303133;
}

.learning-goals {
    padding: 10px 0;
}

.goal-item {
    padding: 12px;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    margin-bottom: 10px;
    background: white;
}

.goal-item:last-child {
    margin-bottom: 0;
}

.goal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.goal-desc {
    color: #606266;
    font-size: 14px;
    margin-bottom: 8px;
}

.goal-meta {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #909399;
}

.weakness-list {
    padding: 10px 0;
}

.weakness-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid #f0f0f0;
}

.weakness-item:last-child {
    border-bottom: none;
}

.weakness-info {
    flex: 1;
}

.weakness-name {
    font-weight: 500;
    margin-bottom: 5px;
}

.weakness-mastery {
    display: flex;
    align-items: center;
    gap: 10px;
}

.mastery-text {
    font-size: 12px;
    color: #909399;
    min-width: 40px;
}

.main-content {
    flex: 1;
}

.path-card, .suggestion-card {
    margin-bottom: 20px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.card-title {
    font-size: 18px;
    font-weight: bold;
    color: #303133;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.learning-path {
    padding: 20px 0;
}

.path-timeline {
    position: relative;
}

.path-stage {
    margin-bottom: 30px;
    position: relative;
}

.path-stage:last-child {
    margin-bottom: 0;
}

.path-stage.completed {
    opacity: 0.8;
}

.path-stage.current {
    border-left: 3px solid #409eff;
    padding-left: 15px;
    margin-left: -15px;
}

.stage-header {
    display: flex;
    align-items: flex-start;
    gap: 15px;
    margin-bottom: 20px;
}

.stage-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.stage-number {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #e4e7ed;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: #606266;
    z-index: 2;
}

.path-stage.completed .stage-number {
    background: #67c23a;
    color: white;
}

.path-stage.current .stage-number {
    background: #409eff;
    color: white;
}

.stage-line {
    width: 2px;
    height: 100%;
    background: #e4e7ed;
    margin-top: 10px;
    flex: 1;
}

.stage-title h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
}

.stage-meta {
    display: flex;
    align-items: center;
    gap: 10px;
}

.stage-duration {
    color: #909399;
    font-size: 14px;
}

.stage-content {
    margin-left: 55px;
}

.stage-objectives, .stage-knowledge, .stage-resources {
    margin-bottom: 20px;
}

.stage-objectives h4, .stage-knowledge h4, .stage-resources h4 {
    margin: 0 0 10px 0;
    color: #303133;
    font-size: 16px;
}

.stage-objectives ul {
    margin: 0;
    padding-left: 20px;
    color: #606266;
}

.stage-objectives li {
    margin-bottom: 5px;
}

.knowledge-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.knowledge-tag {
    cursor: pointer;
    min-width: 120px;
    padding: 8px 12px;
}

.resource-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.resource-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    background: white;
    transition: all 0.3s;
}

.resource-item.recommended {
    border-color: #409eff;
    background: #f0f5ff;
}

.resource-item.completed {
    opacity: 0.7;
    background: #f8f9fa;
}

.resource-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #409eff;
    flex-shrink: 0;
}

.resource-info {
    flex: 1;
}

.resource-name {
    font-weight: 500;
    margin-bottom: 4px;
}

.resource-meta {
    display: flex;
    gap: 15px;
    font-size: 12px;
    color: #909399;
}

.stage-actions {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px solid #e4e7ed;
}

.suggestions-content {
    padding: 10px 0;
}

.suggestion-item {
    display: flex;
    gap: 15px;
    padding: 15px;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    margin-bottom: 10px;
    background: white;
}

.suggestion-item:last-child {
    margin-bottom: 0;
}

.suggestion-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.suggestion-icon.improvement {
    background: #f0f9ff;
    color: #409eff;
}

.suggestion-icon.warning {
    background: #fef0f0;
    color: #f56c6c;
}

.suggestion-icon.opportunity {
    background: #f6ffed;
    color: #52c41a;
}

.suggestion-content {
    flex: 1;
}

.suggestion-title {
    font-weight: 500;
    margin-bottom: 5px;
}

.suggestion-desc {
    color: #606266;
    font-size: 14px;
    margin-bottom: 10px;
}

.knowledge-detail {
    line-height: 1.6;
}

.knowledge-prerequisites, .knowledge-suggestions {
    margin-top: 20px;
}

.knowledge-prerequisites h4, .knowledge-suggestions h4 {
    margin-bottom: 10px;
    color: #303133;
}

.prerequisites-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.knowledge-suggestions ul {
    margin: 0;
    padding-left: 20px;
    color: #606266;
}

.knowledge-suggestions li {
    margin-bottom: 5px;
}

.mgb20 {
    margin-bottom: 20px;
}
</style>