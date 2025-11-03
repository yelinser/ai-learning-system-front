<template>
    <div class="login-bg">
        <div class="login-container">
            <div class="login-header">
                <img class="logo mr10" src="../../assets/img/logo.svg" alt="" />
                <div class="login-title">智慧学习系统</div>
            </div>
            <el-form :model="param" :rules="rules" ref="register" size="large">
                <el-form-item prop="username">
                    <el-input v-model="param.username" placeholder="用户名">
                        <template #prepend>
                            <el-icon>
                                <User />
                            </el-icon>
                        </template>
                    </el-input>
                </el-form-item>
                
                <el-form-item prop="name">
                    <el-input v-model="param.name" placeholder="姓名">
                        <template #prepend>
                            <el-icon>
                                <UserFilled />
                            </el-icon>
                        </template>
                    </el-input>
                </el-form-item>
                
                <el-form-item prop="email">
                    <el-input v-model="param.email" placeholder="邮箱">
                        <template #prepend>
                            <el-icon>
                                <Message />
                            </el-icon>
                        </template>
                    </el-input>
                </el-form-item>
                
                <el-form-item prop="phone">
                    <el-input v-model="param.phone" placeholder="手机号">
                        <template #prepend>
                            <el-icon>
                                <Iphone />
                            </el-icon>
                        </template>
                    </el-input>
                </el-form-item>
                
                <el-form-item prop="role">
                    <template #label>
                        <span style="color: #606266; font-size: 14px;">角色选择</span>
                    </template>
                    <el-radio-group v-model="param.role" class="role-radio-group">
                        <el-radio label="student" size="large">学生</el-radio>
                        <el-radio label="teacher" size="large">教师</el-radio>
                    </el-radio-group>
                </el-form-item>
                
                <el-form-item prop="password">
                    <el-input
                        type="password"
                        placeholder="密码"
                        v-model="param.password"
                        @keyup.enter="submitForm(register)"
                    >
                        <template #prepend>
                            <el-icon>
                                <Lock />
                            </el-icon>
                        </template>
                    </el-input>
                </el-form-item>
                
                <el-button 
                    class="login-btn" 
                    type="primary" 
                    size="large" 
                    :loading="loading"
                    @click="submitForm(register)"
                >
                    注册
                </el-button>
                
                <p class="login-text">
                    已有账号，<el-link type="primary" @click="$router.push('/login')">立即登录</el-link>
                </p>
                
                <p class="login-tips" v-if="registerError">{{ registerError }}</p>
            </el-form>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { userRegister, type RegisterParams } from '@/api/user';
import { User, Message, Lock, Iphone, UserFilled } from '@element-plus/icons-vue';

const router = useRouter();
const param = reactive<RegisterParams>({
    username: '',
    name: '',
    email: '',
    phone: '',
    role: 'student', // 默认角色为学生
    password: '',
});

const loading = ref(false);
const registerError = ref('');
const register = ref<FormInstance>();

// 验证规则
const rules: FormRules = {
    username: [
        {
            required: true,
            message: '请输入用户名',
            trigger: 'blur',
        },
        {
            min: 3,
            max: 20,
            message: '用户名长度在3到20个字符之间',
            trigger: 'blur',
        }
    ],
    name: [
        {
            required: true,
            message: '请输入姓名',
            trigger: 'blur',
        }
    ],
    email: [
        { 
            required: true, 
            message: '请输入邮箱', 
            trigger: 'blur' 
        },
        {
            type: 'email',
            message: '请输入有效的邮箱地址',
            trigger: ['blur', 'change'],
        }
    ],
    phone: [
        {
            required: true,
            message: '请输入手机号',
            trigger: 'blur',
        },
        {
            pattern: /^1[3-9]\d{9}$/,
            message: '请输入有效的手机号码',
            trigger: 'blur',
        }
    ],
    role: [
        {
            required: true,
            message: '请选择角色',
            trigger: 'change',
        }
    ],
    password: [
        { 
            required: true, 
            message: '请输入密码', 
            trigger: 'blur' 
        },
        {
            min: 6,
            max: 20,
            message: '密码长度在6到20个字符之间',
            trigger: 'blur',
        },
        {
            pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,20}$/,
            message: '密码需包含大小写字母、数字和特殊字符',
            trigger: 'blur',
        }
    ]
};

const submitForm = async (formEl: FormInstance | undefined) => {
    if (!formEl) return;
    
    registerError.value = '';
    
    formEl.validate(async (valid: boolean) => {
        if (!valid) {
            ElMessage.error('请填写完整的注册信息');
            return false;
        }

        loading.value = true;
        
        try {
            // 调用注册API
            const response = await userRegister(param);
            
            if (response.success) {
                ElMessage.success(response.message || '注册成功');
                
                // 注册成功后自动填充登录信息
                localStorage.setItem('register-info', JSON.stringify({
                    username: param.username,
                    password: param.password,
                    role: param.role
                }));
                
                // 跳转到登录页
                router.push('/login');
            } else {
                registerError.value = response.message || '注册失败';
                ElMessage.error(registerError.value);
            }
        } catch (error: any) {
            console.error('注册错误:', error);
            
            if (error.response?.data) {
                // 处理后端返回的错误信息
                const errorData = error.response.data;
                
                if (errorData.detail && Array.isArray(errorData.detail)) {
                    // 处理字段验证错误
                    registerError.value = errorData.detail[0]?.msg || '注册信息有误';
                } else {
                    registerError.value = errorData.message || errorData.detail || '注册失败';
                }
            } else {
                registerError.value = error.message || '网络错误，请稍后重试';
            }
            
            ElMessage.error(registerError.value);
        } finally {
            loading.value = false;
        }
    });
};
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

.login-btn {
    display: block;
    width: 100%;
    margin-top: 15px;
}

.login-text {
    display: flex;
    align-items: center;
    margin-top: 20px;
    font-size: 14px;
    color: #787878;
    justify-content: center;
}

.login-tips {
    font-size: 12px;
    color: #ff4d4f;
    text-align: center;
    margin-top: 10px;
}

.role-radio-group {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-top: 10px;
}
</style>