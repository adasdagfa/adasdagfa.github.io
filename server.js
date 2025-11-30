const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

// .env 파일에서 환경 변수 로드 (Node.js 환경에 따라 작동하지 않을 수 있음)
// const dotenv = require('dotenv');
// dotenv.config();

// 1. 설정
// PORT가 환경 변수로 설정되어 있지 않으면 8000을 사용합니다.
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret_key_needs_to_be_long'; // 실제 서비스에서는 강력한 비밀 키를 사용해야 합니다.
const DB_HOST = process.env.DB_HOST || 'localhost'; // NAS 내부 DB 주소
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'your_db_password';
const DB_DATABASE = process.env.DB_DATABASE || 'your_database_name';

const app = express();

// 2. 미들웨어 설정
app.use(cors()); // 모든 도메인에서의 접속을 허용합니다. (테스트 환경용)
app.use(express.json()); // JSON 형식의 본문(body)을 파싱합니다.
app.use(express.urlencoded({ extended: true })); // URL 인코딩된 본문을 파싱합니다.

// ⭐ 정적 파일 제공 미들웨어 ⭐
// 클라이언트가 index.html, script.js, style.css 등을 요청할 때 현재 폴더의 파일들을 찾아서 제공합니다.
// __dirname은 현재 server.js 파일이 위치한 디렉토리를 가리킵니다.
app.use(express.static(path.join(__dirname)));


// 3. 데이터베이스 연결 풀 설정
let pool;

async function initializeDatabase() {
    try {
        pool = mysql.createPool({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_DATABASE,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // 사용자 테이블 생성 (없다면)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                nickname VARCHAR(255) UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 게시판 테이블 생성 (없다면)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                type ENUM('inquiry', 'review') NOT NULL,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                nickname VARCHAR(255) NOT NULL,
                password VARCHAR(255), -- 비회원용 비밀번호
                is_secret BOOLEAN DEFAULT FALSE,
                view_count INT DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        console.log("Database connection pool and tables initialized successfully.");
    } catch (error) {
        console.error("Database initialization failed:", error);
        // 서버 시작을 중단할 수도 있습니다.
    }
}

// 4. JWT 미들웨어
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // 토큰 없음

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("JWT Verification failed:", err);
            return res.sendStatus(403); // 토큰 유효하지 않음
        }
        req.user = user;
        next();
    });
}


// 5. 라우트 정의

// ⭐ 루트 경로 ('/') 요청 처리 ⭐
// 사용자가 http://192.168.0.30:8000/ 로 접속했을 때 index.html을 전송합니다.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// 5-1. 인증 (회원가입, 로그인) 라우트
app.post('/api/register', async (req, res) => {
    const { username, password, nickname } = req.body;
    if (!username || !password || !nickname) {
        return res.status(400).json({ message: "모든 필드를 입력해야 합니다." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            "INSERT INTO users (username, password, nickname) VALUES (?, ?, ?)",
            [username, hashedPassword, nickname]
        );
        res.status(201).json({ message: "회원가입 성공. 로그인해주세요." });
    } catch (error) {
        console.error("Registration error:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: "이미 사용 중인 아이디 또는 닉네임입니다." });
        }
        res.status(500).json({ message: "서버 오류로 회원가입에 실패했습니다." });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "아이디와 비밀번호를 입력해주세요." });
    }

    try {
        const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ message: "아이디를 찾을 수 없습니다." });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ message: "비밀번호가 일치하지 않습니다." });
        }

        // JWT 토큰 생성
        const token = jwt.sign(
            { id: user.id, username: user.username, nickname: user.nickname },
            JWT_SECRET,
            { expiresIn: '1d' } // 1일 유효
        );

        res.json({ token, nickname: user.nickname, message: "로그인 성공" });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "서버 오류로 로그인에 실패했습니다." });
    }
});


// 5-2. 게시판 라우트

