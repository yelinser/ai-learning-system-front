<template>
  <div class="progress-dashboard">
    <!-- 顶部：总体统计图表 -->
    <div class="top-panel">
      <div class="stats-section">
        <h2>学生总体学习情况统计</h2>
        <div class="stats-container">
          <div class="stat-card">
            <div class="stat-value">{{ students.length }}</div>
            <div class="stat-label">学生总数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ averageMastery.toFixed(1) }}%</div>
            <div class="stat-label">平均掌握度</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ conceptsCount }}</div>
            <div class="stat-label">知识点总数</div>
          </div>
        </div>
        
        <div class="charts-section">
          <div class="chart-container">
            <h3>知识点平均掌握度分布</h3>
            <div id="mastery-chart" style="width: 100%; height: 300px;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部：详细学习进度 -->
    <div class="bottom-panel">
      <div class="dashboard-container">
        <!-- 左侧：知识图谱 -->
        <div class="left-panel">
          <div class="graph-section">
            <h2>进度可视化</h2>
            <div v-if="isLoadingGraph" class="loading">正在加载进度数据...</div>
            <div v-if="errorGraph" class="error">加载进度失败: {{ errorGraph }}</div>
            <div v-if="!isLoadingGraph && !errorGraph" id="knowledge-graph-chart" style="width: 100%; height: 400px;"></div>
            <div v-if="!isLoadingGraph && !errorGraph" class="graph-controls">
              <button @click="resetGraph" class="reset-btn">重置图谱</button>
              <span class="hint">双击学生节点可展开/收起相关知识点</span>
            </div>
          </div>
        </div>

        <!-- 右侧：学生进度监控 -->
        <div class="right-panel">
          <div class="progress-monitor">
            <h2>学生详细学习进度</h2>

            <div class="student-selector">
              <label for="student-select">选择学生：</label>
              <span v-if="isLoadingStudents">正在加载学生列表...</span>
              <span v-if="errorStudents" class="error">
                加载失败: {{ errorStudents }}
              </span>
              <select 
                id="student-select" 
                v-model="selectedStudentId" 
                :disabled="isLoadingStudents || students.length === 0"
              >
                <option :value="null">-- 请选择一个学生 --</option>
                <option 
                  v-for="student in students" 
                  :key="student.id" 
                  :value="student.id"
                >
                  {{ student.name }}
                </option>
              </select>
            </div>

            <div class="progress-display">
              <div v-if="!selectedStudentId" class="placeholder">
                请先在上方选择一个学生以查看进度。
              </div>

              <div v-if="isLoadingProgress" class="loading">
                正在加载 {{ selectedStudentName }} 的进度...
              </div>

              <div v-if="errorProgress" class="error">
                加载进度失败: {{ errorProgress }}
              </div>
              
              <div v-if="progressData && !isLoadingProgress">
                <h3>{{ selectedStudentName }} 的学习进度详情</h3>
                
                <div v-if="progressData.length === 0" class="no-progress">
                  该学生暂无学习进度数据。
                </div>

                <ul v-else class="progress-list">
                  <li 
                    v-for="item in progressData" 
                    :key="item.concept" 
                    class="progress-item"
                  >
                    <div class="item-info">
                      <span class="concept-name">{{ item.concept }}</span>
                      <span class="status" :class="item.status">
                        ({{ getStatusText(item.status) }})
                      </span>
                    </div>
                    
                    <div class="item-progress">
                      <div class="progress-bar-container">
                        <div 
                          class="progress-bar" 
                          :style="{ width: item.progress + '%' }"
                          :class="getProgressLevel(item.progress)"
                        ></div>
                      </div>
                      <span class="percentage">{{ item.progress }}%</span>
                    </div>
                  </li>
                </ul>
                
                <!-- 学生个人进度统计 -->
                <div class="student-stats">
                  <div class="student-stat-card">
                    <div class="stat-value">{{ studentCompletedConcepts }}</div>
                    <div class="stat-label">已完成知识点</div>
                  </div>
                  <div class="student-stat-card">
                    <div class="stat-value">{{ studentInProgressConcepts }}</div>
                    <div class="stat-label">进行中知识点</div>
                  </div>
                  <div class="student-stat-card">
                    <div class="stat-value">{{ studentAverageProgress.toFixed(1) }}%</div>
                    <div class="stat-label">平均进度</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick ,onUnmounted} from 'vue';
