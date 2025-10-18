<template>
    <div class="sidebar">
        <el-menu
            class="sidebar-el-menu"
            :default-active="onRoutes"
            :collapse="sidebar.collapse"
            :background-color="sidebar.bgColor"
            :text-color="sidebar.textColor"
            router
        >
            <template v-if="parentRoute === '/'">
                <template v-for="item in menuData">
                    <!-- 原有侧边栏内容 -->
                    <template v-if="item.children">
                        <el-sub-menu :index="item.index" :key="item.index" v-permiss="item.id">
                            <template #title>
                                <el-icon>
                                    <component :is="item.icon"></component>
                                </el-icon>
                                <span>{{ item.title }}</span>
                            </template>
                            <template v-for="subItem in item.children">
                                <el-sub-menu
                                    v-if="subItem.children"
                                    :index="subItem.index"
                                    :key="subItem.index"
                                    v-permiss="item.id"
                                >
                                    <template #title>{{ subItem.title }}</template>
                                    <el-menu-item
                                        v-for="(threeItem, i) in subItem.children"
                                        :key="i"
                                        :index="threeItem.index"
                                    >
                                        {{ threeItem.title }}
                                    </el-menu-item>
                                </el-sub-menu>
                                <el-menu-item v-else :index="subItem.index" v-permiss="item.id">
                                    {{ subItem.title }}
                                </el-menu-item>
                            </template>
                        </el-sub-menu>
                    </template>
                    <template v-else>
                        <el-menu-item :index="item.index" :key="item.index" v-permiss="item.id">
                            <el-icon>
                                <component :is="item.icon"></component>
                            </el-icon>
                            <template #title>{{ item.title }}</template>
                        </el-menu-item>
                    </template>
                </template>
            </template>
            <template v-else-if="parentRoute === '/home_teacher'">
                <el-menu-item index="/home_teacher/teacher_dashboard" key="teacher_dashboard">
                    教师首页
                </el-menu-item>
                <el-menu-item index="/home_teacher/upload" key="upload">
                    上传课件
                </el-menu-item>
                <el-menu-item index="/home_teacher/knowledge" key="knowledge">
                    知识图谱
                </el-menu-item>
            </template>
            <template v-else-if="parentRoute === '/home_student'">
                <el-menu-item index="/home_student/student_dashboard" key="student_dashboard">
                    学生首页
                </el-menu-item>
                <el-menu-item index="/home_student/progress" key="progress">
                    学习进度
                </el-menu-item>
                <el-menu-item index="/home_student/course_detail" key="course_detail">
                    课程详情
                </el-menu-item>
                <el-menu-item index="/home_student/knowledge_graph" key="knowledge_graph">
                    知识图谱
                </el-menu-item>
                <el-menu-item index="/home_student/ai_teacher" key="ai">
                    AI助教
                </el-menu-item>
            </template>
        </el-menu>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSidebarStore } from '../store/sidebar';
import { useRoute } from 'vue-router';
import { menuData } from '@/components/menu';

const route = useRoute();
const onRoutes = computed(() => {
    return route.path;
});

const sidebar = useSidebarStore();

const parentRoute = computed(() => {
    // Extract the parent route from the current path
    const path = route.path;
    if (path.startsWith('/home_teacher')) {
        return '/home_teacher';
    } else if (path.startsWith('/home_student')) {
        return '/home_student';
    }
    return '/';
});

</script>

<style scoped>
.sidebar {
    display: block;
    position: absolute;
    left: 0;
    top: 70px;
    bottom: 0;
    overflow-y: scroll;
}

.sidebar::-webkit-scrollbar {
    width: 0;
}

.sidebar-el-menu:not(.el-menu--collapse) {
    width: 250px;
}

.sidebar-el-menu {
    min-height: 100%;
}
</style>
