<template>
  <div class="test-page">
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="5" animated />
    </div>
    
    <div v-else>
      <div class="test-header">
        <h2>测试题目</h2>
        <div class="progress">进度: {{ currentQuestionIndex + 1 }}/{{ questions.length }}</div>
      </div>
      
      <div class="question-container">
        <div class="question-content">
          <h3>{{ currentQuestion.title }}</h3>
          
          <!-- 选择题 -->
          <div v-if="currentQuestion.type === 'choice'">
            <el-radio-group v-model="answers[currentQuestionIndex]">
              <el-radio 
                v-for="(option, index) in currentQuestion.options" 
                :key="index" 
                :label="index"
              >
                {{ option }}
              </el-radio>
            </el-radio-group>
          </div>
          
          <!-- 简答题 -->
          <div v-else-if="currentQuestion.type === 'essay'">
            <el-input 
              v-model="answers[currentQuestionIndex]" 
              type="textarea" 
              :rows="4" 
              placeholder="请输入您的答案"
            />
          </div>
        </div>
        
        <div class="navigation-buttons">
          <el-button 
            :disabled="currentQuestionIndex === 0" 
            @click="prevQuestion"
          >
            上一题
          </el-button>
          
          <el-button 
            v-if="currentQuestionIndex < questions.length - 1"
            type="primary" 
            @click="nextQuestion"
          >
            下一题
          </el-button>
          
          <el-button 
            v-else
            type="success" 
            @click="submitTest"
          >
            提交测试
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

const props = defineProps({
  topics: Array,
  questionCount: Number
})

const emit = defineEmits(['test-completed'])

// 状态管理
const loading = ref(true)
const questions = ref([])
const answers = ref([])
const currentQuestionIndex = ref(0)

// 当前问题
const currentQuestion = computed(() => {
  return questions.value[currentQuestionIndex.value] || {}
})

// 模拟获取题目
const fetchQuestions = () => {
  return new Promise(resolve => {
    setTimeout(() => {
      // 模拟数据 - 实际应用中应从API获取
      const mockQuestions = [
        {
          id: 1,
          title: 'Vue 中如何实现响应式数据？',
          type: 'choice',
          options: [
            '使用 Object.defineProperty',
            '使用 Proxy',
            '使用 getter/setter',
            '使用 defineReactive'
          ]
        },
        {
          id: 2,
          title: '请简述 Vue 的生命周期',
          type: 'essay'
        },
        {
          id: 3,
          title: 'Vue Router 的导航守卫有哪些？',
          type: 'choice',
          options: [
            '全局前置守卫',
            '路由独享守卫',
            '组件内守卫',
            '以上都是'
          ]
        }
      ]
      
      // 根据题目数量截取
      resolve(mockQuestions.slice(0, props.questionCount))
    }, 1000)
  })
}

// 初始化测试
onMounted(async () => {
  questions.value = await fetchQuestions()
  // 初始化答案数组
  answers.value = new Array(questions.value.length).fill('')
  loading.value = false
})

// 上一题
const prevQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--
  }
}

// 下一题
const nextQuestion = () => {
  if (currentQuestionIndex.value < questions.value.length - 1) {
    currentQuestionIndex.value++
  }
}

// 提交测试
const submitTest = () => {
  // 这里可以处理答案提交逻辑
  console.log('提交的答案：', answers.value)
  
  // 模拟提交过程
  setTimeout(() => {
    emit('test-completed')
  }, 1000)
}
</script>

<style scoped>
.test-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.test-header h2 {
  margin: 0;
  color: #409EFF;
}

.progress {
  font-size: 16px;
  font-weight: bold;
}

.question-container {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.question-content {
  margin-bottom: 20px;
}

.navigation-buttons {
  display: flex;
  justify-content: space-between;
}

.loading-container {
  padding: 40px 0;
}
</style>