import * as echarts from 'echarts';

// --- 状态定义 ---
const BASE_URL = 'http://patrickshao.site:8000';

// 学生相关状态
const students = ref([]);
const selectedStudentId = ref(null);
const isLoadingStudents = ref(false);
const errorStudents = ref(null);

// 学生进度相关状态
const progressData = ref(null);
const isLoadingProgress = ref(false);
const errorProgress = ref(null);

// 知识图谱相关状态
const graphData = ref(null);
const isLoadingGraph = ref(false);
const errorGraph = ref(null);
const chartInstance = ref(null);
const masteryChartInstance = ref(null);

// 展开状态管理
const expandedStudents = ref(new Set()); // 存储已展开的学生ID
const allNodes = ref([]); // 所有节点数据
const allLinks = ref([]); // 所有边数据

// --- API 调用函数 ---

// 获取学生列表
async function fetchStudents() {
  isLoadingStudents.value = true;
  errorStudents.value = null;
  
  try {
    const response = await fetch(`${BASE_URL}/knowledge-graph/students`);
    if (!response.ok) {
      throw new Error(`HTTP 错误! 状态: ${response.status}`);
    }
    const data = await response.json();
    
    if (data && data.students) {
      students.value = data.students;
    } else {
      students.value = [];
      throw new Error("返回的数据格式不正确，缺少 'students' 数组。");
    }

  } catch (err) {
    console.error('获取学生列表失败:', err);
    errorStudents.value = err.message;
  } finally {
    isLoadingStudents.value = false;
  }
}

// 获取学生进度
async function fetchStudentProgress(studentId) {
  if (!studentId) {
    progressData.value = null;
    return;
  }

  isLoadingProgress.value = true;
  errorProgress.value = null;
  progressData.value = null;
  
  try {
    const response = await fetch(`${BASE_URL}/knowledge-graph/students/${studentId}/learning-progress`);
    if (!response.ok) {
      throw new Error(`HTTP 错误! 状态: ${response.status}`);
    }
    const data = await response.json();
    
    if (data && data.progress) {
      progressData.value = data.progress;
    } else if (data) {
      progressData.value = [];
    } else {
      throw new Error("返回的进度数据格式不正确，缺少 'progress' 数组。");
    }

  } catch (err) {
    console.error('获取学生进度失败:', err);
    errorProgress.value = err.message;
  } finally {
    isLoadingProgress.value = false;
  }
}

// 获取知识图谱数据
async function fetchKnowledgeGraph() {
  isLoadingGraph.value = true;
  errorGraph.value = null;
  
  try {
    const response = await fetch(`${BASE_URL}/knowledge-graph/graph-data`);
    if (!response.ok) {
      throw new Error(`HTTP 错误! 状态: ${response.status}`);
    }
    const data = await response.json();
    graphData.value = data;
    processGraphData(data);
    renderKnowledgeGraph();
    renderMasteryChart();
  } catch (err) {
    console.error('获取知识图谱失败:', err);
    errorGraph.value = err.message;
  } finally {
    isLoadingGraph.value = false;
  }
}

// 处理图谱数据
function processGraphData(data) {
  if (!data || !data.nodes) return;
  
  const studentNodes = data.nodes.filter(node => 
    node.labels && node.labels.includes('Student')
  );
  
  const learningRecordNodes = data.nodes.filter(node => 
    node.labels && node.labels.includes('LearningRecord')
  );
  
  const conceptNodes = data.nodes.filter(node =>
    node.labels && node.labels.includes('Concept')
  );
  
  // 存储所有节点和边数据
  allNodes.value = [...studentNodes, ...learningRecordNodes, ...conceptNodes];
  allLinks.value = data.relationships || [];
}

