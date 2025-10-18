<template>
  <div class="container">
    <div class="content-title">上传 & 下载</div>

    <!-- 上传框 + 输入框左右排列 -->
    <div class="upload-input-box">
      <!-- 上传框 -->
      <el-upload
        class="upload-demo"
        drag
        action="http://patrickshao.site:8000/api/v1/resources/upload"
        multiple
        :data="extraData"
        :on-success="handleSuccess"
        :on-error="handleError"
        :disabled="!canUpload"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          输入信息后
          <em>点击上传</em>
        </div>
      </el-upload>

      <!-- 输入框 -->
      <div class="input-box">
        <el-input v-model="extraData.course" placeholder="课程名"></el-input>
        <el-input v-model="extraData.chapter" placeholder="章节"></el-input>
        <el-input v-model="extraData.title" placeholder="标题"></el-input>
        <el-input v-model="extraData.author" placeholder="作者"></el-input>
      </div>
    </div>

    <!-- 下载框 -->
    <div class="download-box">
      <el-button type="primary" @click="downloadFile">
        下载文件
      </el-button>
      <p class="tips">点击按钮下载文件</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

const extraData = ref({
  course: "",
  chapter: "",
  title: "",
  author: ""
});

function handleSuccess(response: any, file: File) {
  alert(`文件 "${file.name}" 上传成功! 返回信息: ${JSON.stringify(response)}`);
}

function handleError(err: any, file: File) {
  alert(`文件 "${file.name}" 上传失败! 错误信息: ${err.message || err}`);
}

const downloadFile = () => {
  const link = document.createElement("a");
  link.href = "https://jsonplaceholder.typicode.com/posts/1";
  link.download = "example.txt";
  link.click();
};

const canUpload = computed(() => {
  return extraData.value.course && extraData.value.chapter 
  && extraData.value.title && extraData.value.author;
});
</script>

<style scoped>
.content-title {
  font-weight: 400;
  line-height: 50px;
  margin: 10px 0;
  font-size: 22px;
  color: #1f2f3d;
}

/* 上传框和输入框左右排列 */
.upload-input-box {
  display: flex;
  gap: 30px; /* 上传框和输入框的间距 */
  align-items: flex-start;
  margin-bottom: 20px;
}

.upload-demo {
  width: 400px;
  height: 200px;
}

.input-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 250px; /* 输入框区域宽度 */
}

.download-box {
  border: 1px dashed #d9d9d9;
  padding: 0px;
  width: 400px;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.tips {
  margin-top: 10px;
  font-size: 14px;
  color: #666;
}
</style>
