<template>
    <div class="student-dashboard">
        <!-- 顶部导航栏 -->
        <el-header class="dashboard-header">
            <div class="header-left">
                <h1>智慧学习系统 - 学生端</h1>
            </div>
            <div class="header-right">
                <el-button type="primary" @click="$router.push({name: 'knowledge_graph'})">
                    <el-icon><Collection /></el-icon>
                    知识图谱
                </el-button>
                <el-button type="success" @click="$router.push({name: 'ai_teacher'})">
                    <el-icon><ChatDotRound /></el-icon>
                    AI助教
                </el-button>
                <!-- <el-dropdown>
                    <span class="user-info">
                        <el-avatar :size="32" :src="userInfo.avatar" />
                        <span class="user-name">{{ userInfo.name }}</span>
                        <el-icon><ArrowDown /></el-icon>
                    </span>
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item @click="$router.push('/ucenter')">
                                <el-icon><User /></el-icon>
                                个人中心
                            </el-dropdown-item>
                            <el-dropdown-item @click="$router.push('/notices')">
                                <el-icon><Bell /></el-icon>
                                通知中心
                            </el-dropdown-item>
                            <el-dropdown-item divided @click="logout">
                                <el-icon><SwitchButton /></el-icon>
                                退出登录
                            </el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown> -->
            </div>
        </el-header>

        <!-- 主要内容区域 -->
        <div class="dashboard-content">
            <!-- 欢迎区域和学习统计 -->
            <el-row :gutter="20" class="welcome-section">
                <el-col :span="24">
                    <el-card class="welcome-card" shadow="hover">
                        <div class="welcome-content">
                            <div class="welcome-text">
                                <h2>欢迎回来，{{ userInfo.name }}！</h2>
                                <p>今日推荐：{{ todayRecommendation }}</p>
                            </div>
                            <div class="study-stats">
                                <div class="stat-item">
                                    <div class="stat-value">{{ studyStats.todayStudyTime }}分钟</div>
                                    <div class="stat-label">今日学习</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">{{ studyStats.continuousDays }}天</div>
                                    <div class="stat-label">连续学习</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">{{ studyStats.completionRate }}%</div>
                                    <div class="stat-label">课程完成度</div>
                                </div>
                            </div>
                        </div>
                    </el-card>
                </el-col>
            </el-row>

            <!-- 核心数据指标 -->
            <el-row :gutter="20" class="metrics-section">
                <el-col :span="6">
                    <el-card class="metric-card" shadow="hover">
                        <div class="metric-content">
                            <el-icon class="metric-icon" :color="metricColors[0]">
                                <Collection />
                            </el-icon>
                            <div class="metric-info">
                                <div class="metric-value">{{ learningProgress.completedNodes }}</div>
                                <div class="metric-label">已学知识点</div>
                            </div>
                        </div>
                    </el-card>
                </el-col>
                <el-col :span="6">
                    <el-card class="metric-card" shadow="hover">
                        <div class="metric-content">
                            <el-icon class="metric-icon" :color="metricColors[1]">
                                <Document />
                            </el-icon>
                            <div class="metric-info">
                                <div class="metric-value">{{ learningProgress.totalResources }}</div>
                                <div class="metric-label">学习资源</div>
                            </div>
                        </div>
                    </el-card>
                </el-col>
                <el-col :span="6">
                    <el-card class="metric-card" shadow="hover">
                        <div class="metric-content">
                            <el-icon class="metric-icon" :color="metricColors[2]">
                                <Finished />
                            </el-icon>
                            <div class="metric-info">
                                <div class="metric-value">{{ learningProgress.avgScore }}</div>
                                <div class="metric-label">平均成绩</div>
                            </div>
                        </div>
                    </el-card>
                </el-col>
                <el-col :span="6">
                    <el-card class="metric-card" shadow="hover">
                        <div class="metric-content">
                            <el-icon class="metric-icon" :color="metricColors[3]">
                                <Clock />
                            </el-icon>
                            <div class="metric-info">
                                <div class="metric-value">{{ learningProgress.totalStudyTime }}</div>
                                <div class="metric-label">总学习时长(小时)</div>
                            </div>
                        </div>
                    </el-card>
                </el-col>
            </el-row>

            <!-- 主要功能区域 -->
            <el-row :gutter="20" class="main-section">
                <!-- 学习进度 -->
                <el-col :span="12">
                    <el-card class="function-card" shadow="hover">
                        <template #header>
                            <div class="card-header">
                                <span>学习进度概览</span>
                                <el-button type="primary" text @click="$router.push({name:'knowledge_graph'})">
                                    查看详情
                                </el-button>
                            </div>
                        </template>
                        <div class="progress-content">
                            <div class="progress-item" v-for="course in courseProgress" :key="course.id">
                                <div class="course-info">
                                    <div class="course-name">{{ course.name }}</div>
                                    <div class="course-progress">{{ course.progress }}%</div>
                                </div>
                                <el-progress 
                                    :percentage="course.progress" 
                                    :color="courseProgressColor(course.progress)"
                                    :show-text="false"
                                />
                            </div>
                        </div>
                    </el-card>
                </el-col>

                <!-- 最近学习活动 -->
                <el-col :span="12">
                    <el-card class="function-card" shadow="hover">
                        <template #header>
                            <div class="card-header">
                                <span>最近学习活动</span>
                            </div>
                        </template>
                        <div class="activities-content">
                            <div 
                                v-for="activity in recentActivities" 
                                :key="activity.id" 
                                class="activity-item"
                            >
                                <div class="activity-icon" :class="`type-${activity.type}`">
                                    <el-icon v-if="activity.type === 'exam'"><EditPen /></el-icon>
                                    <el-icon v-if="activity.type === 'resource'"><Document /></el-icon>
                                    <el-icon v-if="activity.type === 'video'"><VideoPlay /></el-icon>
                                    <el-icon v-if="activity.type === 'ai'"><ChatDotRound /></el-icon>
                                </div>
                                <div class="activity-content">
                                    <div class="activity-title">{{ activity.title }}</div>
                                    <div class="activity-desc">{{ activity.description }}</div>
                                    <div class="activity-time">{{ activity.time }}</div>
                                </div>
                            </div>
                        </div>
                    </el-card>
                </el-col>
            </el-row>

            <!-- AI助教和推荐学习 -->
            <el-row :gutter="20" class="ai-section">
                <!-- AI助教快速问答 -->
                <el-col :span="12">
                    <el-card class="function-card" shadow="hover">
                        <template #header>
                            <div class="card-header">
                                <span>AI学习助手</span>
                                <el-button type="primary" text @click="$router.push({name: 'ai_teacher'})">
                                    进入对话
                                </el-button>
                            </div>
                        </template>
                        <div class="ai-quick-chat">
                            <div class="quick-questions">
                                <h4>常见问题快速提问：</h4>
                                <div class="question-tags">
                                    <el-tag 
                                        v-for="(question, index) in quickQuestions" 
                                        :key="index"
                                        class="question-tag"
                                        @click="askQuickQuestion(question)"
                                    >
                                        {{ question }}
                                    </el-tag>
                                </div>
                            </div>
                            <div class="ai-response" v-if="quickResponse">
                                <div class="response-bubble">
                                    <p><strong>AI助教：</strong>{{ quickResponse }}</p>
                                </div>
                            </div>
                        </div>
                    </el-card>
                </el-col>

                <!-- 推荐学习路径 -->
                <el-col :span="12">
                    <el-card class="function-card" shadow="hover">
                        <template #header>
                            <div class="card-header">
                                <span>推荐学习路径</span>
                            </div>
                        </template>
                        <div class="recommended-path">
                            <div 
                                v-for="(step, index) in recommendedPath" 
                                :key="step.id"
                                class="path-step"
                                :class="{ completed: step.completed, current: step.current }"
                            >
                                <div class="step-indicator">
                                    <div class="step-number">{{ index + 1 }}</div>
                                    <div class="step-line" v-if="index < recommendedPath.length - 1"></div>
                                </div>
                                <div class="step-content">
                                    <p class="step-title">{{ step.title }}</p>
                                    <p class="step-desc">{{ step.description }}</p>
                                    <div class="step-actions">
                                        <el-button 
                                            v-if="!step.completed && !step.current" 
                                            size="small" 
                                            type="primary"
                                            @click="startLearning(step)"
                                        >
                                            开始学习
                                        </el-button>
                                        <el-button 
                                            v-if="step.current" 
                                            size="small" 
                                            type="success"
                                            @click="continueLearning(step)"
                                        >
                                            继续学习
                                        </el-button>
                                        <el-tag v-if="step.completed" type="success" size="small">已完成</el-tag>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </el-card>
                </el-col>
            </el-row>

            <!-- 通知和待办事项 -->
            <el-row :gutter="20" class="notifications-section">
                <el-col :span="24">
                    <el-card class="function-card" shadow="hover">
                        <template #header>
                            <div class="card-header">
                                <span>通知和待办事项</span>
                                <el-button type="primary" text @click="$router.push('/notices')">
                                    查看全部
                                </el-button>
                            </div>
                        </template>
                        <div class="notifications-content">
                            <div class="notifications-list">
                                <div 
                                    v-for="notice in recentNotices" 
                                    :key="notice.id" 
                                    class="notice-item"
                                    :class="{ unread: !notice.read }"
                                >
                                    <div class="notice-icon">
                                        <el-icon><Bell /></el-icon>
                                    </div>
                                    <div class="notice-content">
                                        <div class="notice-title">{{ notice.title }}</div>
                                        <div class="notice-message">{{ notice.message }}</div>
                                        <div class="notice-time">{{ notice.time }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </el-card>
                </el-col>
            </el-row>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
    Collection,
    Document,
    Finished,
    Clock,
    EditPen,
    VideoPlay,
    ChatDotRound,
    User,
    Bell,
    ArrowDown,
    SwitchButton
} from '@element-plus/icons-vue'

