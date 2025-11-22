<template>
  <div class="qb-page">
    <!-- 顶部栏 -->
    <el-row class="top-bar">
      <el-button type="primary" @click="addQuestion">新增题目</el-button>
    </el-row>

    <!-- 主体布局 -->
    <div class="main-layout">
      <!-- 侧边栏 - 资源列表 -->
      <div class="sidebar">
        <div class="pane">
          <div class="pane-title">资源列表</div>
          <div class="resource-list">
            <div 
              v-for="resource in resourceList" 
              :key="resource.id"
              class="resource-item"
              :class="{ active: selectedResourceId === resource.id }"
              @click="selectResource(resource.id)"
            >
              <div class="resource-name">
                {{ resource.metadata.title || `资源 ${resource.id.slice(0, 8)}` }}
              </div>
              <div class="resource-type">{{ resource.resource_type }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 主内容区 -->
      <div class="content">
        <!-- 题目集列表 -->
        <div v-if="selectedResourceId && questionSets.length > 0" class="question-set-section">
          <div class="pane">
            <div class="pane-title">题目集</div>
            <div class="question-set-list">
              <div 
                v-for="set in questionSets" 
                :key="set.id"
                class="question-set-item"
                :class="{ active: selectedQuestionSetId === set.id }"
                @click="selectQuestionSet(set.id)"
              >
                <div class="set-name">题目集 {{ formatDate(set.created_time) }}</div>
                <div class="set-info">
                  <span>{{ set.questions?.length || 0 }} 道题目</span>
                  <el-button 
                    type="text" 
                    @click.stop="deleteQuestionSet(set.id)"
                    class="delete-btn"
                  >
                    删除
                  </el-button>
                </div>
              </div>
            </div>
            <el-button 
              type="primary" 
              @click="generateQuestions" 
              :loading="generating"
              style="margin-top: 16px;"
            >
              生成新题目集
            </el-button>
          </div>
        </div>

        <!-- 题目卡片列表 -->
        <div v-if="selectedQuestionSetId" class="question-cards-section">
          <div class="pane">
            <div class="pane-title">题目列表</div>
            <div v-if="currentQuestions.length === 0" class="empty-state">
              此题目集暂无题目
            </div>
            <div v-else class="question-cards">
              <div 
                v-for="question in currentQuestions" 
                :key="question.id"
                class="question-card"
              >
                <div class="card-header">
                  <el-tag :type="getQuestionTypeTag(question.type)" size="small">
                    {{ getQuestionTypeText(question.type) }}
                  </el-tag>
                  <div class="card-actions">
                    <el-button type="text" @click="editQuestion(question)">编辑</el-button>
                    <el-button type="text" @click="delQuestion(question)">删除</el-button>
                  </div>
                </div>
                <div class="card-content">
                  <div class="question-title">{{ question.content }}</div>
                  <div class="question-meta">
                    <div class="difficulty">
                      <span>难度：</span>
                      <el-rate :value="question.difficulty" disabled show-score />
                    </div>
                    <div class="knowledge">
                      <span>知识点：</span>
                      <el-tag v-if="question.concept" size="small">{{ question.concept }}</el-tag>
                      <span v-else class="no-knowledge">未设置</span>
                    </div>
                    <div class="score">
                      <span>分值：</span>
                      <span>{{ question.score }}分</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="!selectedResourceId" class="empty-resource">
          <div class="empty-content">
            <el-icon class="empty-icon"><Collection /></el-icon>
            <p>请从左侧选择一个资源</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增/编辑题目对话框 -->
    <el-dialog v-model="showEdit" :title="editId ? '编辑题目' : '新增题目'" width="600px">
      <el-form :model="qForm" label-width="80px" size="small">
        <el-form-item label="资源">
          <el-select v-model="qForm.resourceId" placeholder="选择资源" :disabled="!!editId">
            <el-option 
              v-for="resource in resourceList" 
              :key="resource.id" 
              :label="`${resource.metadata.title}.${resource.resource_type}`" 
              :value="resource.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="题型">
          <el-radio-group v-model="qForm.type">
            <el-radio label="single_choice">单选</el-radio>
            <el-radio label="multiple_choice">多选</el-radio>
            <el-radio label="programming">编程</el-radio>
            <el-radio label="fill_in_blank">填空</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="题干">
          <el-input v-model="qForm.content" type="textarea" :rows="3" />
        </el-form-item>
        
        <!-- 选项部分 -->
        <el-form-item v-if="qForm.type !== 'programming' && qForm.type !== 'fill_in_blank'" label="选项">
          <div v-for="(opt, idx) in qForm.options" :key="idx" class="opt-line">
            <el-input v-model="opt.key" placeholder="选项键" style="width: 80px;" />
            <el-input v-model="opt.content" placeholder="选项内容" />
            <el-checkbox 
              v-if="qForm.type === 'single_choice'" 
              v-model="opt.correct"
              @change="handleSingleChoiceCorrect(idx)"
            >
              正确
            </el-checkbox>
            <el-checkbox v-else v-model="opt.correct">正确</el-checkbox>
            <el-button text @click="removeOption(idx)">删除</el-button>
          </div>
          <el-button text @click="addOption">+ 添加选项</el-button>
        </el-form-item>

        <!-- 编程题模板代码 -->
        <el-form-item v-if="qForm.type === 'programming'" label="模板代码">
          <el-input v-model="qForm.template_code" type="textarea" :rows="4" />
        </el-form-item>

        <!-- 填空题正确答案 -->
        <el-form-item v-if="qForm.type === 'fill_in_blank'" label="正确答案">
          <div v-for="(answer, idx) in qForm.correct_answers" :key="idx" class="opt-line">
            <el-input v-model="qForm.correct_answers[idx]" placeholder="正确答案" />
            <el-button text @click="removeAnswer(idx)">删除</el-button>
          </div>
          <el-button text @click="addAnswer">+ 添加答案</el-button>
        </el-form-item>

        <el-form-item label="解析">
          <el-input v-model="qForm.explanation" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="难度">
          <el-rate v-model="qForm.difficulty" :max="5" show-score />
        </el-form-item>
        <el-form-item label="知识点">
          <el-input v-model="qForm.concept" placeholder="知识点" />
        </el-form-item>
        <el-form-item label="分值">
          <el-input-number v-model="qForm.score" :min="0" :step="0.5" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEdit = false">取消</el-button>
        <el-button type="primary" @click="saveQuestion">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Collection } from '@element-plus/icons-vue'
