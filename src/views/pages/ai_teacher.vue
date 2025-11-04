<template>
    <div class="chat-layout">
        <!-- 侧边栏 -->
        <div class="sidebar">
            <div class="sidebar-header">
                <h3>聊天会话</h3>
                <button class="new-session-btn" @click="createNewSession">
                    <span>+ 新会话</span>
                </button>
            </div>
            
            <div class="sessions-list">
                <div 
                    v-for="session in sessions" 
                    :key="session.id"
                    :class="['session-item', { active: currentSessionId === session.id }]"
                    @click="selectSession(session.id)"
                >
                    <div class="session-title">
                        {{ session.title || '新会话' }}
                    </div>
                    <div class="session-meta">
                        <span class="session-time">{{ formatSessionTime(session.updated_at) }}</span>
                        <button class="delete-session-btn" @click.stop="deleteSession(session.id)" title="删除会话">
                            ×
                        </button>
                    </div>
                </div>
                
                <div v-if="sessions.length === 0" class="no-sessions">
                    <p>还没有会话，创建一个新的开始聊天吧！</p>
                </div>
            </div>
        </div>

        <!-- 主聊天区域 -->
        <div class="chat-container">
            <div class="chat-header">
                <h3>{{ currentSessionTitle }}</h3>
                <div class="session-info">
                    <span v-if="!currentSessionId">新会话 - 输入第一条消息后创建</span>
                </div>
            </div>

            <div class="messages" ref="messagesContainer">
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
                        <span v-html="formatMessageContent(msg.content)"></span>
                    </div>
                    <div class="timestamp">{{ formatTime(msg.timestamp) }}</div>
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
                <button 
                    @click="sendMessage" 
                    :disabled="loading || !input.trim()"
                >
                    {{ loading ? (isStreaming ? 'AI正在输入...' : '发送中...') : '发送' }}
                </button>
                <button 
                    v-if="isStreaming" 
                    @click="cancelStream" 
                    class="cancel-btn"
                >
                    停止
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue'
import { 
    sendStreamMessage as apiSendStreamMessage,
    createChatSession,
    getChatSession,
    deleteChatSession,
    getUserSessions,
    type SendMessageParams,
    type ChatSession,
    type SessionListItem
} from '@/api/chat'

// 定义类型
interface ChatMessage {
    role: 'user' | 'ai'
    content: string
    status: 'success' | 'failed' | 'streaming' | 'loading'
    timestamp?: number
}

interface UserInfo {
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

// 响应式数据
const input = ref<string>('')
const messages = ref<ChatMessage[]>([])
const loading = ref<boolean>(false)
const currentSessionId = ref<string>('') // 空字符串表示新会话
const userId = ref<string>('')
const isStreaming = ref<boolean>(false)
const sessions = ref<SessionListItem[]>([])
const abortController = ref<{ abort: () => void } | null>(null)
const messagesContainer = ref<HTMLElement>()

// 计算属性
const currentSessionTitle = computed(() => {
    if (!currentSessionId.value) {
        return '新会话'
    }
    const session = sessions.value.find(s => s.id === currentSessionId.value)
    return session?.title || '新会话'
})

// 从localStorage获取用户信息
const getUserInfoFromStorage = (): UserInfo | null => {
    try {
        const userInfoStr = localStorage.getItem('user_info')
        if (userInfoStr) {
            return JSON.parse(userInfoStr) as UserInfo
        }
    } catch (error) {
        console.error('解析用户信息失败:', error)
    }
    return null
}

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

// 加载用户会话列表
const loadUserSessions = async (): Promise<void> => {
    try {
        const userInfo = getUserInfoFromStorage()
        if (!userInfo || !userInfo.id) {
            console.error('未找到用户信息')
            return
        }
        
        userId.value = userInfo.id
        const response = await getUserSessions(userId.value)
        
        if (response.sessions) {
            sessions.value = response.sessions
            if (sessions.value.length > 0 && !currentSessionId.value) {
                // 选择最新的会话
                currentSessionId.value = sessions.value[0].id
                await loadSessionMessages(currentSessionId.value)
            }
        }
    } catch (error) {
        console.error('加载会话列表失败:', error)
    }
}

// 加载会话消息
const loadSessionMessages = async (sessionId: string): Promise<void> => {
    try {
        const response = await getChatSession(sessionId)
        if (response.messages) {
            // 转换后端消息格式到前端格式
            messages.value = response.messages.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'ai',
                content: msg.content,
                status: 'success' as const,
                timestamp: new Date(msg.timestamp).getTime()
            }))
            scrollToBottom()
        }
    } catch (error) {
        console.error('加载消息失败:', error)
    }
}