const router = useRouter()

// 用户信息
const userInfo = reactive({
    name: '张三',
    avatar: '',
    studentId: '2023001001'
})

// 今日推荐
const todayRecommendation = ref('完成《大数据分析》第三章的学习和测验')

// 学习统计
const studyStats = reactive({
    todayStudyTime: 45,
    continuousDays: 7,
    completionRate: 65
})

// 学习进度数据
const learningProgress = reactive({
    completedNodes: 24,
    totalResources: 156,
    avgScore: 86,
    totalStudyTime: 42
})

// 指标颜色
const metricColors = ref(['#2d8cf0', '#64d572', '#f25e43', '#e9a745'])

// 课程进度
const courseProgress = ref([
    { id: 1, name: '大数据分析与处理', progress: 75 },
    { id: 2, name: '机器学习基础', progress: 60 },
    { id: 3, name: '数据可视化', progress: 45 },
    { id: 4, name: 'Spark编程', progress: 30 }
])

// 最近学习活动
const recentActivities = ref([
    {
        id: 1,
        type: 'exam',
        title: '完成了章节测验',
        description: 'Hadoop基础章节测验，得分92分',
        time: '2小时前'
    },
    {
        id: 2,
        type: 'resource',
        title: '学习了新资源',
        description: '阅读了"MapReduce设计模式"文档',
        time: '4小时前'
    },
    {
        id: 3,
        type: 'video',
        title: '观看了教学视频',
        description: 'HDFS原理与实践（时长45分钟）',
        time: '昨天'
    },
    {
        id: 4,
        type: 'ai',
        title: '咨询了AI助教',
        description: '关于Spark性能优化的问题',
        time: '2天前'
    }
])

