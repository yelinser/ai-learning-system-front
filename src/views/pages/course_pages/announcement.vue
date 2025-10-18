<template>
  <div class="announcement-page">
    <div class="cover-box">
      <img class="course-cover" :src="coverUrl" alt="课程封面" />
    </div>
    <el-card class="section-box announcement-box">
      <h2>教师公告</h2>
      <div class="announcement-content">{{ announcement }}</div>
    </el-card>
    <el-card class="section-box overview-box">
      <h2>课程概述</h2>
      <div class="overview-content">{{ overview }}</div>
    </el-card>
    <el-card class="section-box outline-box">
      <h2>课程大纲</h2>
      <ul>
        <li v-for="(item, idx) in outline" :key="idx">{{ item }}</li>
      </ul>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
// 示例数据，可替换为接口获取
const coverUrl = ref('https://cdn.jsdelivr.net/gh/realwds/images/cover-demo.jpg');
const announcement = ref('本周五下午进行课程测试，请同学们提前复习相关内容。');
const overview = ref('本课程主要介绍前端开发的基础知识，包括HTML、CSS、JavaScript等内容。');
const outline = ref([
  '第一章：HTML基础',
  '第二章：CSS样式',
  '第三章：JavaScript语法',
  '第四章：项目实战'
]);
</script>

<style scoped>
.announcement-page {
  width: 100%;
  max-width: 1200px;
  margin: 24px auto 0 auto;
  padding: 0 12px;
}
.cover-box {
  text-align: center;
  margin-bottom: 12px;
}
.course-cover {
  width: 100%;
  max-width: 400px;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
/* 优化卡片内边距 */
.section-box {
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  border-radius: 6px;
  padding: 16px; /* 统一卡片内边距 */
}
.announcement-box h2,
.overview-box h2,
.outline-box h2 {
  color: #409EFF;
  font-size: 18px;
  margin-bottom: 8px;
}
.announcement-content,
.overview-content {
  font-size: 15px;
  color: #333;
  line-height: 1.7;
}
.outline-box ul {
  padding-left: 18px;
}
.outline-box li {
  font-size: 15px;
  color: #555;
  margin-bottom: 4px;
}
</style>