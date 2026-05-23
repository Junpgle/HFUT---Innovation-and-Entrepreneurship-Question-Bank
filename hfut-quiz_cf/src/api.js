// 🔧 如果在本地调试，用 localhost；上线后改成您的 Workers 域名
const API_BASE = 'https://worker.junpgle.me/api';

const getToken = () => localStorage.getItem('auth_token');

// 请求去重：同一 URL+方法+body 的并发请求只发一次
const inflightRequests = new Map();

function getRequestKey(endpoint, method, body) {
  return `${method}:${endpoint}:${body ? JSON.stringify(body) : ''}`;
}

export const api = {
    async request(endpoint, method = 'GET', body = null) {
        const headers = { 'Content-Type': 'application/json' };
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const safeEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${API_BASE}${safeEndpoint}`;

        // GET 请求去重
        const key = getRequestKey(endpoint, method, body);
        if (method === 'GET' && inflightRequests.has(key)) {
            return inflightRequests.get(key);
        }

        try {
            const promise = (async () => {
                const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });

                if (res.status === 401 && endpoint !== '/login') {
                    this.logout();
                    return null;
                }

                const responseText = await res.text();
                let data;
                try {
                    data = JSON.parse(responseText);
                } catch (e) {
                    if (!res.ok) {
                        throw new Error(`[${res.status}] ${responseText || '服务器路径不存在'}`);
                    }
                    return responseText;
                }

                if (!res.ok) {
                    throw new Error(data.error || `请求失败 (状态码: ${res.status})`);
                }
                return data;
            })();

            if (method === 'GET') {
                inflightRequests.set(key, promise);
                promise.finally(() => inflightRequests.delete(key));
            }

            return await promise;
        } catch (err) {
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
    },

    // ============================
    // ⬇️ 新增：批量接口
    // ============================

    // 批量获取互动数据（替代每题单独调 /thread/:id）
    async batchGetThreads(questionIds) {
        return await this.request('/batch-threads', 'POST', { questionIds });
    },

    // 聚合同步（心跳+进度）
    async syncAll(payload) {
        return await this.request('/sync-all', 'POST', payload);
    },

    // 获取用户进度
    async getUserProgress() {
        return await this.request('/userProgress');
    },

    // 安全同步（备份进度）
    async secureSync(data) {
        return await this.request('/secureSync', 'POST', data);
    },

    // 获取系统配置
    async getSystemConfig(key) {
        return await this.request(`/SystemConfig?key=${key}`);
    },

    // 恢复离线统计
    async recoverOutageStats(history) {
        return await this.request('/recoverOutageStats', 'POST', { history });
    },

    // 获取错题排行榜
    async getWrongQuestionRanking(limit, subject) {
        return await this.request(`/getWrongQuestionRanking?limit=${limit}&subject=${subject}`);
    },

    // 获取/更新/删除评论
    async deleteComment(commentId) {
        return await this.request(`/comments/${commentId}`, 'DELETE');
    },
    async updateComment(commentId, content) {
        return await this.request(`/comments/${commentId}`, 'PUT', { content });
    },

    // 获取/更新/删除解析
    async deleteExplanation(explanationId) {
        return await this.request(`/explanations/${explanationId}`, 'DELETE');
    },
    async updateExplanation(explanationId, content) {
        return await this.request(`/explanations/${explanationId}`, 'PUT', { content });
    },

    // 用户中心
    async getMyComments() {
        return await this.request('/user/comments');
    },
    async getMyExplanations() {
        return await this.request('/user/explanations');
    }
};