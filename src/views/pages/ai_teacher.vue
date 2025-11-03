<template>
    <div class="chat-container">
        <div class="messages">
            <div
                v-for="(msg, idx) in messages"
                :key="idx"
                :class="['message', msg.role, { 
                    failed: msg.status === 'failed',
                    streaming: msg.status === 'streaming' 
                }]"
            >
                <template v-if="msg.status === 'failed'">
                    <button 
                        class="el-icon-lx-refresh retry-btn" 
                        @click="retryMessage(idx)"
                        title="重发"
                    >↻</button>
                </template>
                <div class="bubble">
                    <!-- 流式消息显示加载动画 -->
                    <span v-if="msg.status === 'streaming'" class="streaming-indicator">●</span>
                    <span>{{ msg.content }}</span>
                </div>
            </div>
            <div v-if="loading && !isStreaming" class="message ai">
                <div class="bubble loading">AI正在思考...</div>
            </div>
        </div>
        <div class="input-area highlight-input large-input-area">
            <textarea
                v-model="input"
                @keydown="handleEnter"
                placeholder="请输入您的问题"
                rows="4"
            ></textarea>
            <button @click="sendMessage" :disabled="loading || !input.trim()">
                {{ loading ? (isStreaming ? 'AI正在输入...' : '发送中...') : '发送' }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue'

// 定义类型
interface ChatMessage {
    role: 'user' | 'ai'
    content: string
    status: 'success' | 'failed' | 'streaming' | 'loading'
    timestamp?: number
}

interface StreamChatRequest {
    session_id: string
    message: string
    context: Record<string, any>
}

interface ErrorResponse {
    detail: Array<{
        loc: (string | number)[]
        msg: string
        type: string
    }>
}

// 响应式数据
const input = ref<string>('')
const messages = ref<ChatMessage[]>([])
const loading = ref<boolean>(false)
const sessionId = ref<string>('')
const userId = ref<string>('')
const isStreaming = ref<boolean>(false)
const currentStreamIndex = ref<number>(-1) // 当前流式消息的索引
const abortController = ref<AbortController | null>(null)

// 计算属性
const isStreamingActive = computed(() => 
    currentStreamIndex.value >= 0 && 
    messages.value[currentStreamIndex.value]?.status === 'streaming'
)

// 存储工具函数
const storage = {
    set<T>(key: string, value: T): void {
        if (typeof value === 'object') {
            localStorage.setItem(key, JSON.stringify(value))
        } else {
            localStorage.setItem(key, String(value))
        }
    },
    
    get<T>(key: string): T | null {
        const value = localStorage.getItem(key)
        if (!value) return null
        try {
            return JSON.parse(value) as T
        } catch (e) {
            return value as T
        }
    },
    
    remove(key: string): void {
        localStorage.removeItem(key)
    }
}

// 生成或获取用户ID
const getOrCreateUserId = (): string => {
    let existingId = storage.get<string>('ai_chat_user_id')
    if (!existingId) {
        // 生成唯一用户ID
        existingId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        storage.set('ai_chat_user_id', existingId)
    }
    return existingId
}

// 生成或获取会话ID
const getOrCreateSessionId = async (): Promise<string> => {
    let existingId = storage.get<string>('ai_chat_session_id')
    
    if (existingId) {
        return existingId
    }
    
    try {
        // 调用后端接口创建新会话
        const response = await fetch('http://patrickshao.site:8000/api/v1/chat/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
        })
        console.log("后端会话id："+ response)
        
        if (!response.ok) {
            throw new Error(`创建会话失败: ${response.status}`)
        }
        
        const data = await response.json()
        const newSessionId = data.session_id
        
        // 保存到本地存储
        storage.set('ai_chat_session_id', newSessionId)
        return newSessionId
    } catch (error) {
        console.error('创建会话失败:', error)
        // 如果后端创建失败，使用本地生成的会话ID作为fallback
        //const fallbackId = 'local_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        //storage.set('ai_chat_session_id', fallbackId)
        return '' // 返回空字符串表示失败
    }
}

// 加载历史消息
const loadHistoryMessages = (): void => {
    const history = storage.get<ChatMessage[]>(`chat_history_${sessionId.value}`)
    if (history && Array.isArray(history)) {
        messages.value = history
    }
}

