// board.js

document.addEventListener("DOMContentLoaded", function () {

    // ⭐ 중요! 서버 주소 변경 (NAS 기본 포트 5000번으로 통신) ⭐
    const SERVER_URL = 'http://yellowneko.iptime.org:5000/api';
    const postListBody = document.getElementById('post-list-body');
    const tabInquiry = document.getElementById('tab-inquiry');
    const tabReview = document.getElementById('tab-review');
    const writePostButton = document.getElementById('write-post-button');
    const postCountInfo = document.getElementById('post-count-info');

    let currentBoardType = 'inquiry'; // 초기값은 1:1 문의

    // 유틸리티 함수: 닉네임 마스킹 (예: 홍길동 -> 홍*동)
    function maskNickname(nickname) {
        if (!nickname) return "비회원";
        if (nickname.length <= 2) return nickname.charAt(0) + '*';
        return nickname.charAt(0) + '*'.repeat(nickname.length - 2) + nickname.slice(-1);
    }

    // 유틸리티 함수: 날짜 포맷팅
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\./g, '-').slice(0, -1);
    }

    // 게시글 목록을 불러오는 핵심 함수
    async function fetchPosts(type = currentBoardType, page = 1) {
        postListBody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-neon-cyan/50 font-tech">데이터 로딩 중...</td></tr>`;

        try {
            const response = await fetch(`${SERVER_URL}/posts?type=${type}&page=${page}&limit=10`);
            if (!response.ok) {
                throw new Error('API 응답 실패');
            }
            const data = await response.json();

            renderPosts(data.posts);
            renderPagination(data.totalPages, data.currentPage);
            updatePostCount(data.totalPosts);

        } catch (error) {
            console.error('게시글 불러오기 오류:', error);
            postListBody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-neon-pink font-bold">게시글 로딩에 실패했습니다. (${error.message})</td></tr>`;
        }
    }

    // 게시글 목록을 HTML로 렌더링
    function renderPosts(posts) {
        postListBody.innerHTML = ''; // 기존 목록 초기화
        if (posts.length === 0) {
            postListBody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-gray-500">등록된 게시글이 없습니다.</td></tr>`;
            return;
        }

        posts.forEach((post, index) => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-neon-cyan/10 transition-colors cursor-pointer';

            // 댓글 수 표시 (문의는 비공개, 후기는 공개)
            const commentInfo = (currentBoardType === 'review' && post.comment_count > 0)
                ? `<span class="text-neon-pink ml-2">(${post.comment_count})</span>`
                : '';

            // 문의 게시글은 제목 앞에 [문의] 태그 추가
            const titlePrefix = (currentBoardType === 'inquiry')
                ? `<span class="text-neon-cyan/70 mr-2">[문의]</span>`
                : '';

            // 작성자 닉네임 마스킹
            const author = maskNickname(post.author_nickname || post.guest_name);

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-tech">${post.id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-base text-white">
                    ${titlePrefix}${post.title} ${commentInfo}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">${author}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-tech text-gray-400">${formatDate(post.created_at)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-tech text-neon-cyan">${post.views}</td>
            `;

            // 나중에 post.id를 이용하여 상세 보기 모달을 열도록 이벤트 리스너 추가 가능
            tr.addEventListener('click', () => {
                alert(`[${post.id}번 게시글] ${post.title} 클릭됨! (상세 보기 기능 구현 예정)`);
            });

            postListBody.appendChild(tr);
        });
    }

    // 페이지네이션 버튼 렌더링
    function renderPagination(totalPages, currentPage) {
        const paginationDiv = document.getElementById('pagination');
        paginationDiv.innerHTML = '';

        const maxButtons = 5; // 화면에 표시할 최대 페이지 버튼 수
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        // 끝 페이지가 5개가 안될 경우 시작 페이지를 조정
        if (endPage - startPage + 1 < maxButtons) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        // 1. 이전 페이지 버튼
        if (currentPage > 1) {
            paginationDiv.appendChild(createPageButton('prev', currentPage - 1));
        }

        // 2. 페이지 번호 버튼
        for (let i = startPage; i <= endPage; i++) {
            paginationDiv.appendChild(createPageButton(i, i, i === currentPage));
        }

        // 3. 다음 페이지 버튼
        if (currentPage < totalPages) {
            paginationDiv.appendChild(createPageButton('next', currentPage + 1));
        }
    }

    // 페이지네이션 버튼 생성 유틸리티
    function createPageButton(text, pageNum, isActive = false) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = `px-3 py-1 rounded transition-all duration-200 ${isActive
                ? 'bg-neon-cyan text-dark font-bold shadow-neon-cyan/50'
                : 'bg-dark/50 text-gray-400 hover:bg-neon-cyan/20 hover:text-neon-cyan border border-neon-cyan/30'
            }`;

        if (text === 'prev' || text === 'next') {
            button.innerHTML = text === 'prev' ? '<i class="fas fa-angle-left"></i>' : '<i class="fas fa-angle-right"></i>';
        }

        button.addEventListener('click', () => fetchPosts(currentBoardType, pageNum));
        return button;
    }

    // 총 게시물 수 업데이트
    function updatePostCount(total) {
        postCountInfo.textContent = `총 ${total}개의 게시물`;
    }

    // 탭 클릭 핸들러
    function handleTabClick(newType, clickedButton) {
        if (newType === currentBoardType) {
            return;
        }

        // 버튼 스타일 업데이트
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active-tab'));
        clickedButton.classList.add('active-tab');

        // 문의 탭 (cyan) / 후기 탭 (pink) 색상으로 border/text 변경
        tabInquiry.classList.remove('text-neon-pink', 'border-neon-pink');
        tabReview.classList.remove('text-neon-cyan', 'border-neon-cyan');

        if (newType === 'inquiry') {
            tabInquiry.classList.add('text-neon-cyan', 'border-neon-cyan');
            tabReview.classList.add('text-gray-500', 'border-neon-pink');
        } else {
            tabReview.classList.add('text-neon-pink', 'border-neon-pink');
            tabInquiry.classList.add('text-gray-500', 'border-neon-cyan');
        }

        currentBoardType = newType;
        fetchPosts(newType);
    }

    // 초기 탭 설정 및 이벤트 리스너
    tabInquiry.addEventListener('click', () => handleTabClick('inquiry', tabInquiry));
    tabReview.addEventListener('click', () => handleTabClick('review', tabReview));

    // 버튼 초기 스타일 설정 (inquiry가 기본이므로 cyan)
    tabInquiry.classList.add('text-neon-cyan', 'border-neon-cyan');
    tabReview.classList.add('text-gray-500', 'border-neon-pink');

    // 게시글 작성 버튼 이벤트 (구현 예정)
    writePostButton.addEventListener('click', () => {
        alert("게시글 작성 모달/페이지 구현 예정입니다.");
    });

    // 페이지 로드 시 문의 게시판을 기본으로 불러옴
    fetchPosts(currentBoardType);
});