// 创建新会话（仅重置状态，不发送请求）
const createNewSession = (): void => {
    if (isStreaming.value) {
        cancelStream()
    }
    
    // 重置为新建会话状态
    currentSessionId.value = ''
    messages.value = []
    input.value = ''
}

// 实际创建会话的API调用
const createSessionApi = async (): Promise<string> => {
    const userInfo = getUserInfoFromStorage()
    if (!userInfo || !userInfo.id) {
        throw new Error('未找到用户信息')
    }

    const response = await createChatSession(userInfo.id)
    if (response.session_id) {
        return response.session_id
    } else {
        throw new Error('创建会话失败')
    }
}

// 选择会话
const selectSession = async (sessionId: string): Promise<void> => {
    if (isStreaming.value) {
        cancelStream()
    }
    
    currentSessionId.value = sessionId
    await loadSessionMessages(sessionId)
}

// 删除会话
const deleteSession = async (sessionId: string): Promise<void> => {
    if (confirm('确定要删除这个会话吗？')) {
        try {
            await deleteChatSession(sessionId)
            sessions.value = sessions.value.filter(s => s.id !== sessionId)
            
            if (currentSessionId.value === sessionId) {
                if (sessions.value.length > 0) {
                    currentSessionId.value = sessions.value[0].id
                    await loadSessionMessages(currentSessionId.value)
                } else {
                    // 没有会话了，重置为新会话状态
                    currentSessionId.value = ''
                    messages.value = []
                }
            }
        } catch (error) {
            console.error('删除会话失败:', error)
        }
    }
}

// 流式发送消息
const sendMessage = async (): Promise<void> => {
    const content = input.value.trim()
    if (!content || loading.value) return
    
    const userInfo = getUserInfoFromStorage()
    if (!userInfo || !userInfo.id) {
        console.error('未找到用户信息')
        return
    }

    // 如果是新会话，先创建会话
    let targetSessionId = currentSessionId.value
    if (!targetSessionId) {
        try {
            loading.value = true
            targetSessionId = await createSessionApi()
            currentSessionId.value = targetSessionId
            
            // 创建新的会话项并添加到列表
            const newSession: SessionListItem = {
                id: targetSessionId,
                title: content.length > 20 ? content.substring(0, 20) + '...' : content,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
            sessions.value.unshift(newSession)
        } catch (error) {
            console.error('创建会话失败:', error)
            loading.value = false
            return
        } finally {
            loading.value = false
        }
    }

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
        content: '',
        status: 'streaming',
        timestamp: Date.now()
    })
    
    const aiMessageIndex = messages.value.length - 1
    scrollToBottom()

    try {
        const params: SendMessageParams = {
            session_id: targetSessionId,
            message: content,
            user_id: userInfo.id,
            context: {}
        }

        abortController.value = await apiSendStreamMessage(params, {
            onMessage: (content: string) => {
    const currentContent = messages.value[aiMessageIndex].content;
    
    // 添加调试日志
    console.log('收到数据块:', {
        新块长度: content.length,
        新块前20字符: content.substring(0, 20) + '...',
        当前内容长度: currentContent.length,
        当前内容结尾: currentContent.substring(Math.max(0, currentContent.length - 20)),
        是否包含: currentContent.includes(content)
    });
    
    // if (!currentContent.includes(content)) {
        messages.value[aiMessageIndex].content += content;
        messages.value[aiMessageIndex].timestamp = Date.now();
        scrollToBottom();
    // } else {
    //     console.log('跳过重复内容');
    // }
            },
            onError: (error) => {
                console.error('流式消息错误:', error)
                messages.value[aiMessageIndex].status = 'failed'
                messages.value[aiMessageIndex].content += `\n[错误: ${error.message || '未知错误'}]`
                loading.value = false
                isStreaming.value = false
            },
            onComplete: () => {
                messages.value[aiMessageIndex].status = 'success'
                loading.value = false
                isStreaming.value = false
                
                // 如果是第一条消息，更新会话标题
                if (messages.value.length === 2) { // 用户消息 + AI消息
                    updateSessionTitle(content)
                }
                
                // 刷新会话列表以获取最新更新时间
                loadUserSessions()
            }
        })
        
    } catch (error) {
        console.error('发送消息失败:', error)
        messages.value[aiMessageIndex].status = 'failed'
        messages.value[aiMessageIndex].content = '发送消息失败，请检查网络连接。'
        loading.value = false
        isStreaming.value = false
    }
}

// 更新会话标题
const updateSessionTitle = (firstMessage: string): void => {
    const session = sessions.value.find(s => s.id === currentSessionId.value)
    if (session) {
        // 截取前20个字符作为标题
        session.title = firstMessage.length > 20 
            ? firstMessage.substring(0, 20) + '...' 
            : firstMessage
    }
}

