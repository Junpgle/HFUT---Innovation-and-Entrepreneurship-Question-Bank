-- ==========================================
-- 1. 基础用户与配置
-- ==========================================

-- 用户表
DROP TABLE IF EXISTS Users;
CREATE TABLE Users (
                       id INTEGER PRIMARY KEY AUTOINCREMENT,
                       username TEXT UNIQUE NOT NULL,
                       email TEXT,
                       password_hash TEXT NOT NULL,
                       email_verified INTEGER DEFAULT 0, -- 0:未验证, 1:已验证
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统配置表 (对应 SystemConfig，用于版本检查)
DROP TABLE IF EXISTS SystemConfig;
CREATE TABLE SystemConfig (
                              key TEXT PRIMARY KEY,   -- 例如 "app_version"
                              value TEXT,             -- 例如 "3.5.6"
                              changelog TEXT,         -- 更新日志
                              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 在线状态表 (对应 UserPresence)
DROP TABLE IF EXISTS UserPresence;
CREATE TABLE UserPresence (
                              user_id INTEGER PRIMARY KEY,
                              last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. 刷题核心数据
-- ==========================================

-- 错题统计表 (对应 WrongQuestionStats)
-- 记录全站的题目数据
DROP TABLE IF EXISTS QuestionStats;
CREATE TABLE QuestionStats (
                               question_id TEXT PRIMARY KEY, -- 例如 "L1-5"
                               question_title TEXT,
                               category TEXT,
                               error_count INTEGER DEFAULT 0,
                               total_attempts INTEGER DEFAULT 0,
                               option_stats TEXT -- 存 JSON 字符串 {"A":10, "B":5}
);

-- 用户个人进度表 (对应 UserProgress)
-- 技巧：为了兼容前端逻辑，ID数组直接存 JSON 字符串
DROP TABLE IF EXISTS UserProgress;
CREATE TABLE UserProgress (
                              user_id INTEGER PRIMARY KEY,
                              brushed_ids TEXT,    -- JSON Array "[...]"
                              wrong_ids TEXT,      -- JSON Array
                              mastered_ids TEXT,   -- JSON Array
                              memorized_ids TEXT,  -- JSON Array
                              history TEXT,        -- JSON Array (最近历史)
                              patched_v2 INTEGER DEFAULT 0, -- 故障补录标记 (0或1)
                              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. 社交互动 (评论与解析)
-- ==========================================

-- 题目评论表 (对应 QuestionComment)
DROP TABLE IF EXISTS Comments;
CREATE TABLE Comments (
                          id INTEGER PRIMARY KEY AUTOINCREMENT,
                          question_id TEXT NOT NULL,
                          user_id INTEGER NOT NULL,
                          content TEXT NOT NULL,
                          likes INTEGER DEFAULT 0,
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 索引：为了快速加载某道题的评论
CREATE INDEX IF NOT EXISTS idx_comments_qid ON Comments(question_id);

-- 评论点赞记录表 (对应 CommentLike)
-- 用于判断“我是否赞过这条评论”
DROP TABLE IF EXISTS CommentLikes;
CREATE TABLE CommentLikes (
                              user_id INTEGER NOT NULL,
                              comment_id INTEGER NOT NULL,
                              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                              PRIMARY KEY (user_id, comment_id) -- 联合主键，防止重复点赞
);

-- 用户解析表 (对应 UserExplanation)
DROP TABLE IF EXISTS Explanations;
CREATE TABLE Explanations (
                              id INTEGER PRIMARY KEY AUTOINCREMENT,
                              question_id TEXT NOT NULL,
                              user_id INTEGER NOT NULL,
                              content TEXT NOT NULL,
                              votes INTEGER DEFAULT 0, -- 点赞数
                              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_explanations_qid ON Explanations(question_id);

-- 解析点赞记录表 (对应 ExplanationLike)
DROP TABLE IF EXISTS ExplanationLikes;
CREATE TABLE ExplanationLikes (
                                  user_id INTEGER NOT NULL,
                                  explanation_id INTEGER NOT NULL,
                                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                  PRIMARY KEY (user_id, explanation_id)
);