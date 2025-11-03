<template>
  <div class="quiz-container">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>正在加载题目...</p>
    </div>
    
    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <p class="error-message">{{ error }}</p>
      <button @click="loadQuestions" class="retry-btn">重试</button>
    </div>
    
    <!-- 测验内容 -->
    <div v-else class="quiz-content">
      <div class="quiz-header">
        <h1>{{ quizTitle }}</h1>
        <div class="quiz-info">
          <div class="info-item">
            <span class="info-label">题目数量:</span>
            <span class="info-value">{{ questions.length }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">总分:</span>
            <span class="info-value">{{ totalScore }} 分</span>
          </div>
          <div class="info-item">
            <span class="info-label">已用时间:</span>
            <span class="info-value">{{ formatTime(timeSpent) }}</span>
          </div>
        </div>
      </div>

      <div class="pagination" v-if="questions.length > 0">
        <button 
          @click="prevPage" 
          :disabled="currentPage === 1"
          class="page-btn"
        >
          上一题
        </button>
        <span class="page-info">第 {{ currentPage }} 题 / 共 {{ questions.length }} 题</span>
        <button 
          @click="nextPage" 
          :disabled="currentPage === questions.length"
          class="page-btn"
        >
          下一题
        </button>
      </div>

      <div class="questions-container" v-if="currentQuestion">
        <div class="question-card">
          <div class="question-header">
            <span class="question-number">题目 {{ currentPage }}</span>
            <span class="question-type">{{ getQuestionTypeText(currentQuestion.type) }}</span>
            <span class="question-difficulty">难度: {{ currentQuestion.difficulty }}</span>
            <span class="question-score">分值: {{ currentQuestion.score }} 分</span>
          </div>
          
          <div class="question-content" v-html="formatContent(currentQuestion.content)"></div>
          
          <!-- 单选题 -->
          <div v-if="currentQuestion.type === 'single_choice'" class="options-container">
            <div 
              v-for="option in currentQuestion.options" 
              :key="option.key"
              class="option-item"
            >
              <input 
                type="radio"
                :name="'question-' + currentQuestion.id"
                :value="option.key"
                v-model="userAnswers[currentQuestion.id]"
                :id="'option-' + currentQuestion.id + '-' + option.key"
                class="option-input"
              />
              <label 
                :for="'option-' + currentQuestion.id + '-' + option.key"
                class="option-label"
              >
                <span class="option-key">{{ option.key }}.</span>
                <span v-html="formatContent(option.content)"></span>
              </label>
            </div>
          </div>
          
          <!-- 多选题 -->
          <div v-else-if="currentQuestion.type === 'multiple_choice'" class="options-container">
            <div 
              v-for="option in currentQuestion.options" 
              :key="option.key"
              class="option-item"
            >
              <input 
                type="checkbox"
                :name="'question-' + currentQuestion.id"
                :value="option.key"
                v-model="userAnswers[currentQuestion.id]"
                :id="'option-' + currentQuestion.id + '-' + option.key"
                class="option-input"
              />
              <label 
                :for="'option-' + currentQuestion.id + '-' + option.key"
                class="option-label"
              >
                <span class="option-key">{{ option.key }}.</span>
                <span v-html="formatContent(option.content)"></span>
              </label>
            </div>
          </div>
          
          <!-- 填空题 -->
          <div v-else-if="currentQuestion.type === 'fill_in_blank'" class="fill-blank-container">
            <div class="blank-input">
              <label>请输入答案:</label>
              <input 
                type="text" 
                v-model="userAnswers[currentQuestion.id]"
                placeholder="在此输入答案"
                class="blank-field"
              />
            </div>
            <div v-if="currentQuestion.options && currentQuestion.options.length > 0" class="hint">
              <p>提示选项:</p>
              <div class="hint-options">
                <span 
                  v-for="option in currentQuestion.options" 
                  :key="option.key"
                  class="hint-option"
                  @click="userAnswers[currentQuestion.id] = option.key"
                >
                  {{ option.key }}. {{ option.content }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- 编程题 -->
          <div v-else-if="currentQuestion.type === 'programming'" class="programming-container">
            <div class="code-template" v-if="currentQuestion.template_code">
              <h4>代码模板:</h4>
              <pre><code>{{ currentQuestion.template_code }}</code></pre>
            </div>
            <div class="code-editor">
              <textarea 
                v-model="userAnswers[currentQuestion.id]"
                placeholder="在此编写你的代码..."
                class="code-field"
                rows="10"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <div class="submit-container">
        <button 
          @click="submitAnswers" 
          class="submit-btn"
          :disabled="isSubmitting || questions.length === 0"
        >
          {{ isSubmitting ? '提交中...' : '提交答案' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

// 配置axios实例
const api = axios.create({
  baseURL: 'http://patrickshao.site:8000',
  timeout: 10000,
});

// 定义接口类型
interface Option {
  key: string;
  content: string;
}

interface Question {
  id: string;
  content: string;
  explanation: string;
  difficulty: number;
  concept: string;
  score: number;
  type: 'single_choice' | 'multiple_choice' | 'fill_in_blank' | 'programming';
  options: Option[];
  correct_answer?: string;
  correct_answers?: string[];
  template_code?: string;
  test_cases?: any[];
}

interface QuestionSet {
  id: string;
  resource_id: string;
  questions: Question[];
  created_time: string;
  updated_time: string;
}

interface SubmitAnswerRequest {
  student_id: string;
  student_name: string;
  question_set_id: string;
  answers: { [key: string]: string | string[] };
  time_spent: number;
}

interface SubmitAnswerResponse {
  id: string;
  student_id: string;
  student_name: string;
  question_set_id: string;
  answers: { [key: string]: any };
  scores: { [key: string]: number };
  submit_time: string;
  total_score: number;
  time_spent: number;
}

// 路由信息
const route = useRoute();
const router = useRouter();
const resourceId = route.params.resourceId as string;
const quizTitle = ref(route.query.title as string || '测验');

// 响应式数据
const questions = ref<Question[]>([]);
const questionSetId = ref('');
const userAnswers = ref<{ [key: string]: string | string[] }>({});
const loading = ref(false);
const error = ref('');
const isSubmitting = ref(false);

// 计时相关
const timeSpent = ref(0); // 秒
let timer: number | null = null;

// 分页
const currentPage = ref(1);

// 计算属性
const currentQuestion = computed(() => {
  return questions.value[currentPage.value - 1] || null;
});

const totalScore = computed(() => {
  return questions.value.reduce((sum, q) => sum + q.score, 0);
});

// 加载题目
const loadQuestions = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    const response = await api.get<QuestionSet>(`/api/question_bank/questions/${resourceId}`);
    questions.value = response.data.questions;
    questionSetId.value = response.data.id;
    
    // 初始化用户答案
    questions.value.forEach(q => {
      if (q.type === 'multiple_choice') {
        userAnswers.value[q.id] = [];
      } else {
        userAnswers.value[q.id] = '';
      }
    });
    
    // 开始计时
    startTimer();
  } catch (err: any) {
    console.error('加载题目失败:', err);
    error.value = err.response?.data?.detail?.[0]?.msg || '加载题目失败，请稍后重试';
  } finally {
    loading.value = false;
  }
};

// 计时器
const startTimer = () => {
  timer = window.setInterval(() => {
    timeSpent.value++;
  }, 1000);
};

const stopTimer = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};

// 分页导航
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const nextPage = () => {
  if (currentPage.value < questions.value.length) {
    currentPage.value++;
  }
};

// 提交答案
const submitAnswers = async () => {
  if (isSubmitting.value) return;
  
  isSubmitting.value = true;
  stopTimer();
  
  try {
    const submitData: SubmitAnswerRequest = {
      student_id: 'student_001', // 实际应用中应从用户信息获取
      student_name: '测试学生',  // 实际应用中应从用户信息获取
      question_set_id: questionSetId.value,
      answers: userAnswers.value,
      time_spent: timeSpent.value
    };
    
    const response = await api.post<SubmitAnswerResponse>('/api/question_bank/answers/grade-submit', submitData);
    
    // 跳转到结果页面或显示结果
    router.push({
      name: 'quiz-result',
      query: {
        result: JSON.stringify(response.data)
      }
    });
    
  } catch (err: any) {
    console.error('提交答案失败:', err);
    alert('提交失败: ' + (err.response?.data?.detail?.[0]?.msg || '网络错误'));
  } finally {
    isSubmitting.value = false;
  }
};

// 工具函数
const getQuestionTypeText = (type: string): string => {
  const typeMap: { [key: string]: string } = {
    'single_choice': '单选题',
    'multiple_choice': '多选题',
    'fill_in_blank': '填空题',
    'programming': '编程题'
  };
  return typeMap[type] || type;
};

const formatContent = (content: string): string => {
  // 简单的格式化，可以扩展为更复杂的Markdown或HTML解析
  return content.replace(/\n/g, '<br>');
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 组件挂载时加载题目
onMounted(() => {
  if (!resourceId) {
    error.value = '资源ID不存在';
    return;
  }
  loadQuestions();
});

// 组件卸载时清除计时器
watch(() => route.params.resourceId, (newId) => {
  if (newId && newId !== resourceId) {
    stopTimer();
    loadQuestions();
  }
});
</script>

<style scoped>
.quiz-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 加载状态 */
.loading-container, .error-container {
  text-align: center;
  padding: 40px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  color: #e74c3c;
  margin-bottom: 20px;
  font-size: 16px;
}

.retry-btn {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.retry-btn:hover {
  background-color: #2980b9;
}

/* 测验内容 */
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
  min-width: 150px;
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
  padding: 25px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
  flex-wrap: wrap;
  gap: 10px;
}

.question-number {
  font-weight: 600;
  color: #2c3e50;
  font-size: 18px;
}

.question-type, .question-difficulty, .question-score {
  background-color: #e8f5e9;
  color: #388e3c;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 14px;
}

.question-content {
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 20px;
  color: #333;
}

/* 选项样式 */
.options-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-item {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  border-radius: 6px;
  background-color: #f5f7fa;
  transition: background-color 0.2s;
}

.option-item:hover {
  background-color: #ebf5ff;
}

.option-input {
  margin-right: 12px;
  margin-top: 3px;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.option-label {
  display: flex;
  align-items: flex-start;
  cursor: pointer;
  font-size: 15px;
  color: #333;
  flex-grow: 1;
  line-height: 1.5;
}

.option-key {
  font-weight: bold;
  margin-right: 8px;
  color: #1976d2;
  min-width: 20px;
}

/* 填空题样式 */
.fill-blank-container {
  margin-top: 20px;
}

.blank-input {
  margin-bottom: 15px;
}

.blank-input label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.blank-field {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 15px;
}

.hint {
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 6px;
  border-left: 4px solid #3498db;
}

.hint p {
  font-weight: 600;
  margin-bottom: 10px;
  color: #2c3e50;
}

.hint-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hint-option {
  background-color: #e3f2fd;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.hint-option:hover {
  background-color: #bbdefb;
}

/* 编程题样式 */
.programming-container {
  margin-top: 20px;
}

.code-template {
  margin-bottom: 20px;
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 6px;
}

.code-template h4 {
  margin-bottom: 10px;
  color: #333;
}

.code-template pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: 'Courier New', monospace;
}

.code-editor textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  resize: vertical;
}

.submit-container {
  display: flex;
  justify-content: center;
  margin-top: 30px;
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