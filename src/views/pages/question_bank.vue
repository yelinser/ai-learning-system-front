<template>
  <div class="qb-page">
    <!-- 顶部栏 -->
    <el-row class="top-bar">
      <el-button type="primary" @click="addQuestion">新增题目</el-button>
      <el-button @click="generatePaper">组卷</el-button>
    </el-row>

    <!-- 主体 -->
    <el-row :gutter="12" class="main">
      <!-- 左侧题库 -->
      <el-col :span="12">
        <div class="pane">
          <div class="pane-title">题库</div>
          <el-table :data="questions" row-key="id" height="460">
            <el-table-column label="题型" width="70">
              <template #default="{ row }">
                <el-tag size="small">{{ row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="title" label="题干" show-overflow-tooltip />
            <el-table-column label="难度" width="60">
              <template #default="{ row }">
                <el-rate :value="row.difficulty" disabled />
              </template>
            </el-table-column>
            <el-table-column width="100">
              <template #default="{ row }">
                <el-button type="text" @click="editQuestion(row)">编辑</el-button>
                <el-button type="text" @click="delQuestion(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>

      <!-- 右侧组卷 & 统计 -->
      <el-col :span="12">
        <div class="pane">
          <div class="pane-title">组卷</div>
          <el-form :model="paperForm" label-width="60px" size="small">
            <el-form-item label="名称">
              <el-input v-model="paperForm.title" placeholder="测验名称" />
            </el-form-item>
            <el-form-item label="时长">
              <el-input-number v-model="paperForm.duration" :min="10" :max="120" /> 分钟
            </el-form-item>
            <el-form-item label="已选">
              <div class="sel-box">
                <div v-for="q in selected" :key="q.id" class="sel-item">
                  <span>{{ q.title }}</span>
                  <el-icon @click="toggleSelect(q)"><close /></el-icon>
                </div>
                <el-button text @click="autoSelect">自动选题</el-button>
              </div>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="publishPaper">发布测验</el-button>
            </el-form-item>
          </el-form>

          <div class="pane-title" style="margin-top: 16px">实时统计</div>
          <el-descriptions :column="1" size="small" border>
            <el-descriptions-item label="总数">{{ selected.length }}</el-descriptions-item>
            <el-descriptions-item label="平均难度">{{ avgDiff.toFixed(1) }}</el-descriptions-item>
          </el-descriptions>
          
          <div class="pane-title" style="margin-top: 16px">难度分布</div>
          <v-chart class="chart" :option="diffOption" />
        </div>
      </el-col>
    </el-row>

    <!-- 新增/编辑题目 -->
    <el-dialog v-model="showEdit" :title="editId ? '编辑题目' : '新增题目'" width="520px">
      <el-form :model="qForm" label-width="80px" size="small">
        <el-form-item label="题型">
          <el-radio-group v-model="qForm.type">
            <el-radio label="单选" />
            <el-radio label="多选" />
            <el-radio label="编程" />
          </el-radio-group>
        </el-form-item>
        <el-form-item label="题干">
          <el-input v-model="qForm.title" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item v-if="qForm.type !== '编程'" label="选项">
          <div v-for="(opt, idx) in qForm.options" :key="idx" class="opt-line">
            <el-input v-model="opt.text" />
            <el-checkbox v-model="opt.correct">正确</el-checkbox>
          </div>
          <el-button text @click="addOption">+ 添加选项</el-button>
        </el-form-item>
        <el-form-item label="解析">
          <el-input v-model="qForm.analysis" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="难度">
          <el-rate v-model="qForm.difficulty" show-score />
        </el-form-item>
        <el-form-item label="知识点">
          <el-tag
            v-for="tag in qForm.knowTags"
            :key="tag"
            closable
            @close="qForm.knowTags.splice(qForm.knowTags.indexOf(tag), 1)"
          >
            {{ tag }}
          </el-tag>
          <el-input
            v-if="inputVisible"
            ref="tagInputRef"
            v-model="inputValue"
            size="small"
            @keyup.enter="handleInputConfirm"
            @blur="handleInputConfirm"
          />
          <el-button v-else text @click="showTagInput">+ 知识点</el-button>
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
import { ref, reactive, computed, nextTick } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { ECBasicOption } from 'echarts/types/dist/shared'
import VChart from 'vue-echarts'

// ---------- 数据 ----------
interface Question {
  id: string
  title: string
  type: '单选' | '多选' | '编程'
  options?: { text: string; correct: boolean }[]
  analysis: string
  difficulty: number
  knowTags: string[]
}
const questions = ref<Question[]>([
  {
    id: 'q1',
    title: '下列哪项是单选典型特征？',
    type: '单选',
    options: [
      { text: '只有一个正确答案', correct: true },
      { text: '可以多个答案', correct: false },
    ],
    analysis: '单选定义',
    difficulty: 2,
    knowTags: ['函数'],
  },
  {
    id: 'q2',
    title: 'Python 中如何交换两个变量？',
    type: '编程',
    analysis: 'a, b = b, a',
    difficulty: 3,
    knowTags: ['代数'],
  },
])

const selected = ref<Question[]>([])
const paperForm = reactive({ title: '', duration: 45 })
const showEdit = ref(false)
const editId = ref<string | null>(null)

// ---------- 难度分布 ----------
const diffOption = computed<ECBasicOption>(() => ({
  tooltip: {},
  xAxis: { type: 'category', data: ['1', '2', '3', '4', '5'] },
  yAxis: { type: 'value' },
  series: [
    {
      type: 'bar',
      name: '数量',
      data: [1, 2, 3, 2, 1].map((v, i) => ({
        value: questions.value.filter(q => Math.ceil(q.difficulty) === i + 1).length,
      })),
      itemStyle: { color: '#2d8cf0' },
    },
  ],
}))

// ---------- 表单 ----------
const qForm = reactive<Question>({
  id: '',
  title: '',
  type: '单选',
  options: [{ text: '', correct: false }],
  analysis: '',
  difficulty: 2,
  knowTags: [],
})
const inputVisible = ref(false)
const inputValue = ref('')
const tagInputRef = ref()

// ---------- 业务函数 ----------
function addOption() {
  qForm.options!.push({ text: '', correct: false })
}
function saveQuestion() {
  const q: Question = { ...qForm, id: editId.value || `q${Date.now()}` }
  if (editId.value) {
    const i = questions.value.findIndex(v => v.id === editId.value)
    if (i > -1) questions.value[i] = q
  } else {
    questions.value.push(q)
  }
  showEdit.value = false
  resetForm()
  ElMessage.success('已保存')
}
function delQuestion(q: Question) {
  questions.value = questions.value.filter(v => v.id !== q.id)
  ElMessage.success('已删除')
}
function editQuestion(q: Question) {
  editId.value = q.id
  Object.assign(qForm, JSON.parse(JSON.stringify(q)))
  showEdit.value = true
}
function resetForm() {
  Object.assign(qForm, {
    id: '',
    title: '',
    type: '单选',
    options: [{ text: '', correct: false }],
    analysis: '',
    difficulty: 2,
    knowTags: [],
  })
  editId.value = null
}

// ---------- 组卷 ----------
function autoSelect() {
  const pick = questions.value
    .filter(q => q.difficulty <= 3)
    .sort(() => 0.5 - Math.random())
    .slice(0, 5)
  selected.value = pick
}
function toggleSelect(q: Question) {
  const idx = selected.value.findIndex(v => v.id === q.id)
  idx > -1 ? selected.value.splice(idx, 1) : selected.value.push(q)
}
function publishPaper() {
  if (!selected.value.length) return ElMessage.warning('请先选题目')
  ElMessage.success('测验已发布！')
}

// ---------- 标签输入 ----------
function showTagInput() {
  inputVisible.value = true
  nextTick(() => tagInputRef.value.focus())
}
function handleInputConfirm() {
  if (inputValue.value && !qForm.knowTags.includes(inputValue.value)) {
    qForm.knowTags.push(inputValue.value)
  }
  inputVisible.value = false
  inputValue.value = ''
}

// ---------- 统计 ----------
const avgDiff = computed(() => {
  if (!selected.value.length) return 0
  return selected.value.reduce((s, q) => s + q.difficulty, 0) / selected.value.length
})

// 新增题目
function addQuestion() {
  resetForm()
  editId.value = null
  showEdit.value = true
}

// 组卷发布
function generatePaper() {
  if (!selected.value.length) {
    ElMessage.warning('请先选择题目')
    return
  }
  ElMessage.success(`已生成 ${selected.value.length} 题的测验卷`)
}
</script>

<style scoped>
.qb-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f7fa;
}
.top-bar {
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
}
.main {
  flex: 1;
  padding: 12px;
}
.pane {
  background: #fff;
  height: 100%;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}
.pane-title {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 15px;
}
.chart {
  width: 100%;
  height: 200px;
}
.sel-box {
  border: 1px dashed #c0c4cc;
  border-radius: 4px;
  padding: 6px;
  min-height: 80px;
}
.sel-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px;
  margin-bottom: 4px;
  background: #f0f2f5;
  border-radius: 3px;
}
.opt-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
</style>