// 快速问题
const quickQuestions = ref([
    '什么是MapReduce？',
    'HDFS的工作原理是什么？',
    '如何优化Spark作业性能？',
    'Hive和传统数据库的区别？'
])

const quickResponse = ref('')

// 推荐学习路径
const recommendedPath = ref([
    {
        id: 1,
        title: 'Hadoop基础概念',
        description: '了解Hadoop生态系统和核心组件',
        completed: true,
        current: false
    },
    {
        id: 2,
        title: 'HDFS文件系统',
        description: '掌握HDFS的架构和文件操作',
        completed: true,
        current: false
    },
    {
        id: 3,
        title: 'MapReduce编程',
        description: '学习MapReduce编程模型和实战',
        completed: false,
        current: true
    },
    {
        id: 4,
        title: 'Hive数据仓库',
        description: '使用Hive进行数据查询和分析',
        completed: false,
        current: false
    }
])

// 最近通知
const recentNotices = ref([
    {
        id: 1,
        title: '新作业发布',
        message: '《大数据分析》第三章作业已发布，请在3天内完成',
        time: '1小时前',
        read: false
    },
    {
        id: 2,
        title: '课程提醒',
        message: '明天上午10点有《数据可视化》在线课程',
        time: '3小时前',
        read: true
    },
    {
        id: 3,
        title: '系统通知',
        message: '系统将于本周六凌晨进行维护升级',
        time: '1天前',
        read: true
    }
])

