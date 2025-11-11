<template>
  <div class="progress-monitor">
    <h1>学生进度监控</h1>

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
        <h2>{{ selectedStudentName }} 的学习进度</h2>
        
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
                ({{ item.status === 'in_progress' ? '进行中' : item.status }})
              </span>
            </div>
            
            <div class="item-progress">
              <div class="progress-bar-container">
                <div 
                  class="progress-bar" 
                  :style="{ width: item.progress + '%' }"
                ></div>
              </div>
              <span class="percentage">{{ item.progress }}%</span>
            </div>
          </li>
        </ul>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';

// --- 状态定义 ---
const BASE_URL = 'http://patrickshao.site:8000';
const students = ref([]);
const selectedStudentId = ref(null);
const isLoadingStudents = ref(false);
const errorStudents = ref(null);

const progressData = ref(null); // 将存储 data.progress 数组
const isLoadingProgress = ref(false);
const errorProgress = ref(null);

// --- 逻辑实现 ---

/**
 * 1. 获取所有学生 (API 1) - [已确认]
 */
async function fetchStudents() {
  isLoadingStudents.value = true;
  errorStudents.value = null;
  console.log('开始获取学生列表...');
  
  try {
    const response = await fetch(`${BASE_URL}/knowledge-graph/students`);
    if (!response.ok) {
      throw new Error(`HTTP 错误! 状态: ${response.status}`);
    }
    const data = await response.json();
    
    // [已更新] 根据 API 1 JSON，学生数组在 data.students 中
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

/**
 * 2. 根据 ID 获取学生进度 (API 2) - [已更新]
 */
async function fetchStudentProgress(studentId) {
  if (!studentId) {
    progressData.value = null;
    return;
  }

  isLoadingProgress.value = true;
  errorProgress.value = null;
  progressData.value = null; 
  console.log(`开始获取 ID 为 ${studentId} 的学生进度...`);
  
  try {
    const response = await fetch(`${BASE_URL}/knowledge-graph/students/${studentId}/learning-progress`);
    if (!response.ok) {
      throw new Error(`HTTP 错误! 状态: ${response.status}`);
    }
    const data = await response.json();
    
    // [已更新] 根据 API 2 JSON，进度数据在 data.progress 数组中
    if (data && data.progress) {
      progressData.value = data.progress;
    } else if (data) {
      progressData.value = []; // API 正常返回，但无进度数据
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

// --- 侦听器与生命周期 ---

onMounted(() => {
  fetchStudents();
});

watch(selectedStudentId, (newId, oldId) => {
  if (newId !== oldId) {
    fetchStudentProgress(newId);
  }
});

const selectedStudentName = computed(() => {
  if (!selectedStudentId.value) return '';
  const student = students.value.find(s => s.id === selectedStudentId.value);
  return student ? student.name : `ID: ${selectedStudentId.value}`;
});

</script>

<style scoped>
/* [新样式] 为进度列表添加了样式 */
.progress-monitor {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

/* --- 选择器样式 (无变化) --- */
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
}

/* --- 进度显示容器 (无变化) --- */
.progress-display {
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 8px;
  min-height: 150px;
}
.progress-display h2 {
  border-bottom: 2px solid #007bff;
  padding-bottom: 5px;
}

/* --- 状态提示 (无变化) --- */
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
}
.error {
  color: #dc3545;
  font-weight: bold;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: 10px;
  border-radius: 4px;
}

/* --- [新] 进度列表样式 --- */
.progress-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.progress-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 8px;
  border-bottom: 1px solid #f0f0f0;
}
.progress-item:last-child {
  border-bottom: none;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
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
/* 可以根据 status 添加特定颜色 */
.status.in_progress {
  color: #007bff;
}

.item-progress {
  flex: 1;
  display: flex;
  align-items: center;
  margin-left: 20px;
}

.progress-bar-container {
  flex: 1;
  height: 10px;
  background-color: #e9ecef;
  border-radius: 5px;
  overflow: hidden; /* 确保子元素圆角 */
}

.progress-bar {
  height: 100%;
  background-color: #007bff;
  transition: width 0.3s ease;
}

.percentage {
  width: 50px; /* 固定宽度，使其对齐 */
  text-align: right;
  font-weight: bold;
  color: #333;
  margin-left: 10px;
}
</style>