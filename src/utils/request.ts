import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const service: AxiosInstance = axios.create({
    baseURL: 'http://patrickshao.site:8000',
    timeout: 5000
});

// 只保留请求拦截器（如果需要添加token等）
service.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // 可以在这里添加全局请求处理，比如添加token
        return config;
    },
    (error: any) => {
        // 直接传递错误，不进行处理
        return Promise.reject(error);
    }
);

// 响应拦截器只处理成功的情况，错误直接传递
service.interceptors.response.use(
    (response: AxiosResponse) => {
        // 只处理成功的响应，返回数据
        return response.data;
    },
    (error: any) => {
        // 直接传递错误，由调用页面处理
        return Promise.reject(error);
    }
);

export default service;