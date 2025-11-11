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
    
    <!-- 结果显示模式 -->
    <div v-else-if="showResult" class="result-mode">
      <div class="result-card">
        <div class="result-header">
          <h1>🎉 测验完成！</h1>
        </div>
        
        <div class="result-summary">
          <div class="score-circle" :class="scoreClass">
            <span class="score-text">{{ calculatedScore }}</span>
            <span class="score-total">/{{ totalScore }}</span>
          </div>
          <p class="score-desc">{{ resultDesc }}</p>
        </div>

        <div class="result-details">
          <div class="detail-item">
            <span class="label">正确题数:</span>
            <span class="value">{{ correctCount }} / {{ questions.length }}</span>
          </div>
          <div class="detail-item">
            <span class="label">用时:</span>
            <span class="value">{{ formatTime(timeSpent) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">正确率:</span>
            <span class="value">{{ accuracy }}%</span>
          </div>
        </div>

        <div class="result-actions">
          <button @click="goBack" class="btn-return">返回测验列表</button>
        </div>
      </div>
    </div>
    
    <!-- 答题模式 -->
    <div v-else class="quiz-mode">
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
            <span class="question-difficulty">难度: {{ '★'.repeat(currentQuestion.difficulty) }}</span>
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
                :name="'question-' + currentQuestion.id + '-' + option.key"
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
                rows="12"
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getQuestions, submitAnswers as submitAnswersAPI } from '@/api/testBank';
import type { Question, QuestionSet, SubmitAnswerRequest } from '@/api/testBank';
import { UserInfo } from '@/api/user';

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

// 新增：结果显示状态
const showResult = ref(false);
const calculatedScore = ref(0);
const correctCount = ref(0);

// 计时相关
const timeSpent = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

// 分页
const currentPage = ref(1);

// 计算属性
const currentQuestion = computed(() => {
  return questions.value[currentPage.value - 1] || null;
});

const totalScore = computed(() => {
  return questions.value.reduce((sum, q) => sum + q.score, 0);
});

// 计算得分和正确率
const calculateScore = (): void => {
  let score = 0;
  let correct = 0;
  
  questions.value.forEach(question => {
    const userAnswer = userAnswers.value[question.id];
    const correctAnswer = question.correct_answer || question.correct_answers;
    
    if (!userAnswer || !correctAnswer) return;
    
    let isCorrect = false;
    
    switch (question.type) {
      case 'single_choice':
      case 'fill_in_blank':
      case 'programming':
        // 字符串答案：去除空格后比较（忽略大小写）
        isCorrect = String(userAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
        break;
        
      case 'multiple_choice':
        // 数组答案：排序后比较
        const userAns = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
        const correctAns = Array.isArray(correctAnswer) ? [...correctAnswer].sort() : [];
        isCorrect = JSON.stringify(userAns) === JSON.stringify(correctAns);
        break;
    }
    
    if (isCorrect) {
      score += question.score;
      correct++;
    }
  });
  
  calculatedScore.value = score;
  correctCount.value = correct;
};

const accuracy = computed(() => {
  return questions.value.length > 0 
    ? Math.round((correctCount.value / questions.value.length) * 100) 
    : 0;
});

const resultDesc = computed(() => {
  const percentage = totalScore.value > 0 ? (calculatedScore.value / totalScore.value) * 100 : 0;
  if (percentage >= 90) return '太棒了！优秀！';
  if (percentage >= 70) return '不错！继续加油！';
  if (percentage >= 60) return '及格了，还有进步空间！';
  return '需要多多努力哦！';
});

const scoreClass = computed(() => {
  const percentage = totalScore.value > 0 ? (calculatedScore.value / totalScore.value) * 100 : 0;
  if (percentage >= 90) return 'excellent';
  if (percentage >= 70) return 'good';
  if (percentage >= 60) return 'pass';
  return 'fail';
});

// 加载题目
const loadQuestions = async () => {
  if (!resourceId) {
    error.value = '资源ID不存在或格式错误';
    return;
  }

  loading.value = true;
  error.value = '';
  
  try {
    const data = await getQuestions(resourceId);
    questions.value = data.questions;
    questionSetId.value = data.id;
    
    // 初始化用户答案
    questions.value.forEach(q => {
      if (q.type === 'multiple_choice') {
        userAnswers.value[q.id] = [];
      } else {
        userAnswers.value[q.id] = '';
      }
    });
    
    startTimer();
  } catch (err: any) {
    console.error('加载题目失败:', err);
    error.value = err.message || '加载题目失败，请稍后重试';
  } finally {
    loading.value = false;
  }
};

// 计时器
const startTimer = () => {
  timer = setInterval(() => {
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const nextPage = () => {
  if (currentPage.value < questions.value.length) {
    currentPage.value++;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// 从localStorage获取用户信息
const getUserInfoFromStorage = (): UserInfo | null => {
    try {
        const userInfoStr = localStorage.getItem('user_info')
        if (userInfoStr) {
            return JSON.parse(userInfoStr) as UserInfo
        }
    } catch (error) {
        console.error('解析用户信息失败:', error)
    }
    return null
}

// 提交答案
const submitAnswers = async () => {
  if (isSubmitting.value || questions.value.length === 0) return;
  
  const confirmed = confirm('确定要提交答案吗？提交后将无法修改。');
  if (!confirmed) return;

  isSubmitting.value = true;
  stopTimer();
  
  try {
    const userInfo = getUserInfoFromStorage();
    // 准备提交数据
    const studentInfo = {
      student_id: userInfo.username|| 'student_001',
      student_name: userInfo.name || '测试学生'
    };

    const submitData: SubmitAnswerRequest = {
      ...studentInfo,
      question_set_id: questionSetId.value,
      answers: userAnswers.value,
      time_spent: timeSpent.value
    };
    
    console.log('提交的数据:', submitData);
    
    // 调用后端（即使失败也继续）
    const result = await submitAnswersAPI(submitData).catch(err => {
      console.warn('后端提交失败，使用前端计算:', err);
      return null;
    });
    
    console.log('后端返回:', result);
    
    // ✅ 前端计算分数（无论后端是否成功）
    calculateScore();
    
    // ✅ 切换到结果显示
    showResult.value = true;
    
  } catch (err: any) {
    console.error('提交失败:', err);
    alert(`提交失败: ${err.message}，将仅显示本地计算结果。`);
    
    // 即使出错也显示结果
    calculateScore();
    showResult.value = true;
  } finally {
    isSubmitting.value = false;
  }
};

// 工具函数
const getQuestionTypeText = (type: string): string => {
  const typeMap: Record<string, string> = {
    'single_choice': '单选题',
    'multiple_choice': '多选题',
    'fill_in_blank': '填空题',
    'programming': '编程题'
  };
  return typeMap[type] || type;
};

const formatContent = (content: string): string => {
  if (!content) return '';
  return content.replace(/\n/g, '<br>');
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 新增：返回列表
const goBack = () => {
  router.push({
    name: 'set_test'
  });
};

const viewReview = () => {
  alert('解析功能开发中...');
};

// 生命周期钩子
onMounted(() => {
  loadQuestions();

  window.addEventListener('beforeunload', (e) => {
    if (questions.value.length > 0 && !isSubmitting.value && !showResult.value) {
      e.preventDefault();
      e.returnValue = '您有未提交的答案，确定要离开吗？';
    }
  });
});

onUnmounted(() => {
  stopTimer();
});

watch(() => route.params.resourceId, (newId) => {
  if (newId && newId !== resourceId) {
    stopTimer();
    showResult.value = false;  // 重置结果状态
    loadQuestions();
  }
});
</script>

<style scoped>
/* ==================== 全局容器样式 ==================== */
.quiz-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* ==================== 加载和错误状态 ==================== */
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

/* ==================== 结果显示模式 ==================== */
.result-mode {
  padding: 20px;
}

.result-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 40px;
  text-align: center;
}

.result-header h1 {
  color: #2c3e50;
  margin-bottom: 30px;
}

.result-summary {
  margin-bottom: 40px;
}

.score-circle {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.score-circle.excellent {
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
}

.score-circle.good {
  background: linear-gradient(135deg, #1890ff 0%, #69c0ff 100%);
}

.score-circle.pass {
  background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%);
}

.score-circle.fail {
  background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
}

.score-text {
  font-size: 56px;
  font-weight: bold;
}

.score-total {
  font-size: 28px;
  margin-left: 5px;
}

.score-desc {
  color: #7f8c8d;
  font-size: 20px;
  font-weight: 500;
}

.result-details {
  margin-bottom: 40px;
  text-align: left;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.detail-item:last-child {
  border-bottom: none;
}

.label {
  color: #666;
  font-size: 16px;
}

.value {
  font-weight: 600;
  color: #333;
  font-size: 16px;
}

.result-actions {
  margin-top: 30px;
  display: flex;
  gap: 15px;
  justify-content: center;
}

.btn-return {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-return:hover {
  background-color: #2980b9;
}

.btn-review {
  background-color: #52c41a;
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-review:hover {
  background-color: #73d13d;
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

.fill-blank-container {
  margin-top: 20px;
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

.code-field {
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