// 取消当前流式请求
const cancelStream = (): void => {
    if (abortController.value) {
        abortController.value.abort()
        abortController.value = null
    }
    loading.value = false
    isStreaming.value = false
    
    // 将当前流式消息状态改为成功
    const streamingMessage = messages.value.find(msg => msg.status === 'streaming')
    if (streamingMessage) {
        streamingMessage.status = 'success'
    }
}

// 重试消息
const retryMessage = async (idx: number): Promise<void> => {
    const msg = messages.value[idx]
    if (msg.role !== 'user') return
    
    // 移除该用户消息之后的所有消息（包括AI回复）
    messages.value = messages.value.slice(0, idx)
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

// 格式化消息内容（支持简单的Markdown）
const formatMessageContent = (content: string): string => {
    // 简单的换行处理
    return content
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
}

// 格式化时间
const formatTime = (timestamp?: number): string => {
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
    })
}

// 格式化会话时间
const formatSessionTime = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
        return '今天'
    } else if (days === 1) {
        return '昨天'
    } else if (days < 7) {
        return `${days}天前`
    } else {
        return date.toLocaleDateString('zh-CN')
    }
}

// 组件挂载时初始化
onMounted(async () => {
    await loadUserSessions()
})

// 滚动到底部
const scrollToBottom = (): void => {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
    })
}

// 监听messages变化实现自动滚动
watch(messages, () => {
    scrollToBottom()
}, { deep: true })

</script>

<style scoped>
.chat-layout {
    display: flex;
    height: 100%;
    background: #f5f5f5;
}

/* 侧边栏样式 */
.sidebar {
    width: 300px;
    background: white;
    border-right: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
}

.sidebar-header {
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
}

.sidebar-header h3 {
    margin: 0 0 15px 0;
    font-size: 18px;
    color: #333;
}

.new-session-btn {
    width: 100%;
    padding: 10px;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.3s;
}

.new-session-btn:hover {
    background: #45a049;
}

.sessions-list {
    flex: 1;
    overflow-y: auto;
}

.session-item {
    padding: 15px 20px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: background-color 0.3s;
}

.session-item:hover {
    background: #f8f9fa;
}

.session-item.active {
    background: #e3f2fd;
    border-left: 3px solid #2196f3;
}

.session-title {
    font-weight: 500;
    margin-bottom: 5px;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.session-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #666;
}

.delete-session-btn {
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    font-size: 16px;
    padding: 2px 6px;
    border-radius: 50%;
}

.delete-session-btn:hover {
    background: #ffebee;
    color: #f44336;
}

.no-sessions {
    padding: 40px 20px;
    text-align: center;
    color: #999;
}

/* 主聊天区域样式 */
.chat-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: white;
}

.chat-header {
    padding: 15px 20px;
    border-bottom: 1px solid #e0e0e0;
    background: #fafafa;
}

.chat-header h3 {
    margin: 0 0 5px 0;
    color: #333;
}

.session-info {
    font-size: 12px;
    color: #666;
}

.messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: #fafafa;
}
.message {
    display: flex;
    margin-bottom: 15px;
}
.message.user {
    justify-content: flex-end;
}
.message.ai {
    justify-content: flex-start;
}
.bubble {
    max-width: 70%;
    padding: 12px 16px;
    border-radius: 18px;
    font-size: 14px;
    line-height: 1.4;
    position: relative;
    background: #fff;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
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
    border: 1px solid #ffcdd2;
}
.message.streaming .bubble {
    border-left: 3px solid #4caf50;
}

.timestamp {
    font-size: 11px;
    color: #999;
    margin-top: 4px;
    text-align: right;
}
.message.ai .timestamp {
    text-align: left;
}

.input-area {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    padding: 20px;
    background: white;
    border-top: 1px solid #e0e0e0;
}
.input-area textarea {
    flex: 1;
    min-height: 80px;
    height: auto;
    resize: none;
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid #ddd;
    font-size: 14px;
    line-height: 1.5;
}
.input-area textarea:disabled {
    background: #f5f5f5;
    color: #999;
}
.input-area button {
    padding: 10px 20px;
    border-radius: 8px;
    border: none;
    background: #4caf50;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.3s;
    white-space: nowrap;
}
.input-area button:disabled {
    background: #ccc;
    cursor: not-allowed;
}
.input-area button:not(:disabled):hover {
    background: #45a049;
}

.cancel-btn {
    background: #ff9800 !important;
}
.cancel-btn:hover {
    background: #f57c00 !important;
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
    .chat-layout {
        flex-direction: column;
    }
    
    .sidebar {
        width: 100%;
        height: 200px;
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