<template>
    <div class="login-bg">
        <div class="login-container">
            <div class="login-header">
                <img class="logo mr10" src="../../assets/img/logo.svg" alt="" />
                <div class="login-title">智慧教学系统</div>
            </div>
            <el-form :model="param" :rules="rules" ref="login" size="large">
                <el-form-item prop="username">
                    <el-input v-model="param.username" placeholder="用户名">
                        <template #prepend>
                            <el-icon>
                                <User />
                            </el-icon>
                        </template>
                    </el-input>
                </el-form-item>
                <el-form-item prop="password">
                    <el-input
                        type="password"
                        placeholder="密码"
                        v-model="param.password"
                        @keyup.enter="submitForm(login)"
                    >
                        <template #prepend>
                            <el-icon>
                                <Lock />
                            </el-icon>
                        </template>
                    </el-input>
                </el-form-item>
                <!-- 新增角色选择单选框 -->
                <el-form-item prop="role">
                    <template #label>
                        <span style="color: #606266; font-size: 14px;">角色选择</span>
                    </template>
                    <el-radio-group v-model="param.role" class="role-radio-group">
                        <el-radio label="teacher" size="large">教师</el-radio>
                        <el-radio label="student" size="large">学生</el-radio>
                    </el-radio-group>
                </el-form-item>
                <div class="pwd-tips">
                    <el-checkbox class="pwd-checkbox" v-model="checked" label="记住密码" />
                    <el-link type="primary" @click="$router.push('/reset-pwd')">忘记密码</el-link>
                </div>
                <el-button class="login-btn" type="primary" size="large" :loading="loading" @click="submitForm(login)">登录</el-button>
                <p class="login-tips" v-if="loginError">{{ loginError }}</p>
                <p class="login-text">
                    没有账号？<el-link type="primary" @click="$router.push('/register')">立即注册</el-link>
                </p>
            </el-form>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useTabsStore } from '@/store/tabs';
import { usePermissStore } from '@/store/permiss';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { userLogin, type LoginParams } from '@/api/user';

// 使用从API导入的LoginParams接口
interface LoginInfo extends LoginParams {
    username: string;
    password: string;
    role: string;
}

const lgStr = localStorage.getItem('login-param');
const defParam = lgStr ? JSON.parse(lgStr) : null;
const checked = ref(lgStr ? true : false);
const loading = ref(false);
const loginError = ref('');

const router = useRouter();
const param = reactive<LoginInfo>({
    username: defParam ? defParam.username : '',
    password: defParam ? defParam.password : '',
    role: defParam?.role || 'student' // 默认角色为学生
});

// 验证规则
const rules: FormRules = {
    username: [
        {
            required: true,
            message: '请输入用户名',
            trigger: 'blur',
        },
    ],
    password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
    role: [
        {
            required: true,
            message: '请选择角色',
            trigger: 'change',
        }
    ]
};

const permiss = usePermissStore();
const login = ref<FormInstance>();

const submitForm = async (formEl: FormInstance | undefined) => {
    if (!formEl) return;
    
    loginError.value = '';
    
    formEl.validate(async (valid: boolean) => {
        if (!valid) {
            ElMessage.error('请填写完整的登录信息');
            return false;
        }

        loading.value = true;
        
        try {
            // 调用登录API - 使用正确的参数
            const response = await userLogin({
                username: param.username,
                password: param.password,
                role: param.role
            });
            console.log('登录响应:', response);

            if (response.success && response.data) {
                ElMessage.success(response.message || '登录成功');
                
                // 保存用户信息到本地存储 - 根据后端响应结构调整
                const userInfo = response.data.user;
                const sessionToken = response.data.session_token;
                
                // 存储用户信息和token
                localStorage.setItem('vuems_name', userInfo.name || userInfo.username);
                localStorage.setItem('vuems_role', userInfo.role);
                localStorage.setItem('session_token', sessionToken);
                localStorage.setItem('user_info', JSON.stringify(userInfo));
                
                // 设置权限 - 根据实际用户角色设置
                const keys = permiss.defaultList[userInfo.role === 'admin' ? 'admin' : 'user'];
                permiss.handleSet(keys);
                
                // 记住密码功能
                if (checked.value) {
                    localStorage.setItem('login-param', JSON.stringify(param));
                } else {
                    localStorage.removeItem('login-param');
                }
                
                // 根据用户角色跳转不同页面 - 使用后端返回的角色信息
                if (userInfo.role === 'admin') {
                    router.push('/dashboard');
                } else if (userInfo.role === 'teacher') {
                    router.push('/home_teacher');
                } else {
                    router.push('/home_student');
                }
            } else {
                // 登录失败，显示后端返回的错误信息
                loginError.value = response.message || '登录失败';
                ElMessage.error(loginError.value);
            }
        } catch (error: any) {
            console.error('登录错误:', error);
            // 错误处理调整，匹配后端错误格式
            if (error.response && error.response.data) {
                // 后端返回的结构化错误
                const errorData = error.response.data;
                if (errorData.detail && Array.isArray(errorData.detail)) {
                    // 处理验证错误
                    loginError.value = errorData.detail[0]?.msg || '请求参数错误';
                } else {
                    loginError.value = errorData.message || errorData.detail || '登录失败';
                }
            } else if (error.message) {
                // 网络错误或其他错误
                loginError.value = error.message;
            } else {
                loginError.value = '网络错误，请稍后重试';
            }
            ElMessage.error(loginError.value);
        } finally {
            loading.value = false;
        }
    });
};

const tabs = useTabsStore();
tabs.clearTabs();
</script>

<style scoped>
.login-bg {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100vh;
    background: url(../../assets/img/login-bg.jpg) center/cover no-repeat;
}

.login-header {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 40px;
}

.logo {
    width: 35px;
}

.login-title {
    font-size: 22px;
    color: #333;
    font-weight: bold;
}

.login-container {
    width: 450px;
    border-radius: 5px;
    background: #fff;
    padding: 40px 50px 50px;
    box-sizing: border-box;
}

.pwd-tips {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    margin: -10px 0 10px;
    color: #787878;
}

.pwd-checkbox {
    height: auto;
}

.login-btn {
    display: block;
    width: 100%;
}

.login-tips {
    font-size: 12px;
    color: #ff4d4f;
    text-align: center;
    margin: 10px 0;
}

.login-text {
    display: flex;
    align-items: center;
    margin-top: 20px;
    font-size: 14px;
    color: #787878;
}

/* 角色选择样式 */
.role-radio-group {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-top: 10px;
}
</style>