// 方法
const courseProgressColor = (progress) => {
    if (progress >= 80) return '#67c23a'
    if (progress >= 60) return '#e6a23c'
    if (progress >= 40) return '#409eff'
    return '#f56c6c'
}

const askQuickQuestion = (question) => {
    // 模拟AI回答
    const responses = {
        '什么是MapReduce？': 'MapReduce是一种编程模型，用于大规模数据集的并行运算。它将计算过程分为Map（映射）和Reduce（归约）两个阶段，适合在分布式系统中处理海量数据。',
        'HDFS的工作原理是什么？': 'HDFS（Hadoop分布式文件系统）采用主从架构，包含NameNode（主节点）和DataNode（从节点）。NameNode管理文件系统元数据，DataNode存储实际数据块，通过数据复制保证可靠性。',
        '如何优化Spark作业性能？': 'Spark性能优化可以从以下几个方面入手：合理设置分区数、使用广播变量、选择适当的存储格式、内存调优、避免数据倾斜等。',
        'Hive和传统数据库的区别？': 'Hive是基于Hadoop的数据仓库工具，使用HQL查询语言，适合批处理操作；传统数据库如MySQL支持事务、实时查询，但处理海量数据能力有限。'
    }
    
    quickResponse.value = responses[question] || '这个问题我需要更多上下文来回答，请详细描述您的问题。'
}

const startLearning = (step) => {
    ElMessage.info(`开始学习：${step.title}`)
    // 实际应用中这里应该跳转到具体的学习页面
}

const continueLearning = (step) => {
    ElMessage.info(`继续学习：${step.title}`)
    // 实际应用中这里应该跳转到具体的学习页面
}

const logout = () => {
    ElMessage.success('退出登录成功')
    router.push('/login')
}

// 生命周期
onMounted(() => {
    // 从localStorage获取用户信息
    const username = localStorage.getItem('vuems_name') || '学生'
    const role = localStorage.getItem('vuems_role') || 'student'
    
    userInfo.name = username
    console.log('学生仪表盘初始化完成，用户:', username, '角色:', role)
})
</script>

<style scoped>
.student-dashboard {
    min-height: 100vh;
    background-color: #f5f7fa;
}

.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    padding: 0 20px;
    height: 60px;
}

.header-left h1 {
    margin: 0;
    font-size: 20px;
    color: #303133;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 15px;
}

.user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 8px 12px;
    border-radius: 6px;
    transition: background-color 0.3s;
}

.user-info:hover {
    background-color: #f5f7fa;
}

.user-name {
    font-weight: 500;
}

.dashboard-content {
    padding: 20px;
}

.welcome-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
}

.welcome-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.welcome-text h2 {
    margin: 0 0 10px 0;
    font-size: 24px;
}

.welcome-text p {
    margin: 0;
    opacity: 0.9;
}

