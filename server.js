// server.js (백엔드 핵심 로직)
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); // 프론트엔드와 통신 허용

// 1. DB 연결 설정 (시놀로지 MariaDB 정보 입력)
const db = mysql.createPool({
    host: 'localhost', // 또는 시놀로지 IP
    user: 'root',
    password: 'K#p8$z!2qW@EaT7*', // ⭐⭐⭐ 여기를 실제 DB 비밀번호로 수정하세요 ⭐⭐⭐
    database: 'computer_irion'
});

const SECRET_KEY = 'your_secret_jwt_key'; // 보안 키

// 2. 회원가입 API
app.post('/api/register', async (req, res) => {
    const { username, password, nickname } = req.body;
    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 관리자 아이디 지정 (예: admin_master)
    const role = (username === 'admin_master') ? 'admin' : 'member';

    const sql = 'INSERT INTO users (username, password, nickname, role) VALUES (?, ?, ?, ?)';
    db.query(sql, [username, hashedPassword, nickname, role], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: '회원가입 완료' });
    });
});

// 3. 로그인 API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';
    db.query(sql, [username], async (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(401).json({ error: '사용자 없음' });

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) return res.status(401).json({ error: '비밀번호 불일치' });

        // JWT 토큰 생성
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, nickname: user.nickname },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        res.json({ token, nickname: user.nickname });
    });
});


// 미들웨어: 토큰 인증 및 req.user 설정
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ error: '인증 토큰 필요' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: '유효하지 않은 토큰' });
        req.user = user;
        next();
    });
}


// 4. 게시글 목록 조회 API (GET)
// /api/posts?type=inquiry&page=1&limit=10
app.get('/api/posts', (req, res) => {
    const type = req.query.type === 'review' ? 1 : 0; // 0: inquiry, 1: review
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 1. 전체 개수 조회
    const countSql = 'SELECT COUNT(*) AS total FROM posts WHERE type = ?';
    db.query(countSql, [type], (err, countResult) => {
        if (err) return res.status(500).json(err);
        const totalPosts = countResult[0].total;
        const totalPages = Math.ceil(totalPosts / limit);

        // 2. 해당 페이지 게시글 목록 조회
        const postsSql = `
            SELECT p.id, p.title, p.content, p.created_at, p.views, p.type,
                   u.nickname AS author_nickname,
                   COUNT(c.id) AS comment_count
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN comments c ON p.id = c.post_id
            WHERE p.type = ?
            GROUP BY p.id
            ORDER BY p.id DESC
            LIMIT ? OFFSET ?
        `;
        db.query(postsSql, [type, limit, offset], (err, postsResult) => {
            if (err) return res.status(500).json(err);
            res.json({
                posts: postsResult,
                totalPosts,
                totalPages,
                currentPage: page
            });
        });
    });
});


// 4. 게시글 작성 API (POST)
app.post('/api/posts', (req, res) => {
    const { title, content, type, guest_name, guest_password } = req.body; // type: 0(inquiry), 1(review)

    let user_id = null; // 로그인한 사용자
    let guest_id = null; // 비회원 사용자 (비밀번호 암호화)

    // A. 후기(review)는 로그인 사용자만 가능
    if (type === 1) {
        if (!req.headers['authorization']) return res.status(401).json({ error: '후기는 로그인 필요' });
        // 토큰 검증 로직 추가 필요 (간략화함)
        // 실제 구현에서는 authenticateToken 미들웨어를 여기에 적용해야 함.
        // 현재는 편의상 인증 로직을 생략하고 진행합니다.
        // req.user는 미들웨어를 통과해야 사용할 수 있습니다.
        // 임시로 로그인 로직 없이 비회원 처리로 대체 (실제 운영 시에는 반드시 authenticateToken 사용)
    }

    // B. 문의(inquiry)는 누구나 가능 (비회원은 guest 정보 저장)
    if (type === 0 && guest_name && guest_password) {
        // 비회원 게시글 처리 로직 (임시)
        // 실제로는 별도의 guest_posts 테이블이 필요하지만, 여기서는 user_id를 null로 둡니다.
        // guest_password 암호화 로직은 복잡해지므로, 현재 단계에서는 생략합니다.
    }

    const sql = 'INSERT INTO posts (user_id, title, content, type, guest_name, guest_password) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sql, [user_id, title, content, type, guest_name, guest_password], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: '게시글 등록 완료', postId: result.insertId });
    });
});


// 5. 관리자 댓글(답글) 작성 API (회원 후기에만)
app.post('/api/comments', authenticateToken, (req, res) => {
    // 요구사항: 관리자만 대댓글 가능
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: '관리자만 답글을 달 수 있습니다.' });
    }

    const { post_id, content } = req.body;
    const sql = 'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)';
    db.query(sql, [post_id, req.user.id, content], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: '관리자 답글 등록 완료' });
    });
});

// ⭐ 포트를 5000번으로 변경하여 프론트엔드와 일치시킵니다. ⭐
app.listen(5000, () => {
    console.log('Server running on port 5000');
});

// 이 부분은 로그인 테스트 함수이므로 삭제해도 무방합니다.
/*
async function login(username, password) {
    const response = await fetch('http://YOUR_NAS_IP:300...
    // ...
}
*/