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
    // ⚠️ 이곳을 실제 DB 비밀번호로 수정하세요 (이전에 입력하신 값을 유지했습니다)
    password: 'K#p8$z!2qW@EaT7*',
    database: 'computer_irion'
});

const SECRET_KEY = 'your_secret_jwt_key'; // 보안 키

// 2. 인증 토큰 검증 미들웨어
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401); // 토큰 없음

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403); // 토큰 유효하지 않음
        req.user = user;
        next();
    });
}

// 3. 회원가입 API
app.post('/api/register', async (req, res) => {
    const { username, password, nickname } = req.body;

    // A. 사용자 이름 중복 확인
    db.query('SELECT username FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) return res.status(500).json({ error: 'DB 오류' });

        if (results.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // B. 비밀번호 암호화
        const hashedPassword = await bcrypt.hash(password, 10);

        // C. 관리자 아이디 지정 (예: admin_master)
        const role = (username === 'admin_master') ? 'admin' : 'member';

        // D. 사용자 정보 저장
        const sql = 'INSERT INTO users (username, password, nickname, role) VALUES (?, ?, ?, ?)';
        db.query(sql, [username, hashedPassword, nickname, role], (err, result) => {
            if (err) return res.status(500).json({ error: 'DB 저장 오류' });
            res.status(201).json({ message: '회원가입 완료' });
        });
    });
});


// 4. 로그인 API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) return res.status(500).json({ error: 'DB 오류' });
        if (results.length === 0) return res.status(400).json({ error: '아이디 또는 비밀번호 오류' });

        const user = results[0];

        // 비밀번호 비교
        if (await bcrypt.compare(password, user.password)) {
            // JWT 토큰 생성
            const token = jwt.sign(
                { id: user.id, username: user.username, nickname: user.nickname, role: user.role },
                SECRET_KEY,
                { expiresIn: '24h' }
            );
            res.json({ token, nickname: user.nickname });
        } else {
            res.status(400).json({ error: '아이디 또는 비밀번호 오류' });
        }
    });
});


// 5. 게시글 목록 API
app.get('/api/posts', (req, res) => {
    // type: 0(문의), 1(후기)
    const type = req.query.type === 'review' ? 1 : 0;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    // A. 전체 게시글 수 계산 (페이지네이션용)
    const countSql = 'SELECT COUNT(*) AS totalCount FROM posts WHERE type = ?';
    db.query(countSql, [type], (err, countResult) => {
        if (err) return res.status(500).json(err);
        const totalCount = countResult[0].totalCount;
        const totalPages = Math.ceil(totalCount / limit);

        // B. 해당 페이지 게시글 목록 가져오기
        // NOTE: has_comment는 댓글 테이블과 JOIN이 필요하지만, 여기서는 단순화하여 `is_answered` 같은 컬럼이 posts 테이블에 있다고 가정합니다. (현재 DB 설계는 has_comment 필드를 따로 만들지 않았습니다. is_answered 필드를 추가하거나 JOIN으로 구현해야 합니다.)
        // 일단은 더미 데이터로 has_comment를 처리합니다.
        const postsSql = `
            SELECT 
                p.id, p.title, p.content, p.type, 
                p.views, p.created_at, p.guest_name,
                u.nickname,
                (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) > 0 AS has_comment
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.type = ?
            ORDER BY p.id DESC
            LIMIT ? OFFSET ?
        `;

        db.query(postsSql, [type, limit, offset], (err, posts) => {
            if (err) return res.status(500).json(err);
            res.json({ posts, totalCount, totalPages });
        });
    });
});


// 6. 게시글 작성 API
app.post('/api/posts', async (req, res) => {
    const { title, content, type, guest_name, guest_password } = req.body; // type: 0(inquiry), 1(review)

    let user_id = null; // 로그인한 사용자
    let nickname = null;
    let hashedPassword = null;

    // NOTE: 실제 적용 시 authenticateToken 미들웨어 적용 필요 (임시로 바디에서 토큰 검증 정보를 받음)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        try {
            const user = jwt.verify(token, SECRET_KEY);
            user_id = user.id;
            nickname = user.nickname;
        } catch (e) {
            // 토큰이 유효하지 않은 경우 비회원으로 처리
        }
    }


    // A. 후기(review, type=1)는 로그인한 사용자만 가능
    if (type === 1 && !user_id) {
        return res.status(401).json({ error: '후기는 로그인한 사용자만 작성할 수 있습니다.' });
    }

    // B. 비회원인 경우 비밀번호 암호화
    if (!user_id && guest_name && guest_password) {
        hashedPassword = await bcrypt.hash(guest_password, 10);
    }

    // 비회원 작성 시 guest_password가 없으면 오류
    if (!user_id && !hashedPassword) {
        return res.status(400).json({ error: '비회원 작성 시 비밀번호를 입력해야 합니다.' });
    }


    const sql = 'INSERT INTO posts (user_id, title, content, type, guest_name, guest_password) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sql, [user_id, title, content, type, guest_name, hashedPassword], (err, result) => {
        if (err) {
            console.error('게시글 DB 저장 오류:', err);
            return res.status(500).json({ error: '게시글 등록 중 DB 오류 발생' });
        }
        res.status(201).json({ message: '게시글 등록 완료', postId: result.insertId });
    });
});


// 7. 관리자 댓글(답글) 작성 API (회원 후기에만)
app.post('/api/comments', authenticateToken, (req, res) => {
    // 요구사항: 관리자만 대댓글 가능
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: '관리자만 답글 작성이 가능합니다.' });
    }

    const { post_id, content } = req.body;

    const sql = 'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)';
    db.query(sql, [post_id, req.user.id, content], (err, result) => {
        if (err) return res.status(500).json(err);
        res.status(201).json({ message: '답글 등록 완료', commentId: result.insertId });
    });
});


// 8. 서버 시작
const PORT = 8000; // ⭐️ 포트 8000으로 변경 ⭐️
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});