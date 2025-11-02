<template>
  <div class="quiz-container">
    <div class="quiz-header">
      <h1>{{ quizTitle }}</h1>
      <div class="quiz-info">
        <div class="info-item">
          <span class="info-label">截止时间:</span>
          <span class="info-value">{{ deadline }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">当前分数:</span>
          <span class="info-value">{{ currentScore }} / {{ totalScore }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">提交次数:</span>
          <span class="info-value">{{ submissions }} / {{ maxSubmissions }}</span>
        </div>
      </div>
    </div>

    <div class="pagination">
      <button 
        @click="prevPage" 
        :disabled="currentPage === 1"
        class="page-btn"
      >
        上一页
      </button>
      <span class="page-info">第 {{ currentPage }} 页 / 共 {{ totalPages }} 页</span>
      <button 
        @click="nextPage" 
        :disabled="currentPage === totalPages"
        class="page-btn"
      >
        下一页
      </button>
    </div>

    <div class="questions-container">
      <div 
        v-for="(question, index) in currentPageQuestions" 
        :key="question.id" 
        class="question-card"
      >
        <div class="question-header">
          <span class="question-number">题目 {{ (currentPage - 1) * 10 + index + 1 }}</span>
          <span class="question-type">{{ question.type === 'single' ? '单选题' : '多选题' }}</span>
        </div>
        
        <div class="question-content">
          {{ question.content }}
        </div>
        
        <div class="options-container">
          <div 
            v-for="(option, optIndex) in question.options" 
            :key="optIndex"
            class="option-item"
          >
            <input 
              :type="question.type === 'single' ? 'radio' : 'checkbox'"
              :name="'question-' + question.id"
              :value="optIndex"
              v-model="userAnswers[question.id]"
              :id="'option-' + question.id + '-' + optIndex"
              class="option-input"
            />
            <label 
              :for="'option-' + question.id + '-' + optIndex"
              class="option-label"
            >
              <span class="option-letter">{{ String.fromCharCode(65 + optIndex) }}.</span>
              {{ option }}
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="submit-container">
      <button 
        @click="submitAnswers" 
        class="submit-btn"
        :disabled="isSubmitting"
      >
        {{ isSubmitting ? '提交中...' : '提交答案' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

// 模拟从后端获取的题目数据
const questions = ref([
  {
    id: 1,
    type: 'single',
    content: '以下哪个不是JavaScript的数据类型？',
    options: ['Number', 'String', 'Boolean', 'Array', 'Function']
  },
  {
    id: 2,
    type: 'multiple',
    content: '以下哪些是Vue3的新特性？',
    options: ['Composition API', 'Options API', 'Teleport', 'Fragments', 'Suspense']
  },
  {
    id: 3,
    type: 'single',
    content: 'CSS中，哪个属性用于设置元素的外边距？',
    options: ['padding', 'margin', 'border', 'outline']
  },
  {
    id: 4,
    type: 'multiple',
    content: '以下哪些是HTTP请求方法？',
    options: ['GET', 'POST', 'PUT', 'DELETE', 'UPDATE']
  },
  {
    id: 5,
    type: 'single',
    content: '在Vue中，哪个指令用于条件渲染？',
    options: ['v-for', 'v-if', 'v-bind', 'v-model']
  },
  {
    id: 6,
    type: 'single',
    content: '以下哪个不是前端框架？',
    options: ['React', 'Vue', 'Angular', 'Django', 'Svelte']
  },
  {
    id: 7,
    type: 'multiple',
    content: '以下哪些是CSS预处理器？',
    options: ['Sass', 'Less', 'Stylus', 'PostCSS', 'Tailwind']
  },
  {
    id: 8,
    type: 'single',
    content: 'JavaScript中，哪个方法用于向数组末尾添加元素？',
    options: ['push()', 'pop()', 'shift()', 'unshift()']
  },
  {
    id: 9,
    type: 'multiple',
    content: '以下哪些是响应式设计的关键技术？',
    options: ['媒体查询', 'Flexbox', 'Grid布局', '固定宽度', '浮动布局']
  },
  {
    id: 10,
    type: 'single',
    content: '在Vue中，哪个生命周期钩子在组件创建前被调用？',
    options: ['created', 'mounted', 'beforeCreate', 'beforeMount']
  },
  {
    id: 11,
    type: 'single',
    content: '以下哪个不是关系型数据库？',
    options: ['MySQL', 'PostgreSQL', 'MongoDB', 'SQLite']
  },
  {
    id: 12,
    type: 'multiple',
    content: '以下哪些是前端性能优化的方法？',
    options: ['代码压缩', '图片懒加载', '减少HTTP请求', '使用内联样式', '增加DOM操作']
  },
  {
    id: 13,
    type: 'single',
    content: 'CSS中，哪个属性用于设置文本居中？',
    options: ['text-align: center', 'align: center', 'position: center', 'display: center']
  },
  {
    id: 14,
    type: 'multiple',
    content: '以下哪些是JavaScript的异步处理方式？',
    options: ['回调函数', 'Promise', 'async/await', 'Generator', 'for循环']
  },
  {
    id: 15,
    type: 'single',
    content: '在Vue中，哪个指令用于双向数据绑定？',
    options: ['v-model', 'v-bind', 'v-on', 'v-text']
  },
  {
    id: 16,
    type: 'multiple',
    content: '以下哪些是常见的跨域解决方案？',
    options: ['JSONP', 'CORS', 'WebSocket', 'iframe', '反向代理']
  },
  {
    id: 17,
    type: 'single',
    content: '以下哪个不是Git命令？',
    options: ['git init', 'git commit', 'git push', 'git build', 'git pull']
  },
  {
    id: 18,
    type: 'multiple',
    content: '以下哪些是TypeScript的特性？',
    options: ['静态类型检查', '接口', '泛型', '装饰器', '动态类型']
  },
  {
    id: 19,
    type: 'single',
    content: '在CSS中，哪个属性用于设置元素的透明度？',
    options: ['opacity', 'transparency', 'visibility', 'display']
  },
  {
    id: 20,
    type: 'multiple',
    content: '以下哪些是前端安全风险？',
    options: ['XSS攻击', 'CSRF攻击', 'SQL注入', '点击劫持', 'DNS污染']
  }
]);

// 用户答案存储
const userAnswers = ref({});

// 页面状态
const currentPage = ref(1);
const questionsPerPage = 10;
const isSubmitting = ref(false);

// 测验信息
const quizTitle = ref('前端开发知识测验');
const deadline = ref('2025-12-31 23:59');
const currentScore = ref(0);
const totalScore = ref(100);
const submissions = ref(0);
const maxSubmissions = ref(3);

// 计算属性
const totalPages = computed(() => Math.ceil(questions.value.length / questionsPerPage));
const currentPageQuestions = computed(() => {
  const start = (currentPage.value - 1) * questionsPerPage;
  const end = start + questionsPerPage;
  return questions.value.slice(start, end);
});

// 方法
function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
}

function submitAnswers() {
  isSubmitting.value = true;
  
  // 模拟提交到后端
  setTimeout(() => {
    console.log('提交的答案:', userAnswers.value);
    isSubmitting.value = false;
    submissions.value++;
    alert('答案提交成功！');
  }, 1500);
}

// 初始化用户答案
onMounted(() => {
  questions.value.forEach(q => {
    userAnswers.value[q.id] = q.type === 'single' ? null : [];
  });
});
</script>

<style scoped>
.quiz-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.quiz-header {
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.quiz-header h1 {
  font-size: 24px;
  color: #2c3e50;
  margin-bottom: 15px;
}

.quiz-info {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 15px;
}

.info-item {
  background-color: #e3f2fd;
  padding: 10px 15px;
  border-radius: 6px;
  flex: 1;
  min-width: 180px;
}

.info-label {
  font-weight: 600;
  color: #1976d2;
  display: block;
  margin-bottom: 5px;
}

.info-value {
  font-size: 16px;
  color: #333;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0;
  padding: 10px 0;
  border-top: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
}

.page-btn {
  padding: 8px 16px;
  background-color: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.page-btn:disabled {
  background-color: #90caf9;
  cursor: not-allowed;
}

.page-btn:not(:disabled):hover {
  background-color: #1565c0;
}

.page-info {
  font-size: 16px;
  color: #555;
}

.questions-container {
  margin-bottom: 30px;
}

.question-card {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.question-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.question-number {
  font-weight: 600;
  color: #2c3e50;
}

.question-type {
  background-color: #e8f5e9;
  color: #388e3c;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 14px;
}

.question-content {
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 15px;
  color: #333;
}

.options-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 6px;
  background-color: #f5f7fa;
  transition: background-color 0.2s;
}

.option-item:hover {
  background-color: #ebf5ff;
}

.option-input {
  margin-right: 12px;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.option-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 15px;
  color: #333;
  flex-grow: 1;
}

.option-letter {
  font-weight: bold;
  margin-right: 8px;
  color: #1976d2;
}

.submit-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.submit-btn {
  padding: 12px 40px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.submit-btn:hover:not(:disabled) {
  background-color: #388e3c;
}

.submit-btn:disabled {
  background-color: #a5d6a7;
  cursor: not-allowed;
}
</style>
