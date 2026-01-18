// src/api.js

// 🔧 如果在本地调试，用 localhost；上线后改成您的 Workers 域名
const API_BASE = 'http://127.0.0.1:8787/api';

// 从本地存储获取 Token
const getToken = () => localStorage.getItem('auth_token');

export const api = {
    // 1. 通用请求函数
    async request(endpoint, method = 'GET', body = null) {
        const headers = { 'Content-Type': 'application/json' };
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : null
            });

            // 如果 Token 过期 (401)，自动登出
            if (res.status === 401) {
                this.logout();
                return null; // 或者抛出错误
            }

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || '请求失败');
            }
            return data;
        } catch (err) {
            console.error('API Error:', err);
            throw err;
        }
    },

    // 2. 登录
    async login(username, password) {
        const data = await this.request('/login', 'POST', { username, password });
        if (data.token) {
            localStorage.setItem('auth_token', data.token);
            // 存用户信息，方便前端显示名字
            localStorage.setItem('user_info', JSON.stringify(data.user));
        }
        return data.user;
    },

    // 3. 注册
    async register(username, password, email) {
        return await this.request('/register', 'POST', { username, password, email });
    },

    // 4. 登出
    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        // 可选：刷新页面
        window.location.reload();
    },

    // 5. 获取当前用户信息
    getCurrentUser() {
        const userStr = localStorage.getItem('user_info');
        return userStr ? JSON.parse(userStr) : null;
    },

    // ============================
    // ⬇️ 下面是对接您之前功能的接口
    // ============================

    // 获取在线人数
    async getOnlineCount() {
        return await this.request('/onlineCount');
    },

    // 发送心跳
    async sendHeartbeat() {
        return await this.request('/heartbeat', 'POST');
    },

    // 批量提交错题
    async batchRecord(results) {
        return await this.request('/batchRecord', 'POST', { results });
    },

    // 获取某题评论
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

    // 获取某题解析
    async getExplanations(questionId) {
        return await this.request(`/explanations?questionId=${questionId}`);
    },

    // 发布解析
    async postExplanation(questionId, content) {
        return await this.request('/explanations', 'POST', { questionId, content });
    },

    // 点赞解析
    async voteExplanation(explanationId) {
        return await this.request(`/explanations/${explanationId}/vote`, 'POST');
    }
};