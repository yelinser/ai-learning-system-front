<template>
  <div class="quiz-container">
    <div class="page-header">
      <h1 class="page-title">测验与作业</h1>
    </div>
    
    <div class="quiz-list">
      <div v-for="(quiz, index) in quizList" :key="index" class="quiz-item">
        <div class="quiz-info">
          <h3 class="quiz-title">{{ quiz.title }}</h3>
          <p class="deadline">截止时间：{{ quiz.deadline }}</p>
          <p class="reminder">请务必在截止时间之前提交，截止时间后的提交不再计分</p>
          <p class="score-info">有效分数：{{ quiz.score.current }}/{{ quiz.score.total }}</p>
          <p class="description">你的每一次测验系统都将为你计分，并提取最高得分作为你的有效分数</p>
          <p class="submission-info">有效提交次数：{{ quiz.submissions.current }}/{{ quiz.submissions.total }}</p>
        </div>
        
        <div class="quiz-action">
          <button class="go-quiz-btn" @click="goToQuiz(quiz)">前往测验</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'; // 修复：添加 ref 导入
import { useRouter } from 'vue-router';

const router = useRouter();
const quizList = ref([
  {
    id: 1,
    title: "第1章大数据概述测验",
    deadline: "2025/12/08 03:30",
    score: { current: "0.00", total: "74.00" },
    submissions: { current: 0, total: 3 }
  },
  {
    id: 2,
    title: "第2章数据获取",
    deadline: "2025/12/08 03:30",
    score: { current: "0.00", total: "44.00" },
    submissions: { current: 0, total: 3 }
  },
  {
    id: 3,
    title: "第3章数据预处理",
    deadline: "2025/12/08 03:30",
    score: { current: "0.00", total: "60.00" },
    submissions: { current: 0, total: 3 }
  }
]);

const goToQuiz = (quiz) => {
  router.push({
    name: 'quiz',
    params: { id: quiz.id }
  });
};
</script>

<style scoped>
/* 样式保持不变 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
}

.quiz-container {
  max-width: 1000px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.page-header {
  padding: 20px 24px;
  border-bottom: 1px solid #eaeaea;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.quiz-list {
  padding: 20px 24px;
}

.quiz-item {
  display: flex;
  justify-content: space-between;
  padding: 20px 0;
  border-bottom: 1px solid #f0f0f0;
}

.quiz-item:last-child {
  border-bottom: none;
}

.quiz-info {
  flex: 1;
}

.quiz-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.deadline {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.reminder {
  font-size: 12px;
  color: #ff6b6b;
  margin-bottom: 8px;
}

.score-info, .submission-info {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.description {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.quiz-action {
  display: flex;
  align-items: center;
}

.go-quiz-btn {
  background-color: #52c41a;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.go-quiz-btn:hover {
  background-color: #73d13d;
}

.bottom-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid #eaeaea;
  margin-top: 20px;
}

.taskbar-icons {
  display: flex;
  gap: 12px;
}

.taskbar-icon {
  width: 24px;
  height: 24px;
  background-color: #f0f0f0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #666;
}

.ai-assistant {
  width: 40px;
  height: 40px;
  background-color: #f0f0f0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 20px;
}
</style>
