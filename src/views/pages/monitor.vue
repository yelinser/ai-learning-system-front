<template>
  <div class="student-progress-monitor">
    <header>
      <h1 class="page-title">学生进度监控</h1>
      <div class="controls">
        <div class="filter-group">
          <label class="filter-label">班级</label>
          <select class="filter-select" v-model="selectedClass">
            <option value="all">所有班级</option>
            <option v-for="cls in classes" :key="cls.id" :value="cls.id">{{ cls.name }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">知识点</label>
          <select class="filter-select" v-model="selectedKnowledge">
            <option value="all">所有知识点</option>
            <option v-for="knowledge in knowledgePoints" :key="knowledge.id" :value="knowledge.id">{{ knowledge.name }}</option>
          </select>
        </div>
        <button class="btn secondary">
          <i class="fas fa-download"></i> 导出报告
        </button>
      </div>
    </header>
    
    <div class="dashboard">
      <div class="student-list">
        <div 
          v-for="student in filteredStudents" 
          :key="student.id"
          class="student-item"
          :class="{ active: selectedStudent && selectedStudent.id === student.id }"
          @click="selectStudent(student)"
        >
          <div class="student-avatar">{{ student.name.charAt(0) }}</div>
          <div class="student-info">
            <div class="student-name">{{ student.name }}</div>
            <div class="student-progress">
              <div class="progress-bar">
                <div class="progress" :style="{ width: student.progress + '%' }"></div>
              </div>
              <span>{{ student.progress }}%</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="knowledge-graph">
        <div class="chart-container" ref="chart"></div>
      </div>
    </div>
    
    <div class="student-details" v-if="selectedStudent">
      <div class="detail-header">
        <div class="detail-title">{{ selectedStudent.name }} - 学习详情</div>
        <button class="btn">
          <i class="fas fa-download"></i> 导出学习报告
        </button>
      </div>
      
      <div class="detail-content">
        <div class="learning-path">
          <div class="path-title">学习路径</div>
          <div class="path-item" v-for="path in learningPaths" :key="path.id">
            <div class="path-status" :class="getStatusClass(path.status)">
              <i v-if="path.status === 'completed'" class="fas fa-check"></i>
              <i v-else-if="path.status === 'in-progress'" class="fas fa-spinner"></i>
            </div>
            <div class="path-info">
              <div class="path-name">{{ path.name }}</div>
              <div class="path-meta">
                <span>知识点: {{ path.knowledge }}</span>
                <span>预计时长: {{ path.duration }}分钟</span>
                <span>完成度: {{ path.progress }}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="weakness-analysis">
          <div class="weakness-title">薄弱知识点分析</div>
          <div class="weakness-item" v-for="weakness in weaknesses" :key="weakness.id">
            <div class="weakness-name">{{ weakness.name }}</div>
            <div class="weakness-level" :class="getLevelClass(weakness.level)">
              {{ weakness.level }}
            </div>
          </div>
        </div>
      </div>
      
      <div class="behavior-analysis">
        <div class="behavior-card">
          <div class="behavior-title">学习行为分析</div>
          <div class="behavior-content">
            <div class="behavior-item">
              <div class="behavior-label">总学习时长</div>
              <div class="behavior-value">{{ selectedStudent.studyTime }}小时</div>
            </div>
            <div class="behavior-item">
              <div class="behavior-label">平均每日学习</div>
              <div class="behavior-value">{{ selectedStudent.dailyAverage }}分钟</div>
            </div>
            <div class="behavior-item">
              <div class="behavior-label">完成资源数</div>
              <div class="behavior-value">{{ selectedStudent.completedResources }}</div>
            </div>
            <div class="behavior-item">
              <div class="behavior-label">测验平均分</div>
              <div class="behavior-value">{{ selectedStudent.averageScore }}</div>
            </div>
          </div>
        </div>
        
        <div class="behavior-card">
          <div class="behavior-title">资源偏好</div>
          <div class="behavior-content">
            <div class="behavior-item">
              <div class="behavior-label">视频课程</div>
              <div class="behavior-value">{{ selectedStudent.preferences.video }}%</div>
            </div>
            <div class="behavior-item">
              <div class="behavior-label">阅读材料</div>
              <div class="behavior-value">{{ selectedStudent.preferences.reading }}%</div>
            </div>
            <div class="behavior-item">
              <div class="behavior-label">实践练习</div>
              <div class="behavior-value">{{ selectedStudent.preferences.practice }}%</div>
            </div>
            <div class="behavior-item">
              <div class="behavior-label">测验</div>
              <div class="behavior-value">{{ selectedStudent.preferences.quiz }}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';

export default {
  name: 'StudentProgressMonitor',
  setup() {
    // 模拟数据
    const classes = ref([
      { id: 'class1', name: '大数据分析2023级1班' },
      { id: 'class2', name: '大数据分析2023级2班' }
    ]);
    
    const knowledgePoints = ref([
      { id: 'hadoop', name: 'Hadoop基础' },
      { id: 'hdfs', name: 'HDFS' },
      { id: 'mapreduce', name: 'MapReduce' },
      { id: 'hive', name: 'Hive' },
      { id: 'spark', name: 'Spark' },
      { id: 'sparksql', name: 'Spark SQL' },
      { id: 'ml', name: '机器学习' },
      { id: 'visualization', name: '数据可视化' }
    ]);
    
    const students = ref([
      {
        id: 's1',
        name: '张三',
        classId: 'class1',
        progress: 65,
        studyTime: 42,
        dailyAverage: 75,
        completedResources: 24,
        averageScore: 86,
        preferences: {
          video: 45,
          reading: 25,
          practice: 20,
          quiz: 10
        }
      },
      {
        id: 's2',
        name: '李四',
        classId: 'class1',
        progress: 78,
        studyTime: 56,
        dailyAverage: 90,
        completedResources: 32,
        averageScore: 92,
        preferences: {
          video: 30,
          reading: 35,
          practice: 25,
          quiz: 10
        }
      },
      {
        id: 's3',
        name: '王五',
        classId: 'class1',
        progress: 52,
        studyTime: 32,
        dailyAverage: 50,
        completedResources: 18,
        averageScore: 75,
        preferences: {
          video: 60,
          reading: 15,
          practice: 15,
          quiz: 10
        }
      },
      {
        id: 's4',
        name: '赵六',
        classId: 'class2',
        progress: 88,
        studyTime: 68,
        dailyAverage: 110,
        completedResources: 38,
        averageScore: 94,
        preferences: {
          video: 25,
          reading: 40,
          practice: 25,
          quiz: 10
        }
      },
      {
        id: 's5',
        name: '钱七',
        classId: 'class2',
        progress: 72,
        studyTime: 48,
        dailyAverage: 80,
        completedResources: 28,
        averageScore: 84,
        preferences: {
          video: 35,
          reading: 30,
          practice: 25,
          quiz: 10
        }
      }
    ]);
    
    const learningPaths = ref([
      { id: 'p1', name: 'Hadoop基础入门', knowledge: 'Hadoop基础', status: 'completed', duration: 45, progress: 100 },
      { id: 'p2', name: 'HDFS文件操作', knowledge: 'HDFS', status: 'completed', duration: 30, progress: 100 },
      { id: 'p3', name: 'MapReduce编程', knowledge: 'MapReduce', status: 'in-progress', duration: 60, progress: 75 },
      { id: 'p4', name: 'Hive数据仓库', knowledge: 'Hive', status: 'not-started', duration: 55, progress: 0 },
      { id: 'p5', name: 'Spark核心原理', knowledge: 'Spark', status: 'not-started', duration: 50, progress: 0 },
      { id: 'p6', name: 'Spark SQL应用', knowledge: 'Spark SQL', status: 'not-started', duration: 45, progress: 0 }
    ]);
    
    const weaknesses = ref([
      { id: 'w1', name: 'MapReduce优化', level: '高' },
      { id: 'w2', name: 'Spark性能调优', level: '中' },
      { id: 'w3', name: 'Hive复杂查询', level: '低' }
    ]);
    
    // 状态管理
    const selectedClass = ref('all');
    const selectedKnowledge = ref('all');
    const selectedStudent = ref(null);
    const chart = ref(null);
    let myChart = null;
    
    // 计算属性
    const filteredStudents = computed(() => {
      return students.value.filter(student => {
        const classMatch = selectedClass.value === 'all' || student.classId === selectedClass.value;
        return classMatch;
      });
    });
    
    // 方法
    const selectStudent = (student) => {
      selectedStudent.value = student;
    };
    
    const getStatusClass = (status) => {
      return {
        'status-completed': status === 'completed',
        'status-in-progress': status === 'in-progress',
        'status-not-started': status === 'not-started'
      };
    };
    
    const getLevelClass = (level) => {
      return {
        'level-high': level === '高',
        'level-medium': level === '中',
        'level-low': level === '低'
      };
    };
    
    const initChart = () => {
      if (!chart.value) return;
      
      myChart = echarts.init(chart.value);
      
      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c}%'
        },
        visualMap: {
          min: 0,
          max: 100,
          text: ['掌握度高', '掌握度低'],
          realtime: false,
          calculable: true,
          inRange: {
            color: ['#e0f7fa', '#4cc9f0', '#4361ee']
          }
        },
        series: [
          {
            name: '知识点掌握情况',
            type: 'treemap',
            visibleMin: 300,
            label: {
              show: true,
              formatter: '{b}'
            },
            upperLabel: {
              show: true,
              height: 30,
              formatter: '{c}%'
            },
            itemStyle: {
              borderColor: '#fff'
            },
            levels: [
              {
                itemStyle: {
                  borderWidth: 0,
                  gapWidth: 5
                }
              },
              {
                itemStyle: {
                  gapWidth: 1
                }
              }
            ],
            data: [
              {
                name: 'Hadoop基础',
                value: 85,
                itemStyle: {
                  color: '#4cc9f0'
                }
              },
              {
                name: 'HDFS',
                value: 78,
                itemStyle: {
                  color: '#4895ef'
                }
              },
              {
                name: 'MapReduce',
                value: 65,
                itemStyle: {
                  color: '#4361ee'
                }
              },
              {
                name: 'Hive',
                value: 72,
                itemStyle: {
                  color: '#3f37c9'
                }
              },
              {
                name: 'Spark',
                value: 68,
                itemStyle: {
                  color: '#560bad'
                }
              },
              {
                name: 'Spark SQL',
                value: 75,
                itemStyle: {
                  color: '#7209b7'
                }
              },
              {
                name: '机器学习',
                value: 60,
                itemStyle: {
                  color: '#b5179e'
                }
              },
              {
                name: '数据可视化',
                value: 82,
                itemStyle: {
                  color: '#f72585'
                }
              }
            ]
          }
        ]
      };
      
      myChart.setOption(option);
    };
    
    // 生命周期钩子
    onMounted(() => {
      initChart();
    });
    
    onUnmounted(() => {
      if (myChart) {
        myChart.dispose();
      }
    });
    
    // 监听窗口大小变化
    const handleResize = () => {
      if (myChart) {
        myChart.resize();
      }
    };
    
    onMounted(() => {
      window.addEventListener('resize', handleResize);
    });
    
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize);
    });
    
    return {
      classes,
      knowledgePoints,
      students,
      learningPaths,
      weaknesses,
      selectedClass,
      selectedKnowledge,
      selectedStudent,
      chart,
      filteredStudents,
      selectStudent,
      getStatusClass,
      getLevelClass
    };
  }
};
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
}

