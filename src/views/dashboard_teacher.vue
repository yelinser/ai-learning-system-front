<template>
  <div>
    <!-- 顶部统计卡片 -->
    <!-- <el-row :gutter="20" class="mgb20">
      <el-col :span="4">
        <el-card shadow="hover" body-class="card-body">
          <el-icon class="card-icon bg1"><User /></el-icon>
          <div class="card-content">
            <countup class="card-num color1" :end="1145" />
            <div>学生总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" body-class="card-body">
          <el-icon class="card-icon bg2"><Document /></el-icon>
          <div class="card-content">
            <countup class="card-num color2" :end="168" />
            <div>资源数量</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" body-class="card-body">
          <el-icon class="card-icon bg3"><TrendCharts /></el-icon>
          <div class="card-content">
            <countup class="card-num color3" :end="892" />
            <div>本周活跃学生</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" body-class="card-body">
          <el-icon class="card-icon bg4"><Warning /></el-icon>
          <div class="card-content">
            <countup class="card-num color4" :end="12" />
            <div>待审批资源</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" body-class="card-body">
          <el-icon class="card-icon bg5"><ChatDotRound /></el-icon>
          <div class="card-content">
            <countup class="card-num color5" :end="7" />
            <div>待回复提问</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" body-class="card-body">
          <el-icon class="card-icon bg6"><Clock /></el-icon>
          <div class="card-content">
            <countup class="card-num color6" :end="3" />
            <div>待批测验</div>
          </div>
        </el-card>
      </el-col>
    </el-row> -->
    <el-row :gutter="20" class="mgb20">
  <el-col :span="4" v-for="(c,i) in cards" :key="i">
    <el-card
      shadow="hover"
      body-class="card-body pointer"
      @click="$router.push(c.path)"
    >
      <el-icon class="card-icon" :class="c.bgClass">
        <component :is="c.icon" />
      </el-icon>
      <div class="card-content">
        <countup class="card-num" :class="c.colorClass" :end="c.num" />
        <div>{{ c.title }}</div>
      </div>
    </el-card>
  </el-col>
