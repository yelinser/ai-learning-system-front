import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import { usePermissStore } from '../store/permiss';
import Home from '../views/home.vue';
import home_student from '@/views/home_student.vue';
import home_teacher from '@/views/home_teacher.vue';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        redirect: '/login',
    },
    {
        path:'/home_admin',
        name:'home_admin',
        component: Home,
        children:[
            {
                path:'role_manage',
                name:'role_manage',
                meta:{
                    title:'角色管理',
                },
                component:()=>import('../views/pages/role_manage.vue')
            },
        ]
    },
    {
        path: '/home_student',
        name: 'home_student',
        redirect: '/home_student/course_material',
        component: home_student,
        children:[
          {
                path: 'student_dashboard',
                name: 'student_dashboard',
                meta: {
                    title: '学生首页',
                },
                component: () => import('../views/dashboard_student.vue')
            },
            {
                path:'learning_path',
                name:'learning_path',
                meta:{  
                    title:'学习路径推荐',
                },     
                component:()=>import('../views/pages/learning_path.vue')
            },
            {
                path: 'student_center',
                name: 'student_center',
                meta: {
                    title: '个人中心',
                },
                component: () => import('../views/pages/ucenter.vue')
            },
            {
                path: 's_notices',
                name: 's_notices',
                meta: {
                    title: '通知中心',
                },
                component: () => import('../views/pages/notices.vue')
            },
            {
                path: 'ai_teacher',
                name: 'ai_teacher',
                meta: {
                    title: 'ai助教',
                },
                component: () => import('../views/pages/ai_teacher.vue')
            },
            {
                path:'knowledge_graph',
                name:'knowledge_graph',
                meta:{  
                    title:'知识图谱',
                },     
                component:()=>import('../views/pages/knowledge_graph.vue')
            },
            {
                path: 'video/:chapterId/:id',
                name: 'video-display',
                component: () => import('../views/pages/course_pages/video_display.vue'),
                meta: {
                    title: '视频播放',
                    activeMenu: '/home_student/course_material',
                },
            },  
            {
                path: 'notice',
                name: 'course_notice',
                meta: { title: '公告' },
                component: () => import('@/views/pages/course_pages/announcement.vue')
            },
            {
                path: 'material',
                name: 'course_material',
                meta: { title: '课件' },
                component: () => import('@/views/pages/course_pages/course_material.vue')
            },
            {
                path: 'set_test',
                name: 'set_test',
                meta: { title: '测试设置' },
                component: () => import('../views/pages/course_pages/set_test.vue')
            },
            {
                path: 'quiz/:resourceId',
                name: 'quiz',
                meta: { 
                    title: '测验',
                    activeMenu: '/home_student/set_test',
                },
                props: route => ({ 
                resourceId: route.params.resourceId
                }),
                component: () => import('../views/pages/course_pages/quiz.vue')
            }
                    // {
                    //     path: 'discuss',
                    //     name: 'course_discuss',
                    //     meta: { title: '讨论区' },
                    //     component: () => import('@/views/pages/course_discuss.vue')
                    // }
                
            
        ]
    },
    {
        path: '/home_teacher',
        name: 'home_teacher',
        redirect: '/home_teacher/knowledge_manage',
        component: home_teacher,
        children:[
            {
                path: 'teacher_dashboard',
                name: 'teacher_dashboard',
                meta: {
                    title: '教师首页',
                    //permiss: 'teacher'
                },
                component: () => import('../views/dashboard_teacher.vue')
            },
            {
                path: 't_notices',
                name: 't_notices',
                meta: {
                    title: '通知中心',
                    noAuth: false
                },
                component: () => import(/* webpackChunkName: "dashboard" */ '../views/pages/notices.vue'),
            },
            {
                path: 'teacher_center',
                name: 'teacher_center',
                meta: {
                    title: '个人中心',
                },
                component: () => import(/* webpackChunkName: "ucenter" */ '../views/pages/ucenter.vue'),
            },
            {
                path: '/notices',
                name: 'notices',
                meta: {
                    title: '通知中心',
                    noAuth: false
                },
                component: () => import(/* webpackChunkName: "dashboard" */ '../views/pages/notices.vue'),
            },
            {
                path: 'knowledge_manage',
                name: 'knowledge_manage',
                meta: {
                    title: '知识管理',
                    //permiss: 'teacher'
                },
                component: () => import('../views/pages/knowledge_graph_manage.vue')
            },
            {
                path: 'upload',
                name: 'upload',
                meta: {
                    title: '上传课件',
                },
                component: () => import('../views/element/upload.vue'),
            },
            {
                path: 'monitor',
                name: 'monitor',
                meta: {
                    title: '学生进度监控',
                },
                component: () => import('../views/pages/monitor.vue'),
            },
            {
                path: 'question_bank',
                name: 'question_bank',
                meta: {
                    title: '题库管理',
                },
                component: () => import('../views/pages/question_bank.vue'),
            }
        ]
    },
    {
        path: '/',
        name: 'Home',
        component: Home,
        children: [
            {
                path: '/notices',
                name: 'notices',
                meta: {
                    title: '通知中心',
                    noAuth: false
                },
                component: () => import(/* webpackChunkName: "dashboard" */ '../views/pages/notices.vue'),
            },
            {
                path: '/dashboard',
                name: 'dashboard',
                meta: {
                    title: '系统首页',
                    noAuth: false
                },
                component: () => import(/* webpackChunkName: "dashboard" */ '../views/dashboard.vue'),
            },
            {
                path: '/system-user',
                name: 'system-user',
                meta: {
                    title: '用户管理',
                    permiss: '11',
                },
                component: () => import(/* webpackChunkName: "system-user" */ '../views/system/user.vue'),
            },
            {
                path: '/system-role',
                name: 'system-role',
                meta: {
                    title: '角色管理',
                    permiss: '12',
                },
                component: () => import(/* webpackChunkName: "system-role" */ '../views/system/role.vue'),
            },
            {
                path: '/system-menu',
                name: 'system-menu',
                meta: {
                    title: '菜单管理',
                    permiss: '13',
                },
                component: () => import(/* webpackChunkName: "system-menu" */ '../views/system/menu.vue'),
            },
            {
                path: '/table',
                name: 'basetable',
                meta: {
                    title: '基础表格',
                    permiss: '31',
                },
                component: () => import(/* webpackChunkName: "table" */ '../views/table/basetable.vue'),
            },
            {
                path: '/table-editor',
                name: 'table-editor',
                meta: {
                    title: '可编辑表格',
                    permiss: '32',
                },
                component: () => import(/* webpackChunkName: "table-editor" */ '../views/table/table-editor.vue'),
            },
            {
                path: '/schart',
                name: 'schart',
                meta: {
                    title: 'schart图表',
                    permiss: '41',
                },
                component: () => import(/* webpackChunkName: "schart" */ '../views/chart/schart.vue'),
            },
            {
                path: '/echarts',
                name: 'echarts',
                meta: {
                    title: 'echarts图表',
                    permiss: '42',
                },
                component: () => import(/* webpackChunkName: "echarts" */ '../views/chart/echarts.vue'),
            },

            {
                path: '/icon',
                name: 'icon',
                meta: {
                    title: '图标',
                    permiss: '5',
                },
                component: () => import(/* webpackChunkName: "icon" */ '../views/pages/icon.vue'),
            },
            {
                path: '/ucenter',
                name: 'ucenter',
                meta: {
                    title: '个人中心',
                },
                component: () => import(/* webpackChunkName: "ucenter" */ '../views/pages/ucenter.vue'),
            },
            {
                path: '/editor',
                name: 'editor',
                meta: {
                    title: '富文本编辑器',
                    permiss: '291',
                },
                component: () => import(/* webpackChunkName: "editor" */ '../views/pages/editor.vue'),
            },
            {
                path: '/markdown',
                name: 'markdown',
                meta: {
                    title: 'markdown编辑器',
                    permiss: '292',
                },
                component: () => import(/* webpackChunkName: "markdown" */ '../views/pages/markdown.vue'),
            },
            {
                path: '/export',
                name: 'export',
                meta: {
                    title: '导出Excel',
                    permiss: '34',
                },
                component: () => import(/* webpackChunkName: "export" */ '../views/table/export.vue'),
            },
            {
                path: '/import',
                name: 'import',
                meta: {
                    title: '导入Excel',
                    permiss: '33',
                },
                component: () => import(/* webpackChunkName: "import" */ '../views/table/import.vue'),
            },
            {
                path: '/theme',
                name: 'theme',
                meta: {
                    title: '主题设置',
                    permiss: '7',
                },
                component: () => import(/* webpackChunkName: "theme" */ '../views/pages/theme.vue'),
            },
            {
                path: '/calendar',
                name: 'calendar',
                meta: {
                    title: '日历',
                    permiss: '24',
                },
                component: () => import(/* webpackChunkName: "calendar" */ '../views/element/calendar.vue'),
            },
            {
                path: '/watermark',
                name: 'watermark',
                meta: {
                    title: '水印',
                    permiss: '25',
                },
                component: () => import(/* webpackChunkName: "watermark" */ '../views/element/watermark.vue'),
            },
            {
                path: '/carousel',
                name: 'carousel',
                meta: {
                    title: '走马灯',
                    permiss: '23',
                },
                component: () => import(/* webpackChunkName: "carousel" */ '../views/element/carousel.vue'),
            },
            {
                path: '/tour',
                name: 'tour',
                meta: {
                    title: '分步引导',
                    permiss: '26',
                },
                component: () => import(/* webpackChunkName: "tour" */ '../views/element/tour.vue'),
            },
            {
                path: '/steps',
                name: 'steps',
                meta: {
                    title: '步骤条',
                    permiss: '27',
                },
                component: () => import(/* webpackChunkName: "steps" */ '../views/element/steps.vue'),
            },
            {
                path: '/form',
                name: 'forms',
                meta: {
                    title: '表单',
                    permiss: '21',
                },
                component: () => import(/* webpackChunkName: "form" */ '../views/element/form.vue'),
            },
            // {
            //     path: '/upload',
            //     name: 'upload',
            //     meta: {
            //         title: '上传',
            //         permiss: '22',
            //     },
            //     component: () => import(/* webpackChunkName: "upload" */ '../views/element/upload.vue'),
            // },
            {
                path: '/statistic',
                name: 'statistic',
                meta: {
                    title: '统计',
                    permiss: '28',
                },
                component: () => import(/* webpackChunkName: "statistic" */ '../views/element/statistic.vue'),
            },
        ],
    },
    {
        path: '/login',
        meta: {
            title: '登录',
            noAuth: true,
        },
        component: () => import(/* webpackChunkName: "login" */ '../views/pages/login.vue'),
    },
    {
        path: '/register',
        meta: {
            title: '注册',
            noAuth: true,
        },
        component: () => import(/* webpackChunkName: "register" */ '../views/pages/register.vue'),
    },
    {
        path: '/reset-pwd',
        meta: {
            title: '重置密码',
            noAuth: true,
        },
        component: () => import(/* webpackChunkName: "reset-pwd" */ '../views/pages/reset-pwd.vue'),
    },
    {
        path: '/403',
        meta: {
            title: '没有权限',
            noAuth: true,
        },
        component: () => import(/* webpackChunkName: "403" */ '../views/pages/403.vue'),
    },
    {
        path: '/404',
        meta: {
            title: '找不到页面',
            noAuth: true,
        },
        component: () => import(/* webpackChunkName: "404" */ '../views/pages/404.vue'),
    },
    { path: '/:path(.*)', redirect: '/404' },
];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

router.beforeEach((to, from, next) => {
    NProgress.start();
    const role = localStorage.getItem('vuems_name');
    const permiss = usePermissStore();

    if (!role && to.meta.noAuth !== true) {
        next('/login');
    } else if (typeof to.meta.permiss == 'string' && !permiss.key.includes(to.meta.permiss)) {
        // 如果没有权限，则进入403
        next('/403');
    } else {
        next();
    }
});

router.afterEach(() => {
    NProgress.done();
});

export default router;
