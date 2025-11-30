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
    password: 'YOUR_DB_PASSWORD', // 설정한 DB 비밀번호
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
        if (err) return res.status(500).json({ error: '가입 실패 (아이디 중복 등)' });
        res.json({ message: '가입 성공' });
    });
});

// 3. 로그인 API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, users) => {
        if (err || users.length === 0) return res.status(400).json({ error: '유저 없음' });

        const user = users[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: '비번 불일치' });

        // 토큰 발급 (로그인 증명서)
        const token = jwt.sign({ id: user.id, role: user.role, nickname: user.nickname }, SECRET_KEY);
        res.json({ token, role: user.role, nickname: user.nickname });
    });
});

// 미들웨어: 로그인 여부 확인
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401); // 비로그인

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// 4. 게시글 작성 API (문의: 누구나, 후기: 회원만)
app.post('/api/posts', async (req, res) => {
    const { type, title, content, guest_name, guest_pw } = req.body;
    const authHeader = req.headers['authorization'];

    // A. 후기(review)는 회원만 가능
    if (type === 'review') {
        if (!authHeader) return res.status(401).json({ error: '후기는 로그인 필요' });
        // 토큰 검증 로직 추가 필요 (간략화함)
        // ...
    }

    // B. 문의(inquiry)는 누구나 가능 (비회원은 guest 정보 저장)
    // DB INSERT 로직 ...
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

app.listen(3000, () => {
    console.log('Server running on port 3000');
});

async function login(username, password) {
    const response = await fetch('http://YOUR_NAS_IP:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (data.token) {
        // 토큰을 로컬 스토리지에 저장 (로그인 유지)
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role); // admin 또는 member
        alert(data.nickname + '님 환영합니다!');

        // 화면 갱신 (로그인/회원가입 버튼 숨기기 등)
        updateUI();
    } else {
        alert(data.error);
    }
}