.study-stats {
    display: flex;
    gap: 30px;
}

.stat-item {
    text-align: center;
}

.stat-value {
    display: block;
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 5px;
}

.stat-label {
    font-size: 14px;
    opacity: 0.8;
}

.metrics-section {
    margin: 20px 0;
}

.metric-card {
    height: 120px;
}

.metric-content {
    display: flex;
    align-items: center;
    gap: 20px;
    height: 100%;
}

.metric-icon {
    font-size: 48px;
    opacity: 0.8;
}

.metric-info {
    flex: 1;
}

.metric-value {
    font-size: 32px;
    font-weight: bold;
    margin-bottom: 8px;
}

.metric-label {
    color: #909399;
    font-size: 14px;
}

.function-card {
    margin-bottom: 20px;
    min-height: 400px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.card-header span {
    font-size: 16px;
    font-weight: bold;
}

.progress-content {
    padding: 10px 0;
}

.progress-item {
    margin-bottom: 20px;
}

.course-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.course-name {
    font-weight: 500;
}

.course-progress {
    color: #409eff;
    font-weight: bold;
}

.activities-content {
    padding: 10px 0;
}

.activity-item {
    display: flex;
    align-items: flex-start;
    gap: 15px;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;
}

.activity-item:last-child {
    border-bottom: none;
}

.activity-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.activity-icon.type-exam {
    background: #f0f9ff;
    color: #1890ff;
}

.activity-icon.type-resource {
    background: #f6ffed;
    color: #52c41a;
}

.activity-icon.type-video {
    background: #fff7e6;
    color: #fa8c16;
}

.activity-icon.type-ai {
    background: #f0f5ff;
    color: #722ed1;
}

.activity-content {
    flex: 1;
}

.activity-title {
    font-weight: 500;
    margin-bottom: 4px;
}

.activity-desc {
    color: #666;
    font-size: 14px;
    margin-bottom: 4px;
}

.activity-time {
    color: #999;
    font-size: 12px;
}

.ai-quick-chat {
    padding: 10px 0;
}

.quick-questions h4 {
    margin-bottom: 15px;
    color: #303133;
}

.question-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 20px;
}

.question-tag {
    cursor: pointer;
    transition: all 0.3s;
}

.question-tag:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.response-bubble {
    background: #f0f5ff;
    border-radius: 12px;
    padding: 15px;
    border-left: 4px solid #1890ff;
}

.recommended-path {
    padding: 10px 0;
}

.path-step {
    display: flex;
    margin-bottom: 20px;
    position: relative;
}

.step-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-right: 15px;
}

.step-number {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #e8e8e8;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    z-index: 2;
}

.step-line {
    width: 2px;
    height: 40px;
    background: #e8e8e8;
    margin-top: 5px;
}

.step-content {
    flex: 1;
}

.step-title {
    font-weight: 500;
    margin: 0 0 5px 0;
}

.step-desc {
    color: #666;
    margin: 0 0 10px 0;
    font-size: 14px;
}

.path-step.completed .step-number {
    background: #67c23a;
    color: white;
}

.path-step.current .step-number {
    background: #409eff;
    color: white;
}

.notifications-content {
    padding: 10px 0;
}

.notice-item {
    display: flex;
    align-items: flex-start;
    gap: 15px;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;
}

.notice-item.unread {
    background: #f0f7ff;
    margin: 0 -20px;
    padding: 12px 20px;
    border-radius: 4px;
}

.notice-item:last-child {
    border-bottom: none;
}

.notice-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    flex-shrink: 0;
}

.notice-content {
    flex: 1;
}

.notice-title {
    font-weight: 500;
    margin-bottom: 4px;
}

.notice-message {
    color: #666;
    font-size: 14px;
    margin-bottom: 4px;
}

.notice-time {
    color: #999;
    font-size: 12px;
}

.welcome-section,
.metrics-section,
.main-section,
.ai-section,
.notifications-section {
    margin-bottom: 20px;
}
</style>