import axios from 'axios'

const BASE = 'http://patrickshao.site:8000'
const api = axios.create({ baseURL: BASE })

// ---------- 数据结构 ----------
interface Resource {
  filename: string,
  content_type: string,
  size: string,
  resource_type: string,
  metadata: {
    title: string,
    author: string| null,
    keywords: [],
    course: string| null,
    chapter: string| null,
  },
  id: string,
  upload_time: string,
  file_path: string,
  vector_id: string
}

interface Question {
  id: string
  content: string
  explanation: string
  difficulty: number
  concept: string
  score: number
  type: 'single_choice' | 'multiple_choice' | 'programming' | 'fill_in_blank'
  options?: { key: string; content: string; correct?: boolean }[]
  correct_answer?: string
  correct_answers?: string[]
  template_code?: string
  test_cases?: any[]
  resource_id?: string
  question_set_id?: string // 添加题目集ID字段
}

interface QuestionSet {
  id: string
  resource_id: string
  questions: Question[]
  created_time: string
  updated_time: string
}

// ---------- 响应式数据 ----------
const resourceList = ref<Resource[]>([])
const selectedResourceId = ref<string>('')
const questionSets = ref<QuestionSet[]>([])
const selectedQuestionSetId = ref<string>('')
const loading = ref(false)
const generating = ref(false)
const showEdit = ref(false)
const editId = ref<string | null>(null)

// ---------- 计算属性 ----------
const currentQuestions = computed(() => {
  if (!selectedQuestionSetId.value) return []
  const set = questionSets.value.find(s => s.id === selectedQuestionSetId.value)
  return set ? set.questions : []
})

// ---------- 生命周期 ----------
onMounted(async () => {
  await loadResources()
})

// ---------- 资源相关 ----------
async function loadResources() {
  try {
    const { data } = await api.get('/api/v1/resources')
    resourceList.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('获取资源列表失败:', err)
    ElMessage.error('加载资源失败')
  }
}

async function selectResource(resourceId: string) {
  selectedResourceId.value = resourceId
  selectedQuestionSetId.value = ''
  await loadQuestionSets(resourceId)
}

// ---------- 题目集相关 ----------
async function loadQuestionSets(resourceId: string) {
  loading.value = true
  try {
    const res = await api.get(`/api/question_bank/questions/${resourceId}/all`)
    questionSets.value = Array.isArray(res.data) ? res.data : []
    
    // 如果有题目集，默认选择第一个
    if (questionSets.value.length > 0) {
      selectedQuestionSetId.value = questionSets.value[0].id
    }
  } catch (e: any) {
    console.error('加载题目集失败:', e)
    ElMessage.error('加载题目集失败: ' + (e.message || '未知错误'))
    questionSets.value = []
  } finally {
    loading.value = false
  }
}

