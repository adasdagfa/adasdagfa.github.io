import sqlite3
from flask import Flask, render_template, request, redirect, url_for
import os
from werkzeug.utils import secure_filename

# 1. 환경 설정
app = Flask(__name__)
# 이미지 업로드를 위한 설정 (실제 서비스에서는 AWS S3 등을 사용해야 합니다)
UPLOAD_FOLDER = 'static/uploads' 
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
DATABASE = 'reviews.db'

# 2. 데이터베이스 초기화 함수
def init_db():
    with app.app_context():
        db = get_db()
        # reviews 테이블 생성: ID, 이름, 내용, 이미지 파일 경로, 작성 시간
        db.execute('''
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                content TEXT NOT NULL,
                image_path TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        db.commit()

# 3. 데이터베이스 연결 함수
def get_db():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row  # 컬럼 이름으로 데이터 접근 가능하게 설정
    return db

# 4. 리뷰 목록 보기 (홈페이지 역할)
@app.route('/reviews')
def review_list():
    db = get_db()
    reviews = db.execute('SELECT * FROM reviews ORDER BY created_at DESC').fetchall()
    db.close()
    
    # 여기서 기존 index.html에 이 리뷰 목록을 보여주는 부분을 추가해야 합니다.
    # 하지만 복잡하니, 일단 reviews.html 이라는 별도 페이지를 보여주겠습니다.
    return render_template('reviews.html', reviews=reviews)

# 5. 리뷰 작성 처리
@app.route('/reviews/write', methods=['GET', 'POST'])
def write_review():
    if request.method == 'POST':
        name = request.form['name']
        content = request.form['content']
        image_path = None
        
        # 이미지 파일 처리
        if 'image' in request.files:
            file = request.files['image']
            if file.filename != '':
                filename = secure_filename(file.filename)
                # 파일 저장 경로: static/uploads/파일명
                image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(image_path)
                image_path = image_path.replace('\\', '/') # 웹 경로 형식으로 변경

        db = get_db()
        db.execute('INSERT INTO reviews (name, content, image_path) VALUES (?, ?, ?)',
                   (name, content, image_path))
        db.commit()
        db.close()
        
        return redirect(url_for('review_list')) # 작성 후 목록으로 이동
    
    # GET 요청 시, 작성 폼 페이지를 보여줌
    return render_template('write_review.html')

# 6. 리뷰 삭제 처리 (관리자용) - 위치 수정 완료!
@app.route('/reviews/delete/<int:review_id>')
def delete_review(review_id):
    # ★★★ 주의: 이 부분이 관리자 권한을 대신합니다. 
    # 실제 서버에서는 로그인 체크 등의 복잡한 절차가 필요합니다. ★★★
    
    db = get_db()
    
    # 해당 ID의 리뷰를 삭제합니다.
    db.execute('DELETE FROM reviews WHERE id = ?', (review_id,))
    db.commit()
    db.close()
    
    # 삭제 후 리뷰 목록 페이지로 돌아갑니다.
    return redirect(url_for('review_list'))


# 7. 서버 시작
if __name__ == '__main__':
    init_db()  # DB 초기화
    # 디버그 모드로 실행하여 코드 수정 시 자동 재시작
    app.run(debug=True)

# (server.py 파일에 추가)
@app.route('/')
def home():
    # 기본 주소(http://...com/)로 접속하면 후기 목록 페이지로 바로 이동시킵니다.
    return redirect(url_for('review_list'))