<template>
  <div class="setup-container">
    <h1>测试设置</h1>
    
    <el-form :model="setupForm" label-width="120px">
      <!-- 知识点选择 -->
      <el-form-item label="测试知识点">
        <el-select 
          v-model="setupForm.topics" 
          multiple 
          placeholder="请选择知识点"
          style="width: 100%"
        >
          <el-option 
            v-for="topic in availableTopics" 
            :key="topic" 
            :label="topic" 
            :value="topic"
          />
        </el-select>
      </el-form-item>
      
      <!-- 题目数量选择 -->
      <el-form-item label="题目数量">
        <el-slider 
          v-model="setupForm.questionCount" 
          :min="1" 
          :max="20" 
          show-input 
        />
      </el-form-item>
      
      <!-- 开始测试按钮 -->
      <el-form-item>
        <el-button 
          type="primary" 
          @click="startTest"
          :disabled="setupForm.topics.length === 0"
        >
          开始测试
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 可用知识点列表
const availableTopics = ref([
  'Vue基础', '组件通信', 'Vue Router', 'Vuex状态管理', 
  'Composition API', '响应式原理', '性能优化', '测试'
])

// 设置表单数据
const setupForm = reactive({
  topics: [],
  questionCount: 10
})

// 开始测试
const startTest = () => {
  router.push({
    name:'test',
    query: {
      count: setupForm.questionCount
    }
  })
}
</script>

<style scoped>
.setup-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #409EFF;
}
</style>