:root {
  --primary: #4361ee;
  --secondary: #3f37c9;
  --success: #4cc9f0;
  --warning: #f72585;
  --light: #f8f9fa;
  --dark: #212529;
  --gray: #6c757d;
  --light-gray: #e9ecef;
  --border-radius: 12px;
  --box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  --transition: all 0.3s ease;
}

.student-progress-monitor {
  background-color: #f5f7fa;
  color: #333;
  line-height: 1.6;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding: 15px 0;
  border-bottom: 1px solid var(--light-gray);
}

.page-title {
  font-size: 28px;
  color: var(--dark);
  font-weight: 700;
}

.controls {
  display: flex;
  gap: 15px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  min-width: 180px;
}

.filter-label {
  font-size: 14px;
  color: var(--gray);
  margin-bottom: 5px;
}

.filter-select {
  padding: 10px;
  border: 1px solid var(--light-gray);
  border-radius: var(--border-radius);
  background: white;
  font-size: 14px;
  cursor: pointer;
}

.btn {
  padding: 10px 20px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: var(--transition);
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn:hover {
  background: var(--secondary);
}

.btn.secondary {
  background: var(--light);
  color: var(--primary);
  border: 1px solid var(--primary);
}

.btn.secondary:hover {
  background: var(--primary);
  color: white;
}

.dashboard {
  display: grid;
  grid-template-columns: 1fr 3fr;
  gap: 20px;
  margin-bottom: 30px;
}

.student-list {
  background: white;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  padding: 15px;
  height: 600px;
  overflow-y: auto;
}

.student-item {
  padding: 15px;
  border-radius: var(--border-radius);
  margin-bottom: 10px;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  gap: 15px;
}

.student-item:hover {
  background: #e6f7ff;
}

.student-item.active {
  background: #e6f7ff;
  border-left: 4px solid var(--primary);
}

.student-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--success));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 16px;
}