function selectQuestionSet(setId: string) {
  selectedQuestionSetId.value = setId
}

async function deleteQuestionSet(setId: string) {
  try {
    await ElMessageBox.confirm('确定删除这个题目集吗？', '提示', { type: 'warning' })
    // 调用删除题目集的API
    await api.delete(`/api/question_bank/questions/${selectedResourceId.value}/${setId}`)
    ElMessage.success('删除成功')
    await loadQuestionSets(selectedResourceId.value)
  } catch {
    // 用户取消删除
  }
}

// ---------- 生成题目 ----------
async function generateQuestions() {
  if (!selectedResourceId.value) {
    ElMessage.warning('请先选择资源')
    return
  }
  
  generating.value = true
  try {
    const { data } = await api.post(`/api/question_bank/questions/${selectedResourceId.value}/generate`)
    ElMessage.success(`成功生成 ${data.questions?.length || 0} 道题目`)
    await loadQuestionSets(selectedResourceId.value) // 重新加载题目集
  } catch (e: any) {
    console.error('生成题目失败:', e)
    ElMessage.error('生成题目失败: ' + (e.message || '未知错误'))
  } finally {
    generating.value = false
  }
}

// ---------- 题目相关 ----------
async function delQuestion(q: Question) {
  try {
    await ElMessageBox.confirm('确定删除这道题目吗？', '提示', { type: 'warning' })
    
    if (!selectedQuestionSetId.value) {
      ElMessage.error('无法删除：未选择题目集')
      return
    }
    
    // 使用题目集ID和题目ID删除题目
    await api.delete(`/api/question_bank/questions/${selectedQuestionSetId.value}/${q.id}`)
    ElMessage.success('删除成功')
    await loadQuestionSets(selectedResourceId.value)
  } catch {
    // 用户取消删除
  }
}

// ---------- 编辑题目 ----------
function editQuestion(q: Question) {
  editId.value = q.id
  Object.assign(qForm, {
    resourceId: q.resource_id || selectedResourceId.value,
    content: q.content,
    explanation: q.explanation,
    difficulty: q.difficulty,
    concept: q.concept,
    score: q.score,
    type: q.type,
    options: q.options ? [...q.options.map(opt => ({ 
      ...opt, 
      correct: q.type === 'single_choice' 
        ? opt.key === q.correct_answer 
        : (q.correct_answers || []).includes(opt.key)
    }))] : [],
    correct_answer: q.correct_answer,
    correct_answers: q.correct_answers ? [...q.correct_answers] : [],
    template_code: q.template_code || '',
    question_set_id: q.question_set_id || selectedQuestionSetId.value
  })
  showEdit.value = true
}

// ---------- 表单相关 ----------
const qForm = reactive({
  resourceId: '',
  content: '',
  explanation: '',
  difficulty: 2,
  concept: '',
  score: 1,
  type: 'single_choice' as 'single_choice' | 'multiple_choice' | 'programming' | 'fill_in_blank',
  options: [{ key: 'A', content: '', correct: false }],
  correct_answer: '',
  correct_answers: [''],
  template_code: '',
  question_set_id: '' // 添加题目集ID字段
})

function addOption() {
  const nextKey = String.fromCharCode(65 + qForm.options.length) // A, B, C...
  qForm.options.push({ key: nextKey, content: '', correct: false })
}

function removeOption(index: number) {
  if (qForm.options.length > 1) {
    qForm.options.splice(index, 1)
  }
}

function addAnswer() {
  qForm.correct_answers.push('')
}

function removeAnswer(index: number) {
  if (qForm.correct_answers.length > 1) {
    qForm.correct_answers.splice(index, 1)
  }
}

function handleSingleChoiceCorrect(selectedIndex: number) {
  // 单选题只能有一个正确答案
  qForm.options.forEach((opt, index) => {
    if (index !== selectedIndex) {
      opt.correct = false
    } else {
      qForm.correct_answer = opt.key
    }
  })
}

function resetForm() {
  Object.assign(qForm, {
    resourceId: selectedResourceId.value || (resourceList.value[0]?.id || ''),
    content: '',
    explanation: '',
    difficulty: 2,
    concept: '',
    score: 1,
    type: 'single_choice',
    options: [{ key: 'A', content: '', correct: false }],
    correct_answer: '',
    correct_answers: [''],
    template_code: '',
    question_set_id: selectedQuestionSetId.value
  })
  editId.value = null
}