// 知识点掌握度分布图表
function renderMasteryChart() {
  nextTick(() => {
    const chartDom = document.getElementById('mastery-chart');
    if (!chartDom) return;
    
    if (masteryChartInstance.value) {
      masteryChartInstance.value.dispose();
    }
    
    masteryChartInstance.value = echarts.init(chartDom);
    
    const masteryData = conceptMastery.value;
    const categories = masteryData.map(item => item.name);
    const values = masteryData.map(item => item.averageProgress);
    
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: '{b}: {c}%'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          interval: 0,
          rotate: 30
        }
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: {
          formatter: '{value}%'
        }
      },
      series: [
        {
          data: values,
          type: 'bar',
          itemStyle: {
            color: function(params) {
              const value = params.value;
              if (value >= 80) return '#67c23a';
              if (value >= 60) return '#e6a23c';
              if (value >= 40) return '#f56c6c';
              return '#909399';
            }
          },
          label: {
            show: true,
            position: 'top',
            formatter: '{c}%'
          }
        }
      ]
    };
    
    masteryChartInstance.value.setOption(option);
    
    window.addEventListener('resize', () => {
      masteryChartInstance.value.resize();
    });
  });
}

// --- 知识图谱可视化 ---
function renderKnowledgeGraph() {
  if (!allNodes.value.length) return;
  
  nextTick(() => {
    const chartDom = document.getElementById('knowledge-graph-chart');
    if (!chartDom) return;
    
    if (chartInstance.value) {
      chartInstance.value.dispose();
    }
    
    chartInstance.value = echarts.init(chartDom);
    
    // 构建当前显示的节点和边
    const displayNodes = [];
    const displayLinks = [];
    
    // 添加学生节点（始终显示）
    const studentNodes = allNodes.value.filter(node => 
      node.labels && node.labels.includes('Student')
    );
    
    studentNodes.forEach(student => {
      if(!student.properties.name) return;
      displayNodes.push({
        id: student.id,
        name: student.properties.name || `学生${student.id}`,
        category: 0,
        symbolSize: 30,
        itemStyle: {
          color: expandedStudents.value.has(student.id) ? '#1890ff' : '#5470c6'
        },
        label: {
          show: true,
          formatter: student.properties.name || `学生${student.id}`,
          fontWeight: expandedStudents.value.has(student.id) ? 'bold' : 'normal'
        }
      });
    });
    
    // 添加已展开学生的相关节点和边
    expandedStudents.value.forEach(studentId => {
      // 找到该学生的学习记录
      const studentRecords = allNodes.value.filter(node =>
        node.labels && node.labels.includes('LearningRecord') &&
        node.properties.student_id === allNodes.value.find(s => s.id === studentId)?.properties?.id
      );
      
      // 添加学习记录节点
      studentRecords.forEach(record => {
        const progress = record.properties.progress || 0;
        displayNodes.push({
          id: record.id,
          name: record.properties.concept_name || '未知概念',
          category: 1,
          symbolSize: 20 + (progress / 100) * 20,
          value: progress,
          itemStyle: {
            color: getProgressColor(progress)
          },
          label: {
            show: true,
            formatter: `${record.properties.concept_name}\n${progress}%`
          }
        });
        
        // 添加学生到学习记录的边
        displayLinks.push({
          source: studentId,
          target: record.id,
          value: progress,
          lineStyle: {
            color: getProgressColor(progress)
          }
        });
      });
      
      // 添加概念节点和边
      studentRecords.forEach(record => {
        if (record.properties.concept_name) {
          const conceptNode = allNodes.value.find(node =>
            node.labels && node.labels.includes('Concept') &&
            node.properties.name === record.properties.concept_name
          );
          
          if (conceptNode && !displayNodes.find(n => n.id === conceptNode.id)) {
            displayNodes.push({
              id: conceptNode.id,
              name: conceptNode.properties.name || '未知概念',
              category: 2,
              symbolSize: 25,
              itemStyle: {
                color: '#91cc75'
              },
              label: {
                show: true
              }
            });
          }
          
          // 添加学习记录到概念的边
          if (conceptNode) {
            displayLinks.push({
              source: record.id,
              target: conceptNode.id,
              value: record.properties.progress || 0,
              lineStyle: {
                color: getProgressColor(record.properties.progress || 0)
              }
            });
          }
        }
      });
    });
    
    const option = {
      title: {
        text: '学习进度可视化',
        textStyle: {
          fontSize: 16
        }
      },
      tooltip: {
        formatter: function(params) {
          if (params.dataType === 'node') {
            const progress = params.data.value || 0;
            let info = `${params.data.name}`;
            if (params.data.category === 1) {
              info += `<br/>进度: ${progress}%`;
            }
            return info;
          }
          return `${params.data.source} → ${params.data.target}`;
        }
      },
      legend: {
        data: ['学生', '学习记录', '知识点']
      },
      series: [{
        type: 'graph',
        layout: 'force',
        data: displayNodes,
        links: displayLinks,
        categories: [
          { name: '学生', itemStyle: { color: '#5470c6' } },
          { name: '学习记录', itemStyle: { color: '#ee6666' } },
          { name: '知识点', itemStyle: { color: '#91cc75' } }
        ],
        roam: true,
        label: {
          show: true,
          position: 'right',
          formatter: '{b}'
        },
        lineStyle: {
          color: 'source',
          curveness: 0.3
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 3
          }
        },
        force: {
          repulsion: 1000,
          gravity: 0.1,
          edgeLength: 100
        }
      }]
    };
    
    chartInstance.value.setOption(option);
    
    // 添加双击事件监听
    chartInstance.value.off('dblclick');
    chartInstance.value.on('dblclick', (params) => {
      if (params.dataType === 'node' && params.data.category === 0) {
        // 双击学生节点
        toggleStudentExpand(params.data.id);
      }
    });
    
    // 响应窗口大小变化
    window.addEventListener('resize', () => {
      chartInstance.value.resize();
    });
  });
}

