<template>
    <div class="chat-container">
        <div class="messages">
            <div
            v-for="(msg, idx) in messages"
            :key="idx"
            :class="['message', msg.role, { failed: msg.status === 'failed' }]"
            >
            <template v-if="msg.status === 'failed'">
                <button 
                    class="el-icon-lx-refresh" 
                    @click="retryMessage(idx)"
                    title="重发"
                ></button>
            </template>
            <div class="bubble">
                <span>{{ msg.content }}</span>
            </div>
            </div>
            <div v-if="loading" class="message ai">
            <div class="bubble loading">AI正在输入...</div>
            </div>
        </div>
        <div class="input-area highlight-input large-input-area">
            <textarea
            v-model="input"
            @keydown.enter="handleEnter"
            placeholder="请输入您的问题"
            rows="4"
            ></textarea>
            <button @click="sendMessage" :disabled="loading || !input.trim()">发送</button>
        </div>
    </div>
</template>

<script>
export default {
    name: 'AiTeacher',
    data() {
        return {
            input: '',
            messages: [],
            loading: false,
        };
    },
    methods: {
        async sendMessage() {
            const content = this.input.trim();
            if (!content || this.loading) return;
            // 添加用户消息
            const userMsg = {
                role: 'user',
                content,
                status: 'success',
            };
            this.messages.push(userMsg);
            this.input = '';
            this.loading = true;
            try {
                // 向后端发送请求
                const res = await this.$axios.post('/api/ai/ask', { question: content });
                // 添加AI回复
                this.messages.push({
                    role: 'ai',
                    content: res.data.answer,
                    status: 'success',
                });
            } catch (e) {
                // 用户消息发送失败
                this.messages[this.messages.length - 1].status = 'failed';
            } finally {
                this.loading = false;
            }
        },
        async retryMessage(idx) {
            const msg = this.messages[idx];
            if (msg.role !== 'user') return;
            this.loading = true;
            try {
                // 重发请求
                const res = await this.$axios.post('/api/ai/ask', { question: msg.content });
                this.messages[idx].status = 'success';
                this.messages.push({
                    role: 'ai',
                    content: res.data.answer,
                    status: 'success',
                });
            } catch (e) {
                // 仍然失败
                this.messages[idx].status = 'failed';
            } finally {
                this.loading = false;
            }
        },
    },
};
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
.retry-btn {
    margin-left: 8px;
    background: #ff9800;
    color: #fff;
    border: none;
    border-radius: 12px;
    padding: 2px 10px;
    cursor: pointer;
    font-size: 13px;
}
.input-area {
    display: flex;
    align-items: center;
    gap: 8px;
}
.input-area textarea {
    flex: 6; /* 增加宽度比例 */
    min-height: 100px; /* 保持固定高度 */
    height: auto; /* 允许内容扩展 */
    resize: none; /* 禁用大小调整 */
    padding: 12px 16px;
    border-radius: 20px;
    border: 1px solid #ccc;
    font-size: 16px;
    box-sizing: border-box;
    overflow-y: auto; /* 允许内容滚动 */
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
}
.input-area button:disabled {
    background: #ccc;
    cursor: not-allowed;
}
.loading {
    color: #888;
    font-style: italic;
}
</style>