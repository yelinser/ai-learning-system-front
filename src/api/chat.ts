import request from '@/utils/request';

// 聊天消息接口参数
export interface SendMessageParams {
  session_id: string;
  message: string;
  user_id: string;
  context: Record<string, any>;
}

// 流式消息回调函数
export interface StreamMessageCallbacks {
  onMessage: (content: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

// 聊天会话信息
export interface ChatSession {
  session_id: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

// 单个聊天消息
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// 简化的会话列表项
export interface SessionListItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

// 用户会话列表响应
export interface UserSessionsResponse {
  sessions: SessionListItem[];
}

// 创建会话响应
export interface CreateSessionResponse {
  session_id: string;
}

// 删除会话响应
export interface DeleteSessionResponse {
  message: string;
}

// 通用API响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export const sendStreamMessage = async (
  params: SendMessageParams,
  callbacks: StreamMessageCallbacks
): Promise<{ abort: () => void }> => {
  const { user_id, ...data } = params;
  
  const controller = new AbortController();
  const signal = controller.signal;

  try {
    console.log('开始流式请求，数据:', { user_id, ...data });
    
    const response = await fetch(`http://patrickshao.site:8000/api/v1/chat/message-stream?user_id=${user_id}`, {
      method: 'POST',
      headers: {
        'accept': 'text/plain; charset=utf-8', // 明确接受纯文本
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal,
    });

    console.log('响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    if (!response.body) {
      throw new Error('响应体不可读');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let receivedData = '';

    const processStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('流结束，总共接收:', receivedData.length, '字符');
            
            // 处理最后可能剩余的数据
            // if (receivedData.trim()) {
            //   callbacks.onMessage(receivedData);
            //   receivedData = '';
            // }
            
            callbacks.onComplete?.();
            break;
          }

          // 解码数据
          const chunk = decoder.decode(value, { stream: true });
          receivedData += chunk;
          
          console.log('原始数据块:', value, '解码后:', chunk);
          
          // 立即传递每个数据块
          if (chunk.trim()) {
            callbacks.onMessage(chunk);
          }
        }
      } catch (error) {
        console.error('流处理过程错误:', error);
        callbacks.onError?.(error as Error);
      }
    };

    processStream();

  } catch (error) {
    console.error('流式请求初始化错误:', error);
    callbacks.onError?.(error as Error);
  }

  return {
    abort: () => {
      console.log('用户中止请求');
      controller.abort();
    }
  };
};

// 非流式发送消息（如果需要备用方案）
export const sendMessage = (params: SendMessageParams): Promise<ApiResponse<{ content: string }>> => {
  const { user_id, ...data } = params;
  return request({
    url: `/api/v1/chat/message-stream?user_id=${user_id}`,
    method: 'post',
    data,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// 创建新的聊天会话
export const createChatSession = (user_id: string): Promise<CreateSessionResponse> => {
  return request({
    url: `/api/v1/chat/sessions?user_id=${user_id}`,
    method: 'post',
    data: {},
  });
};

// 获取聊天会话详情
export const getChatSession = (session_id: string): Promise<ChatSession> => {
  return request({
    url: `/api/v1/chat/sessions/${session_id}`,
    method: 'get',
  });
};

// 删除聊天会话
export const deleteChatSession = (session_id: string): Promise<DeleteSessionResponse> => {
  return request({
    url: `/api/v1/chat/sessions/${session_id}`,
    method: 'delete',
  });
};

// 获取用户的所有聊天会话列表
export const getUserSessions = (user_id: string): Promise<UserSessionsResponse> => {
  return request({
    url: `/api/v1/chat/user-sessions?user_id=${user_id}`,
    method: 'get',
  });
};