// 切换学生节点展开状态
function toggleStudentExpand(studentId) {
  if (expandedStudents.value.has(studentId)) {
    expandedStudents.value.delete(studentId);
  } else {
    expandedStudents.value.add(studentId);
  }
  renderKnowledgeGraph();
}

// 重置图谱
function resetGraph() {
  expandedStudents.value.clear();
  renderKnowledgeGraph();
}

// --- 计算属性 ---

// 知识点平均掌握度计算
const conceptMastery = computed(() => {
  if (!graphData.value || !graphData.value.nodes) return [];
  
  const learningRecords = graphData.value.nodes.filter(node =>
    node.labels && node.labels.includes('LearningRecord')
  );
  
  const conceptProgress: Record<string, { total: number; count: number }> = {};
  
  learningRecords.forEach(record => {
    const conceptName = record.properties.concept_name;
    const progress = record.properties.progress || 0;
    
    if (!conceptProgress[conceptName]) {
      conceptProgress[conceptName] = {
        total: 0,
        count: 0
      };
    }
    
    conceptProgress[conceptName].total += progress;
    conceptProgress[conceptName].count += 1;
  });
  
  return Object.entries(conceptProgress)
    .map(([name, data]) => ({
      name,
      averageProgress: data.total / data.count
    }))
    .sort((a, b) => b.averageProgress - a.averageProgress);
});

// 总体统计计算
const averageMastery = computed(() => {
  if (conceptMastery.value.length === 0) return 0;
  const total = conceptMastery.value.reduce((sum, concept) => sum + concept.averageProgress, 0);
  return total / conceptMastery.value.length;
});

const conceptsCount = computed(() => {
  if (!graphData.value || !graphData.value.nodes) return 0;
  return graphData.value.nodes.filter(node => 
    node.labels && node.labels.includes('Concept')
  ).length;
});

// 学生个人进度统计
const studentCompletedConcepts = computed(() => {
  if (!progressData.value) return 0;
  return progressData.value.filter(item => item.status === 'completed').length;
});

const studentInProgressConcepts = computed(() => {
  if (!progressData.value) return 0;
  return progressData.value.filter(item => item.status === 'in_progress').length;
});

const studentAverageProgress = computed(() => {
  if (!progressData.value || progressData.value.length === 0) return 0;
  const total = progressData.value.reduce((sum, item) => sum + item.progress, 0);
  return total / progressData.value.length;
});

const selectedStudentName = computed(() => {
  if (!selectedStudentId.value) return '';
  const student = students.value.find(s => s.id === selectedStudentId.value);
  return student ? student.name : `ID: ${selectedStudentId.value}`;
});