function addQuestion() {
  if (!selectedQuestionSetId.value) {
    ElMessage.warning('请先选择一个题目集')
    return
  }
  resetForm()
  showEdit.value = true
}

// ---------- 保存题目 ----------
async function saveQuestion() {
  if (!qForm.resourceId) {
    ElMessage.warning('请选择资源')
    return
  }

  try {
    const requestData: any = {
      content: qForm.content,
      explanation: qForm.explanation,
      difficulty: qForm.difficulty,
      concept: qForm.concept,
      score: qForm.score,
      type: qForm.type,
      options: qForm.options
    }

    // 根据题型设置正确答案
    if (qForm.type === 'single_choice') {
      const correctOption = qForm.options.find(opt => opt.correct)
      requestData.correct_answer = correctOption?.key || ''
    } else if (qForm.type === 'multiple_choice') {
      requestData.correct_answers = qForm.options.filter(opt => opt.correct).map(opt => opt.key)
    } else if (qForm.type === 'fill_in_blank') {
      requestData.correct_answers = qForm.correct_answers
    } else if (qForm.type === 'programming') {
      requestData.template_code = qForm.template_code
    }

    if (editId.value) {
      // 编辑题目 - 使用题目集ID和题目ID
      if (!selectedQuestionSetId.value) {
        ElMessage.error('无法编辑：未选择题目集')
        return
      }
      await api.put(`/api/question_bank/questions/${selectedQuestionSetId.value}/${editId.value}`, requestData)
      ElMessage.success('题目更新成功')
    } else {
      // 新增题目 - 使用资源ID
      await api.post(`/api/question_bank/questions/${qForm.resourceId}`, requestData)
      ElMessage.success('题目添加成功')
    }

    showEdit.value = false
    await loadQuestionSets(selectedResourceId.value)
  } catch (e: any) {
    console.error('保存题目失败:', e)
    ElMessage.error('保存题目失败: ' + (e.message || '未知错误'))
  }
}

// ---------- 工具函数 ----------
function formatDate(dateString: string) {
  if (!dateString) return '未知时间'
  const date = new Date(dateString)
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

function getQuestionTypeText(type: string) {
  const typeMap: Record<string, string> = {
    'single_choice': '单选题',
    'multiple_choice': '多选题',
    'programming': '编程题',
    'fill_in_blank': '填空题'
  }
  return typeMap[type] || type
}

function getQuestionTypeTag(type: string) {
  const typeMap: Record<string, string> = {
    'single_choice': 'primary',
    'multiple_choice': 'success',
    'programming': 'warning',
    'fill_in_blank': 'info'
  }
  return typeMap[type] || 'default'
}
</script>

<style scoped>
.qb-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f7fa;
}
.top-bar {
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}
.main-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.sidebar {
  width: 280px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  overflow-y: auto;
  flex-shrink: 0;
}
.content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.pane {
  background: #fff;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  height: 100%;
}
.pane-title {
  font-weight: 600;
  margin-bottom: 12px;
  font-size: 16px;
  color: #303133;
}
.resource-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.resource-item {
  padding: 12px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #e4e7ed;
  transition: all 0.3s;
}
.resource-item:hover {
  background-color: #f5f7fa;
}
.resource-item.active {
  background-color: #ecf5ff;
  border-color: #409eff;
}
.resource-name {
  font-weight: 500;
  margin-bottom: 4px;
}
.resource-type {
  font-size: 12px;
  color: #909399;
}
.question-set-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}
.question-set-item {
  padding: 12px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #e4e7ed;
  transition: all 0.3s;
}
.question-set-item:hover {
  background-color: #f5f7fa;
}
.question-set-item.active {
  background-color: #ecf5ff;
  border-color: #409eff;
}
.set-name {
  font-weight: 500;
  margin-bottom: 4px;
}
.set-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #909399;
}
.delete-btn {
  color: #f56c6c;
}
.question-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}
.question-card {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
  transition: all 0.3s;
}
.question-card:hover {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #fafafa;
  border-bottom: 1px solid #e4e7ed;
}
.card-content {
  padding: 12px;
}
.question-title {
  margin-bottom: 12px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.question-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}
.difficulty, .knowledge, .score {
  display: flex;
  align-items: center;
  gap: 8px;
}
.no-knowledge {
  color: #c0c4cc;
  font-style: italic;
}
.empty-state, .empty-resource {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #909399;
  font-size: 14px;
}
.empty-content {
  text-align: center;
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: #c0c4cc;
}
.opt-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.opt-line .el-input {
  flex: 1;
}
</style>