</el-row>

    <!-- 学习进度热力图 -->
    <el-row :gutter="20" class="mgb20">
      <el-col :span="18">
        <el-card shadow="hover">
          <div class="card-header">
            <p class="card-header-title">学习进度总览</p>
            <p class="card-header-desc">班级整体知识掌握热力图</p>
          </div>
          <v-chart class="chart" :option="heatOption" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="card-header">
            <p class="card-header-title">知识点掌握排行</p>
            <p class="card-header-desc">班级掌握率 Top5</p>
          </div>
          <div class="rank-list">
            <div class="rank-item" v-for="(r, i) in ranks" :key="i">
              <div class="rank-item-avatar">{{ i + 1 }}</div>
              <div class="rank-item-content">
                <div class="rank-item-top">
                  <div class="rank-item-title">{{ r.title }}</div>
                  <div class="rank-item-desc">掌握率：{{ r.value }}%</div>
                </div>
                <el-progress
                  :show-text="false"
                  :stroke-width="10"
                  :percentage="r.percent"
                  :color="r.color"
                />
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 学生活动时间线 + 地区分布 -->
    <el-row :gutter="20">
      <el-col :span="7">
        <el-card shadow="hover" :body-style="{ height: '400px' }">
          <div class="card-header">
            <p class="card-header-title">学生活动时间线</p>
            <p class="card-header-desc">最新学习动态</p>
          </div>
          <el-timeline>
            <el-timeline-item
              v-for="(a, i) in activities"
              :key="i"
              :color="a.color"
            >
              <div class="timeline-item">
                <div>
                  <p>{{ a.content }}</p>
                  <p class="timeline-desc">{{ a.description }}</p>
                </div>
                <div class="timeline-time">{{ a.timestamp }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card shadow="hover" :body-style="{ height: '400px' }">
          <div class="card-header">
            <p class="card-header-title">学生地区分布</p>
            <p class="card-header-desc">注册学生地区统计</p>
          </div>
          <v-chart class="map-chart" :option="mapOptions" />
        </el-card>
      </el-col>
      <el-col :span="7">
        <el-card shadow="hover" :body-style="{ height: '400px' }">
          <div class="card-header">
            <p class="card-header-title">待处理事项</p>
            <p class="card-header-desc">点击条目前往处理</p>
          </div>
          <div class="todo-list">
            <div
              class="todo-item"
              v-for="(t, i) in todos"
              :key="i"
              @click="$router.push(t.path)"
            >
              <el-icon :color="t.color"><Warning /></el-icon>
              <span>{{ t.text }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts" name="teacher-dashboard">
import countup from '@/components/countup.vue'
import VChart from 'vue-echarts'
import { CanvasRenderer } from 'echarts/renderers'
import {
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  TitleComponent,
} from 'echarts/components'
import { HeatmapChart, MapChart } from 'echarts/charts'
import { use, registerMap } from 'echarts/core'
import chinaMap from '@/utils/china'
import {
  User,
  Document,
  TrendCharts,
  Warning,
  ChatDotRound,
  Clock,
} from '@element-plus/icons-vue'
import { ref, onMounted } from 'vue'
import axios from 'axios'
/* 卡片配置 → 路径 + 图标 +样式 */
const cards = ref([
  { key: 'studentTotal', title: '学生总数', icon: User,  bgClass: 'bg1', colorClass: 'color1', num: 114, path: '/student/list' },
  { key: 'resourceTotal', title: '资源数量', icon: Document, bgClass: 'bg2', colorClass: 'color2', num: 514, path: '/resource/manage' },
  { key: 'activeThisWeek', title: '本周活跃学生', icon: TrendCharts, bgClass: 'bg3', colorClass: 'color3', num: 1919, path: '/home_teacher/monitor' },
//   { key: 'pendingResource', title: '待审批资源', icon: Warning, bgClass: 'bg4', colorClass: 'color4', num: 810, path: '/resource/pending' },
  { key: 'pendingQuestion', title: '待回复提问', icon: ChatDotRound, bgClass: 'bg5', colorClass: 'color5', num: 520, path: '/notices' },
//   { key: 'pendingQuiz', title: '待批测验', icon: Clock, bgClass: 'bg6', colorClass: 'color6', num: 1314, path: '/quiz/mark' }
])

/* 预留：统一拉取卡片数据 */
const fetchCardData = async () => {
  try {
    // 后端接口地址统一前缀 /api/dashboard/cards
    const { data } = await axios.get('/api/dashboard/cards')
    // 约定返回：{ studentTotal: 1145, resourceTotal: 168, ... }
    cards.value.forEach(c => { c.num = data[c.key] ?? 0 })
  } catch (e) {
    console.error('卡片数据加载失败', e)
  }
}

onMounted(() => {
  fetchCardData()
})

use([
  CanvasRenderer,
  HeatmapChart,
  MapChart,
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  TitleComponent,
])
registerMap('china', chinaMap)

/* -------------------- 数据 -------------------- */
const activities = [
  {
    content: '学生提交提问',
    description: '张三在“函数概念”节点提交了疑问：什么是定义域？',
    timestamp: '10分钟前',
    color: '#00bcd4',
  },
  {
    content: '学生完成测验',
    description: '李四完成了“代数基础”测验，得分：85分',
    timestamp: '30分钟前',
    color: '#1ABC9C',
  },
  {
    content: '资源被收藏',
    description: '王五收藏了你的视频《一次函数图像讲解》',
    timestamp: '1小时前',
    color: '#3f51b5',
  },
  {
    content: '学生未通过测验',
    description: '赵六在“几何证明”测验中未达标，建议复习',
    timestamp: '2小时前',
    color: '#f44336',
  },
  {
    content: '你发布了新资源',
    description: '你上传了PPT《二次函数顶点式》并关联知识点',
    timestamp: '1天前',
    color: '#009688',
  },
]

const ranks = [
  { title: '函数概念', value: 92, percent: 92, color: '#f25e43' },
  { title: '几何证明', value: 78, percent: 78, color: '#00bcd4' },
  { title: '代数运算', value: 75, percent: 75, color: '#64d572' },
  { title: '概率计算', value: 68, percent: 68, color: '#e9a745' },
  { title: '统计图表', value: 60, percent: 60, color: '#009688' },
]

const todos = [
//   { text: '12个资源待审批', path: '/resources/pending', color: '#e9a745' },
  { text: '7个学生提问待回复', path: '/notices', color: '#00bcd4' },
//   { text: '3份测验待批改', path: '/quiz/mark', color: '#f44336' },
]

/* -------------------- 图表配置 -------------------- */
const heatOption = {
  tooltip: { position: 'top' },
  grid: { height: '80%', top: '10%' },
  xAxis: {
    type: 'category',
    data: ['函数', '几何', '代数', '概率', '统计'],
    splitArea: { show: true },
  },
  yAxis: {
    type: 'category',
    data: ['学生A', '学生B', '学生C', '学生D'],
    splitArea: { show: true },
  },
  visualMap: {
    min: 0,
    max: 100,
    calculable: true,
    orient: 'horizontal',
    left: 'center',
    bottom: '0%',
    inRange: { color: ['#e0e0e0', '#64d572', '#2d8cf0'] },
  },
  series: [
    {
      name: '掌握度',
      type: 'heatmap',
      data: [
        [0, 0, 85], [1, 0, 70], [2, 0, 90], [3, 0, 78], [4, 0, 65],
        [0, 1, 60], [1, 1, 80], [2, 1, 75], [3, 1, 82], [4, 1, 88],
        [0, 2, 92], [1, 2, 88], [2, 2, 70], [3, 2, 60], [4, 2, 74],
        [0, 3, 76], [1, 3, 65], [2, 3, 84], [3, 3, 90], [4, 3, 80],
      ],
      label: { show: true },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
        },
      },
    },
  ],
}

