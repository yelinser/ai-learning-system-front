import request from '@/utils/request';

// 用户登录接口参数
export interface LoginParams {
    username: string;
    password: string;
    role: string;
}

// 用户注册接口参数
export interface RegisterParams {
    username: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    password: string;
}

// 用户信息接口（根据登录响应中的user字段定义）
export interface UserInfo {
    id: string;
    username: string;
    role: string;
    name: string;
    email: string;
    phone: string;
    created_time: string;
    updated_time: string;
    is_active: boolean;
    last_login: string | null;
}

// 登录成功后的响应数据
export interface LoginResponseData {
    user: UserInfo;
    session_token: string;
}

// 注册成功后的响应数据
export interface RegisterResponseData {
    username: string;
    role: string;
    name: string;
    email: string;
    phone: string;
    id: string;
    created_time: string;
    updated_time: string;
    is_active: boolean;
    last_login: string | null;
}

// 通用API响应接口（根据后端响应结构调整）
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
}

// 用户登录
export const userLogin = (data: LoginParams): Promise<ApiResponse<LoginResponseData>> => {
    return request({
        url: '/api/users/login',
        method: 'post',
        data
    });
};

// 用户注册 - 更新返回类型为 RegisterResponseData
export const userRegister = (data: RegisterParams): Promise<ApiResponse<RegisterResponseData>> => {
    return request({
        url: '/api/users/register',
        method: 'post',
        data
    });
};

// 获取用户信息
// 获取用户信息 - 需要传递session_token参数
export const getUserInfo = (sessionToken: string): Promise<ApiResponse<UserInfo>> => {
    return request({
        url: '/api/users/me',
        method: 'get',
        params: {
            session_token: sessionToken
        }
    });
};

// 用户注销登录 - 根据接口需要session_token参数
export const userLogout = (sessionToken: string): Promise<ApiResponse> => {
    return request({
        url: '/api/users/logout',
        method: 'post',
        params: {
            session_token: sessionToken
        }
    });
};

// 更新用户信息（需要根据实际后端接口添加）
export const updateUserInfo = (sessionToken: string, data: Partial<UserInfo>): Promise<ApiResponse<UserInfo>> => {
  return request({
    url: '/api/users/update-info', // 请根据实际接口路径修改
    method: 'put',
    params: {
      session_token: sessionToken
    },
    data
  });
};

// 修改密码（需要根据实际后端接口添加）
export const changePassword = (sessionToken: string, data: { current_password: string; new_password: string }): Promise<ApiResponse> => {
  return request({
    url: '/api/users/change-password', // 请根据实际接口路径修改
    method: 'post',
    params: {
      session_token: sessionToken
    },
    data
  });
};