.student-info {
  flex: 1;
}

.student-name {
  font-weight: 600;
  margin-bottom: 5px;
}

.student-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--gray);
}

.progress-bar {
  height: 6px;
  flex: 1;
  background: var(--light-gray);
  border-radius: 3px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: var(--success);
  border-radius: 3px;
}

.knowledge-graph {
  background: white;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  padding: 20px;
  height: 600px;
}

.chart-container {
  width: 100%;
  height: 100%;
}

.student-details {
  background: white;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  padding: 25px;
  margin-bottom: 30px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--light-gray);
}

.detail-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--dark);
}

.detail-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
}

.learning-path {
  background: var(--light);
  border-radius: var(--border-radius);
  padding: 20px;
}

.path-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 15px;
  color: var(--dark);
}

.path-item {
  display: flex;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 10px;
  background: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.path-status {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  margin-right: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-completed {
  background: var(--success);
  color: white;
}

.status-in-progress {
  background: var(--primary);
  color: white;
}

.status-not-started {
  background: var(--light-gray);
  color: var(--gray);
}

.path-info {
  flex: 1;
}

.path-name {
  font-weight: 600;
  margin-bottom: 5px;
}

.path-meta {
  display: flex;
  font-size: 13px;
  color: var(--gray);
  gap: 15px;
}

.weakness-analysis {
  background: var(--light);
  border-radius: var(--border-radius);
  padding: 20px;
}

.weakness-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 15px;
  color: var(--dark);
}

.weakness-item {
  display: flex;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 10px;
  background: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.weakness-name {
  flex: 1;
  font-weight: 500;
}

.weakness-level {
  width: 80px;
  text-align: center;
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.level-high {
  background: #ffebee;
  color: #f44336;
}

.level-medium {
  background: #fff8e1;
  color: #ff9800;
}

.level-low {
  background: #e8f5e9;
  color: #4caf50;
}

.behavior-analysis {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-top: 30px;
}

.behavior-card {
  background: var(--light);
  border-radius: var(--border-radius);
  padding: 20px;
}

.behavior-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 15px;
  color: var(--dark);
}

.behavior-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.behavior-item {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  border-radius: 8px;
  background: white;
}

.behavior-label {
  font-weight: 500;
}

.behavior-value {
  font-weight: 600;
  color: var(--primary);
}

@media (max-width: 1200px) {
  .dashboard {
    grid-template-columns: 1fr;
  }
  
  .detail-content {
    grid-template-columns: 1fr;
  }
  
  .behavior-analysis {
    grid-template-columns: 1fr;
  }
}
</style>