// 게시물 목록 조회
app.get('/api/posts', async (req, res) => {
    const { type = 'inquiry', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    try {
        // 총 개수 조회
        const [countRows] = await pool.query("SELECT COUNT(*) as total FROM posts WHERE type = ?", [type]);
        const totalPosts = countRows[0].total;
        const totalPages = Math.ceil(totalPosts / limit);

        // 게시물 목록 조회
        const [posts] = await pool.query(
            "SELECT id, type, title, nickname, view_count, created_at, is_secret FROM posts WHERE type = ? ORDER BY id DESC LIMIT ? OFFSET ?",
            [type, parseInt(limit), parseInt(offset)]
        );

        // 비밀글 처리 (user_id가 null이면 비회원)
        const postsResponse = posts.map(post => {
            if (post.is_secret && post.nickname !== req.user?.nickname) {
                return {
                    id: post.id,
                    type: post.type,
                    title: '🔒 비밀글입니다.',
                    nickname: post.nickname,
                    view_count: post.view_count,
                    created_at: post.created_at,
                    is_secret: post.is_secret
                };
            }
            return post;
        });

        res.json({
            posts: postsResponse,
            total: totalPosts,
            totalPages: totalPages,
            currentPage: parseInt(page)
        });

    } catch (error) {
        console.error("Fetch posts error:", error);
        res.status(500).json({ message: "게시물을 불러오는 데 실패했습니다." });
    }
});

// 게시물 상세 조회
app.get('/api/posts/:id', async (req, res) => {
    const postId = req.params.id;

    try {
        // 조회수 증가
        await pool.query("UPDATE posts SET view_count = view_count + 1 WHERE id = ?", [postId]);

        // 게시물 상세 정보 조회
        const [rows] = await pool.query("SELECT * FROM posts WHERE id = ?", [postId]);
        const post = rows[0];

        if (!post) {
            return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
        }

        // 비밀글 및 권한 체크 (간단 버전)
        if (post.is_secret) {
            // 이 부분은 클라이언트에서 인증 처리를 하므로, 서버는 일단 전체 내용을 전달 (보안 강화 필요)
            // 실제 환경에서는 JWT를 활용하여 본인 여부를 체크해야 합니다.
            // 여기서는 단순화하여 클라이언트 로직에 맡깁니다.
        }

        res.json(post);
    } catch (error) {
        console.error("Fetch post detail error:", error);
        res.status(500).json({ message: "게시물 상세 정보를 불러오는 데 실패했습니다." });
    }
});

// 게시물 작성
app.post('/api/posts', authenticateToken, async (req, res) => {
    const { type, title, content, is_secret } = req.body;
    const user_id = req.user.id;
    const nickname = req.user.nickname;

    if (!type || !title || !content) {
        return res.status(400).json({ message: "필수 항목을 모두 입력해야 합니다." });
    }

    try {
        await pool.query(
            "INSERT INTO posts (user_id, type, title, content, nickname, is_secret) VALUES (?, ?, ?, ?, ?, ?)",
            [user_id, type, title, content, nickname, is_secret || false]
        );
        res.status(201).json({ message: "게시물이 성공적으로 작성되었습니다." });
    } catch (error) {
        console.error("Post creation error:", error);
        res.status(500).json({ message: "게시물 작성에 실패했습니다." });
    }
});

// 게시물 삭제 (비회원용 포함 - 단순화된 로직)
app.delete('/api/posts/:id', async (req, res) => {
    const postId = req.params.id;
    const { password } = req.body; // 비회원 비밀번호 (선택적)
    const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];

    try {
        const [rows] = await pool.query("SELECT * FROM posts WHERE id = ?", [postId]);
        const post = rows[0];

        if (!post) {
            return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
        }

        // 1. 회원 게시물 삭제
        if (token && post.user_id) {
            const user = jwt.verify(token, JWT_SECRET);
            if (user.id !== post.user_id) {
                return res.status(403).json({ message: "삭제 권한이 없습니다." });
            }
        }
        // 2. 비회원 게시물 삭제
        else if (!post.user_id && post.password) {
            const match = await bcrypt.compare(password, post.password);
            if (!match) {
                return res.status(403).json({ message: "비밀번호가 일치하지 않습니다." });
            }
        } else {
            // 회원인데 토큰이 없거나, 비회원인데 비밀번호가 없는 경우
            return res.status(403).json({ message: "삭제 권한이 없거나 인증 정보가 부족합니다." });
        }

        await pool.query("DELETE FROM posts WHERE id = ?", [postId]);
        res.json({ message: "게시물이 성공적으로 삭제되었습니다." });

    } catch (error) {
        console.error("Delete post error:", error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ message: "유효하지 않은 토큰입니다." });
        }
        res.status(500).json({ message: "게시물 삭제에 실패했습니다." });
    }
});


// 6. 서버 시작
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("Failed to start server due to database error:", err);
});