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
         <template v-for="item in currentMenuData">
                    <!-- 原有侧边栏内容 -->
                    <template v-if="item.children">
                        <el-sub-menu :index="item.index" :key="item.index">
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
                                <el-menu-item v-else :index="subItem.index">
                                    {{ subItem.title }}
                                </el-menu-item>
                            </template>
                        </el-sub-menu>
                    </template>
                    <template v-else>
                        <el-menu-item :index="item.index" :key="item.index">
                            <el-icon>
                                <component :is="item.icon"></component>
                            </el-icon>
                            <template #title>{{ item.title }}</template>
                        </el-menu-item>
                    </template>
                </template>
        </el-menu>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSidebarStore } from '../store/sidebar';
import { useRoute } from 'vue-router';
import { menuData , teacherMenuData , studentMenuData, adminMenuData} from '@/components/menu';

const route = useRoute();
const onRoutes = computed(() => {
    console.log('Current route path:', route.path);
    // 如果当前路由的meta中设置了activeMenu，则使用它作为激活菜单的index
    if (route.meta.activeMenu) {
        return route.meta.activeMenu;
    }
    return route.path;
});

const sidebar = useSidebarStore();

const currentMenuData = computed(() => {
    const path = route.path;
    if (path.startsWith('/home_teacher')) {
        return teacherMenuData;
    } else if (path.startsWith('/home_student')) {
        return studentMenuData;
    }else if (path.startsWith('/home_admin')) {
        return adminMenuData;
    }
    return menuData;
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