const mapOptions = {
  title: { text: '学生地区分布', left: 'center' },
  tooltip: { trigger: 'item' },
  visualMap: {
    min: 0,
    max: 300,
    left: 'left',
    top: 0,
    text: ['高', '低'],
    calculable: true,
    inRange: { color: ['#e0f3f8', '#abd9e9', '#4575b4'] },
  },
  series: [
    {
      name: '学生数',
      type: 'map',
      map: 'china',
      roam: true,
      // 关键改动 ↓
      label: {
        show: false, // 默认不显示省份名称
      },
      emphasis: {
        label: {
          show: true, // 悬停时显示
        },
        itemStyle: {
          areaColor: '#ffdf22', // 悬停高亮颜色（可选）
        },
      },
      data: [
        { name: '北京', value: 180 },
        { name: '上海', value: 220 },
        { name: '广东', value: 300 },
        { name: '江苏', value: 150 },
        { name: '浙江', value: 120 },
      ],
    },
  ],
}
</script>

<style scoped>
.mgb20 {
  margin-bottom: 20px;
}
.card-body {
  display: flex;
  align-items: center;
  height: 100px;
  padding: 0;
}
.card-content {
  flex: 1;
  text-align: center;
  font-size: 14px;
  color: #999;
}
.card-num {
  font-size: 30px;
}
.card-icon {
  font-size: 50px;
  width: 150px;
  height: 100px;
  text-align: center;
  line-height: 100px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bg1 { background: #2d8cf0; }
.bg2 { background: #64d572; }
.bg3 { background: #f25e43; }
.bg4 { background: #e9a745; }
.bg5 { background: #00bcd4; }
.bg6 { background: #009688; }
.color1 { color: #2d8cf0; }
.color2 { color: #64d572; }
.color3 { color: #f25e43; }
.color4 { color: #e9a745; }
.color5 { color: #00bcd4; }
.color6 { color: #009688; }
.chart {
  width: 100%;
  height: 400px;
}
.map-chart {
  width: 100%;
  height: 350px;
}
.card-header {
  padding-left: 10px;
  margin-bottom: 20px;
}
.card-header-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
}
.card-header-desc {
  font-size: 14px;
  color: #999;
}
.timeline-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  color: #000;
}
.timeline-time,
.timeline-desc {
  font-size: 12px;
  color: #787878;
}
.rank-list {
  padding: 0 10px;
}
.rank-item {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}
.rank-item-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f2f2f2;
  text-align: center;
  line-height: 40px;
  margin-right: 10px;
}
.rank-item-content {
  flex: 1;
}
.rank-item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #343434;
  margin-bottom: 10px;
}
.rank-item-desc {
  font-size: 14px;
  color: #999;
}
.todo-list {
  padding: 0 10px;
}
.todo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  cursor: pointer;
  font-size: 15px;
}
.todo-item:hover {
  color: #2d8cf0;
}
.pointer { cursor: pointer; }
</style>