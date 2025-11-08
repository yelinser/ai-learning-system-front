import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// ==================== 类型定义 ====================
// 后端错误响应格式
interface ErrorResponse {
  detail?: Array<{ msg: string }>;
  message?: string;
}

// 其他类型保持不变...
export interface ResourceMetadata {
  title?: string;
  author?: string;
  keywords?: string[];
  course?: string;
  chapter?: string;
}

export interface Resource {
  filename: string;
  content_type: string;
  size: number;
  resource_type: string;
  metadata: ResourceMetadata;
  id: string;
  upload_time: string;
  file_path: string;
  vector_id: string;
}

export interface Option {
  key: string;
  content: string;
}

export interface Question {
  id: string;
  content: string;
  explanation: string;
  difficulty: number;
  concept: string;
  score: number;
  type: 'single_choice' | 'multiple_choice' | 'fill_in_blank' | 'programming';
  options?: Option[];
  correct_answer?: string;
  correct_answers?: string[];
  template_code?: string;
  test_cases?: any[];
}

export interface QuestionSet {
  id: string;
  resource_id: string;
  questions: Question[];
  created_time: string;
  updated_time: string;
}

export interface SubmitAnswerRequest {
  student_id: string;
  student_name: string;
  question_set_id: string;
  answers: { [key: string]: string | string[] };
  time_spent: number;
}

export interface SubmitAnswerResponse {
  id: string;
  student_id: string;
  student_name: string;
  question_set_id: string;
  answers: { [key: string]: any };
  scores: { [key: string]: number };
  submit_time: string;
  total_score: number;
  time_spent: number;
}

// ==================== Axios 配置 ====================
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://patrickshao.site:8000';

const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.params || config.data);
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 (正确版本)
api.interceptors.response.use(
  (response: AxiosResponse) => {
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.url}`, response.data);
    }
    return response;
  },
  (error: AxiosError<ErrorResponse> | unknown) => {  // ✅ 修复：泛型参数是 response.data 的类型
    // ✅ 使用 axios.isAxiosError 进行类型守卫
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data;
      
      // ✅ 现在可以安全访问 detail 和 message
      let errorMessage = '网络请求失败';
      if (errorData?.detail && Array.isArray(errorData.detail) && errorData.detail.length > 0) {
        errorMessage = errorData.detail[0].msg;
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // HTTP 状态码处理
      switch (error.response?.status) {
        case 401:
          console.error('认证失败，请重新登录');
          // window.location.href = '/login';
          break;
        case 403:
          console.error('权限不足，无法访问此资源');
          break;
        case 404:
          console.error('请求的资源不存在');
          break;
        case 500:
          console.error('服务器内部错误，请稍后重试');
          break;
        case 422:
          console.error('请求参数验证失败');
          break;
        default:
          console.error(`请求失败 (${error.response?.status}):`, errorMessage);
      }
      
      return Promise.reject(new Error(errorMessage));
    }
    
    // 处理非 Axios 错误
    return Promise.reject(new Error('未知错误发生'));
  }
);

// ==================== API 函数 ====================

/**
 * 获取资源列表
 */
export const getResources = async (): Promise<Resource[]> => {
  const response = await api.get<Resource[]>('/v1/resources/');
  return response.data;
};

/**
 * 根据资源ID获取题目集合
 */
export const getQuestions = async (resourceId: string): Promise<QuestionSet> => {
  if (!resourceId) {
    throw new Error('资源ID不能为空');
  }
  const response = await api.get<QuestionSet>(`/question_bank/questions/${resourceId}`);
  return response.data;
};

/**
 * 提交答案并获取评分结果
 */
export const submitAnswers = async (data: SubmitAnswerRequest): Promise<SubmitAnswerResponse> => {
  const response = await api.post<SubmitAnswerResponse>('/question_bank/answers/grade-submit', data);
  console.log('提交答案响应:', response.data);
  return response.data;
};

// ==================== 工具函数 ====================

/**
 * 获取资源类型显示文本
 */
export const getResourceTypeText = (type: string): string => {
  const typeMap: Record<string, string> = {
    'text': '文本',
    'pdf': 'PDF',
    'doc': '文档',
    'video': '视频',
    'audio': '音频',
    'image': '图片'
  };
  return typeMap[type] || type;
};

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * 格式化日期时间
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.toLocaleDateString('zh-CN')} ${date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })}`;
};

export default api;