// 保存消息到历史记录
const saveMessagesToHistory = (): void => {
    storage.set(`chat_history_${sessionId.value}`, messages.value)
}

// 流式发送消息
const sendStreamMessage = async (): Promise<void> => {
    const content = input.value.trim()
    if (!content || loading.value) return
    
    // 添加用户消息
    const userMsg: ChatMessage = {
        role: 'user',
        content,
        status: 'success',
        timestamp: Date.now()
    }
    messages.value.push(userMsg)
    input.value = ''
    loading.value = true
    isStreaming.value = true
    
    // 预先添加一个空的AI消息，用于逐步填充内容
    messages.value.push({
        role: 'ai',
        content: '', // 初始为空
        status: 'streaming',
        timestamp: Date.now()
    })
    
    currentStreamIndex.value = messages.value.length - 1
    
    try {
        // 构建请求数据
        const requestData: StreamChatRequest = {
            session_id: sessionId.value,
            message: content,
            context: {} // 根据您的需求可以传递上下文信息
        }
        
        // 创建AbortController以便可以取消请求
        abortController.value = new AbortController()
        
        // 发送流式请求
        const response = await fetch('http://patrickshao.site:8000/api/v1/chat/message-stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream', // 重要：接受流式响应
            },
            body: JSON.stringify(requestData),
            signal: abortController.value.signal
        })
        console.log(response)

        if (!response.ok) {
            throw new Error(`请求失败: ${response.status}`)
        }

        if (!response.body) {
            throw new Error('响应体为空')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        try {
            while (true) {
                const { done, value } = await reader.read()
                
                if (done) {
                    // 流结束
                    if (currentStreamIndex.value >= 0) {
                        messages.value[currentStreamIndex.value].status = 'success'
                        currentStreamIndex.value = -1
                        loading.value = false
                        isStreaming.value = false
                        
                        // 保存到历史记录
                        saveMessagesToHistory()
                    }
                    break
                }

                // 解码并处理数据块
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || '' // 最后一个可能是不完整的行

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = line.slice(6) // 移除 'data: ' 前缀
                            if (data === '[DONE]') {
                                // 流结束标记
                                if (currentStreamIndex.value >= 0) {
                                    messages.value[currentStreamIndex.value].status = 'success'
                                    currentStreamIndex.value = -1
                                    loading.value = false
                                    isStreaming.value = false
                                    saveMessagesToHistory()
                                }
                                return
                            }
                            
                            // 处理流式数据块
                            if (currentStreamIndex.value >= 0) {
                                messages.value[currentStreamIndex.value].content += data
                            }
                        } catch (e) {
                            console.warn('解析流数据失败:', e, line)
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock()
        }
        
    } catch (error: any) {
        console.error('发送消息失败:', error)
        
        // 用户消息发送失败
        const lastMsgIndex = messages.value.length - 1
        if (lastMsgIndex >= 0) {
            if (currentStreamIndex.value >= 0) {
                // 流式消息失败
                messages.value[currentStreamIndex.value].status = 'failed'
                messages.value[currentStreamIndex.value].content += `\n[错误: ${error.message || '未知错误'}]`
                currentStreamIndex.value = -1
            } else {
                // 普通消息失败
                messages.value[lastMsgIndex].status = 'failed'
            }
            saveMessagesToHistory()
        }
        
        // 显示错误信息
        if (error.name !== 'AbortError') {
            // 如果不是用户取消的请求，显示错误
            console.error('发送消息失败:', error)
        }
    } finally {
        if (abortController.value) {
            abortController.value = null
        }
        loading.value = false
        isStreaming.value = false
    }
}

// 取消当前流式请求
const cancelStream = (): void => {
    if (abortController.value) {
        abortController.value.abort()
        abortController.value = null
    }
    if (currentStreamIndex.value >= 0) {
        messages.value[currentStreamIndex.value].status = 'success' // 或 'failed'，根据需求
        currentStreamIndex.value = -1
    }
    loading.value = false
    isStreaming.value = false
}

