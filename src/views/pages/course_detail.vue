<template>
  <div class="course-detail">
    <el-menu :default-active="$route.name" mode="horizontal" class="course-nav" @select="handleSelect">
      <el-menu-item index="course_notice">公告</el-menu-item>
      <el-menu-item index="course_material">课件</el-menu-item>
      <el-menu-item index="set_test">测试</el-menu-item>
      <el-menu-item index="course_discuss">讨论区</el-menu-item>
    </el-menu>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();
function handleSelect(key) {
  router.push({ name: key, params: route.params });
}
</script>

<style scoped>
.course-nav {
  margin-bottom: 20px;
}
</style>