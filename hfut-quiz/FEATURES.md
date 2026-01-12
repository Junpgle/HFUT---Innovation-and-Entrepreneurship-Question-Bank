# New Features Implementation

This document describes the three new features added to the HFUT Innovation and Entrepreneurship Quiz application.

## Features

### 1. Site-wide Wrong Question Ranking (全站易错题排行榜)

Shows a leaderboard of the most frequently incorrect questions across all users.

**Implementation:**
- Tracks every wrong answer via `recordWrongAnswer` cloud function
- Stores statistics in `WrongQuestionStats` LeanCloud class
- Displays top 20 most frequently incorrect questions
- Shows error count, category, and error rate for each question

**How to access:**
- Click the "易错题排行" (Wrong Question Ranking) card on the dashboard
- Orange gradient card with trending up icon

### 2. User-contributed Explanations (用户共建解析)

Allows users to contribute explanations for questions that don't have them.

**Implementation:**
- When a question has no explanation (显示 "暂无解析")
- Users can click "贡献解析" (Contribute Explanation) button
- Submit their explanation which is stored in `UserExplanation` class
- Other users can view and vote on contributed explanations

**How to use:**
1. Answer a question that shows "暂无解析"
2. Click "贡献解析" button below the explanation section
3. Write your explanation in the text area
4. Click "提交解析" to submit

### 3. Comment Section (评论区)

Enables users to discuss questions that have explanations.

**Implementation:**
- Comments stored in `QuestionComment` LeanCloud class
- Only visible for questions with valid explanations
- Users can post comments and view others' comments
- Comments show author username and timestamp

**How to use:**
1. Answer a question that has an explanation
2. Find the "评论区" section below the explanation
3. Click "展开" to expand the comment section
4. Type your comment and click "发表评论" to post

## Backend Setup Required

For these features to work, you need to set up the following in LeanCloud:

### Data Classes:

1. **WrongQuestionStats**
   - questionId (String)
   - questionTitle (String)
   - category (String)
   - errorCount (Number)
   - totalAttempts (Number)

2. **QuestionComment**
   - questionId (String)
   - content (String)
   - author (Pointer to _User)
   - likes (Number)

3. **UserExplanation**
   - questionId (String)
   - content (String)
   - author (Pointer to _User)
   - votes (Number)

### Cloud Functions:

1. **recordWrongAnswer(questionId, questionTitle, category)**
   - Records when a user answers incorrectly
   - Updates or creates WrongQuestionStats entry

2. **getWrongQuestionRanking(limit)**
   - Returns top N most frequently incorrect questions
   - Calculates error rates

See `LEANCLOUD_SETUP.md` for detailed setup instructions in Chinese.

## Technical Details

**Files Modified:**
- `src/App.jsx`: Main application logic

**New Icons Added:**
- TrendingUp: For ranking feature
- MessageSquare: For comments
- ThumbsUp: For likes
- Send: For submit buttons
- Edit3: For edit/contribute actions
- Award: For user contributions

**New State Variables:**
- `wrongQuestionRanking`: Array of ranking data
- `questionComments`: Object mapping questionId to comments
- `userExplanations`: Object mapping questionId to user explanations
- `showComments`: Boolean to toggle comment visibility
- `showExplanationForm`: Boolean to toggle explanation form
- `newComment`: String for comment input
- `newExplanation`: String for explanation input

**New Functions:**
- `submitWrongAnswerStats()`: Submits wrong answer to backend
- `loadWrongQuestionRanking()`: Loads ranking data
- `loadQuestionComments()`: Loads comments for a question
- `submitComment()`: Posts a new comment
- `loadUserExplanations()`: Loads user-contributed explanations
- `submitUserExplanation()`: Submits a new explanation
- `renderRankingPage()`: Renders the ranking page UI

## Security Considerations

1. **WrongQuestionStats**: Should only be writable by cloud functions to prevent data manipulation
2. **Comment Moderation**: Consider adding content filtering or moderation
3. **Rate Limiting**: Cloud functions should have rate limits to prevent abuse
4. **ACL Permissions**: Properly configured to allow read access but restrict write access

## Future Enhancements

Possible improvements for these features:

1. Add upvote/downvote functionality for comments and explanations
2. Add reporting mechanism for inappropriate content
3. Show user's personal ranking in wrong questions
4. Add search and filter options for the ranking page
5. Allow users to bookmark questions from the ranking
6. Add pagination for comments when there are many
7. Show trending/hot discussions
8. Add notification when someone comments on a question you've interacted with