// --- 工具函数 ---
function getProgressColor(progress) {
  if (progress >= 80) return '#67c23a';
  if (progress >= 60) return '#e6a23c';
  if (progress >= 40) return '#f56c6c';
  return '#909399';
}

function getProgressLevel(progress) {
  if (progress >= 80) return 'excellent';
  if (progress >= 60) return 'good';
  if (progress >= 40) return 'average';
  return 'poor';
}

function getStatusText(status) {
  const statusMap = {
    'not_started': '未开始',
    'in_progress': '进行中',
    'completed': '已完成'
  };
  return statusMap[status] || status;
}

// --- 生命周期和侦听器 ---
onMounted(() => {
  fetchStudents();
  fetchKnowledgeGraph();
});

watch(selectedStudentId, (newId) => {
  fetchStudentProgress(newId);
});

onUnmounted(() => {
  if (chartInstance.value) {
    chartInstance.value.dispose();
  }
  if (masteryChartInstance.value) {
    masteryChartInstance.value.dispose();
  }
});
</script>

<style scoped>
.progress-dashboard {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  padding: 20px;
  height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.top-panel {
  margin-bottom: 20px;
}

.bottom-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.dashboard-container {
  display: flex;
  gap: 20px;
  height: 100%;
}

.stats-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.stats-container {
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  min-width: 120px;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #1890ff;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
}

.charts-section {
  display: flex;
  gap: 20px;
}

.chart-container {
  flex: 1;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
}

.chart-container h3 {
  margin-top: 0;
  text-align: center;
  color: #333;
}

.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.right-panel {
  width: 400px;
  min-width: 400px;
}

.graph-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  flex: 1;
  display: flex;
  flex-direction: column;
}

.graph-controls {
  margin-top: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
}

.reset-btn {
  padding: 8px 16px;
  background-color: #f0f0f0;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.reset-btn:hover {
  background-color: #e6f7ff;
  border-color: #91d5ff;
}

.hint {
  font-size: 12px;
  color: #666;
}

.progress-monitor {
  height: 100%;
  overflow-y: auto;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.student-selector {
  margin-bottom: 25px;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 8px;
}

.student-selector label {
  margin-right: 10px;
  font-weight: bold;
}

.student-selector select {
  padding: 8px 12px;
  font-size: 16px;
  border-radius: 4px;
  border: 1px solid #ccc;
  width: 200px;
}

.progress-display {
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 8px;
  min-height: 150px;
}

.progress-display h3 {
  border-bottom: 2px solid #007bff;
  padding-bottom: 5px;
  margin-bottom: 15px;
}

.placeholder, .no-progress {
  color: #777;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 150px;
  font-style: italic;
}

.loading {
  color: #007bff;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 150px;
}

.error {
  color: #dc3545;
  font-weight: bold;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
}

.progress-list {
  list-style: none;
  padding: 0;
  margin: 0 0 20px 0;
}

.progress-item {
  display: flex;
  flex-direction: column;
  padding: 12px 8px;
  border-bottom: 1px solid #f0f0f0;
}

.progress-item:last-child {
  border-bottom: none;
}

.item-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.concept-name {
  font-weight: bold;
  font-size: 1.1em;
  color: #333;
}

.status {
  font-size: 0.9em;
  color: #666;
}

.status.in_progress {
  color: #007bff;
}

.item-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar-container {
  flex: 1;
  height: 10px;
  background-color: #e9ecef;
  border-radius: 5px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  transition: width 0.3s ease;
}

.progress-bar.excellent { background-color: #67c23a; }
.progress-bar.good { background-color: #e6a23c; }
.progress-bar.average { background-color: #f56c6c; }
.progress-bar.poor { background-color: #909399; }

.percentage {
  width: 50px;
  text-align: right;
  font-weight: bold;
  color: #333;
}

.student-stats {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.student-stat-card {
  text-align: center;
  padding: 10px;
}

@media (max-width: 1024px) {
  .dashboard-container {
    flex-direction: column;
  }
  
  .right-panel {
    width: 100%;
    min-width: auto;
  }
  
  .stats-container {
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .stat-card {
    flex: 1;
    min-width: calc(50% - 20px);
  }
  
  .charts-section {
    flex-direction: column;
  }
}
</style>