// 发送消息 - 使用流式接口
const sendMessage = async (): Promise<void> => {
    // 如果正在流式传输，取消当前请求
    if (isStreaming.value) {
        cancelStream()
        return
    }
    
    await sendStreamMessage()
}

// 重试消息
const retryMessage = async (idx: number): Promise<void> => {
    const msg = messages.value[idx]
    if (msg.role !== 'user') return
    
    // 移除该用户消息之后的所有消息（包括AI回复）
    messages.value = messages.value.slice(0, idx + 1)
    input.value = msg.content
    await sendMessage()
}

// 处理Enter键
const handleEnter = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        sendMessage()
    }
}

// 组件挂载时初始化
onMounted(async () => {
    try {
        //storage.remove('ai_chat_session_id')  // 测试期间每次都创建新会话
        // 获取或创建用户ID
        userId.value = getOrCreateUserId()
        
        // 异步获取或创建会话ID
        sessionId.value = await getOrCreateSessionId()
        
        // 加载历史消息
        loadHistoryMessages()
        
        console.log('当前用户ID:', userId.value)
        console.log('当前会话ID:', sessionId.value)
    } catch (error) {
        console.error('初始化失败:', error)
    }
})

// 监听消息变化，自动滚动到底部
const scrollToBottom = (): void => {
    nextTick(() => {
        const messagesContainer = document.querySelector('.messages')
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight
        }
    })
}

// 监听messages变化实现自动滚动
watch(messages, () => {
    scrollToBottom()
}, { deep: true })

</script>

<style scoped>
.chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #f5f5f5;
    padding: 16px;
}
.messages {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 12px;
}
.message {
    display: flex;
    margin-bottom: 10px;
}
.message.user {
    justify-content: flex-end;
}
.message.ai {
    justify-content: flex-start;
}
.bubble {
    max-width: 70%;
    padding: 10px 16px;
    border-radius: 18px;
    font-size: 15px;
    position: relative;
    background: #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    white-space: pre-wrap; /* 保留空白符，包括换行 */
    word-wrap: break-word;
}
.message.user .bubble {
    background: #95ec69;
    color: #222;
    border-bottom-right-radius: 4px;
}
.message.ai .bubble {
    background: #fff;
    color: #222;
    border-bottom-left-radius: 4px;
}
.message.failed .bubble {
    background: #ffeaea;
    color: #d93025;
    border: 1px solid #d93025;
}
.message.streaming .bubble {
    border-left: 3px solid #4caf50;
}
.input-area {
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
}
.input-area textarea {
    flex: 6;
    min-height: 100px;
    height: auto;
    resize: none;
    padding: 12px 16px;
    border-radius: 20px;
    border: 1px solid #ccc;
    font-size: 16px;
    box-sizing: border-box;
    overflow-y: auto;
    line-height: 1.5;
}
.input-area button {
    padding: 8px 18px;
    border-radius: 16px;
    border: none;
    background: #4caf50;
    color: #fff;
    font-size: 15px;
    cursor: pointer;
    transition: background-color 0.3s;
}
.input-area button:disabled {
    background: #ccc;
    cursor: not-allowed;
}
.input-area button:not(:disabled):hover {
    background: #45a049;
}
/* 当正在流式传输时，按钮样式变化 */
.input-area button:disabled:not(.loading) {
    background: #ff9800; /* 橙色表示可取消 */
}
.loading {
    color: #888;
    font-style: italic;
}

/* 重试按钮样式 */
.retry-btn {
    margin-right: 8px;
    background: #ff9800;
    color: #fff;
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.retry-btn:hover {
    background: #f57c00;
}

/* 流式指示器样式 */
.streaming-indicator {
    display: inline-block;
    animation: pulse 1.5s infinite;
    margin-right: 4px;
    color: #4caf50;
}

@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
}

/* 响应式设计 */
@media (max-width: 768px) {
    .chat-container {
        padding: 10px;
    }
    
    .bubble {
        max-width: 85%;
    }
    
    .input-area {
        flex-direction: column;
        align-items: stretch;
    }
    
    .input-area textarea {
        margin-bottom: 10px;
    }
    
    .input-area button {
        align-self: flex-end;
        width: 100px;
    }
}
</style>