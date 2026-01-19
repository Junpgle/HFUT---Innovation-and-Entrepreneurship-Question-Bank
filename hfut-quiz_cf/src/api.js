// 🔧 如果在本地调试，用 localhost；上线后改成您的 Workers 域名
// 💡 调试提示：请确认您的后端 Hono 实例是否使用了 app.basePath('/api')
const API_BASE = 'https://worker.junpgle.me/api';

// 从本地存储获取 Token
const getToken = () => localStorage.getItem('auth_token');

export const api = {
    /**
     * 1. 通用请求函数
     * 增加了 URL 规范化处理和更详细的调试日志
     */
    async request(endpoint, method = 'GET', body = null) {
        const headers = { 'Content-Type': 'application/json' };
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // 确保路径以 / 开头，避免拼接错误
        const safeEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${API_BASE}${safeEndpoint}`;

        try {
            // 调试用：在控制台打印实际发送的请求
            // console.log(`[API Request] ${method} ${url}`, body || '');

            const res = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : null
            });

            if (res.status === 401 && endpoint !== '/login') {
                this.logout();
                return null;
            }

            // 💡 关键修复：先获取文本，防止非 JSON 响应（如 404 "Not Found"）导致 JSON.parse 崩溃
            const responseText = await res.text();

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                // 如果后端返回的是 404 纯文本，此时会抛出包含状态码和文本的错误
                if (!res.ok) {
                    const errorMsg = `[${res.status}] ${responseText || '服务器路径不存在，请检查后端路由定义'}`;
                    throw new Error(errorMsg);
                }
                return responseText;
            }

            if (!res.ok) {
                throw new Error(data.error || `请求失败 (状态码: ${res.status})`);
            }
            return data;
        } catch (err) {
            // 这里的日志能帮助你快速定位 404 到底请求的是哪个 URL
            // console.error('[API Fetch Error]', err.message);
            throw err;
        }
    },

    // 2. 登录
    async login(username, password) {
        const data = await this.request('/login', 'POST', { username, password });
        if (data.token) {
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('user_info', JSON.stringify(data.user));
        }
        return data.user;
    },

    // 3. 注册 (对应后端 /api/register)
    async register(username, password, email) {
        return await this.request('/register', 'POST', { username, password, email });
    },

    // 💡 验证邮箱 (对应后端 /api/verify-email)
    async verifyEmail(email, code) {
        return await this.request('/verify-email', 'POST', { email, code });
    },

    // 4. 登出
    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        // 重定向回首页并清除状态
        window.location.hash = "/";
        window.location.reload();
    },

    // 5. 获取当前用户信息
    getCurrentUser() {
        const userStr = localStorage.getItem('user_info');
        return userStr ? JSON.parse(userStr) : null;
    },

    // ============================
    // ⬇️ 业务接口
    // ============================

    // 获取在线人数
    async getOnlineCount() {
        return await this.request('/onlineCount');
    },

    // 发送心跳
    async sendHeartbeat() {
        return await this.request('/heartbeat', 'POST');
    },

    // 批量提交错题统计
    async batchRecord(results) {
        return await this.request('/batchRecord', 'POST', { results });
    },

    // 获取评论列表
    async getComments(questionId) {
        return await this.request(`/comments?questionId=${questionId}`);
    },

    // 发布评论
    async postComment(questionId, content) {
        return await this.request('/comments', 'POST', { questionId, content });
    },

    // 点赞评论
    async likeComment(commentId) {
        return await this.request(`/comments/${commentId}/like`, 'POST');
    },

    // 获取解析列表
    async getExplanations(questionId) {
        return await this.request(`/explanations?questionId=${questionId}`);
    },

    // 发布解析
    async postExplanation(questionId, content) {
        return await this.request('/explanations', 'POST', { questionId, content });
    },

    // 解析点赞/投赞成票
    async voteExplanation(explanationId) {
        return await this.request(`/explanations/${explanationId}/vote`, 'POST');
    }
};