// board.js

document.addEventListener("DOMContentLoaded", function () {

    // ⭐ 중요! index.js와 동일한 서버 주소 사용 ⭐
    // ✅ 서버 주소 변경 (NAS 기본 포트 5000번으로 통신)
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

    // 게시글 목록을 불러와서 테이블에 렌더링
    async function fetchPosts(type) {
        postListBody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-neon-cyan">데이터를 불러오는 중...</td></tr>';

        try {
            const response = await fetch(`${SERVER_URL}/posts/${type}`);
            if (!response.ok) {
                throw new Error('게시글 로드 실패');
            }
            const posts = await response.json();

            // 총 게시물 수 업데이트
            postCountInfo.textContent = `총 ${posts.length}건의 게시물이 있습니다.`;

            if (posts.length === 0) {
                postListBody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-gray-500">게시물이 없습니다.</td></tr>';
                return;
            }

            postListBody.innerHTML = ''; // 기존 목록 제거

            posts.forEach((post, index) => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-neon-cyan/10 cursor-pointer';

                // 작성자 결정 (회원 닉네임 또는 비회원 이름)
                const writer = post.nickname
                    ? maskNickname(post.nickname)
                    : maskNickname(post.guest_name) || '비회원';

                row.innerHTML = `
                    <td class="px-6 py-3 whitespace-nowrap">${posts.length - index}</td>
                    <td class="px-6 py-3 whitespace-nowrap font-bold text-white">
                        <span class="${post.type === 'inquiry' ? 'text-neon-cyan' : 'text-neon-pink'}">[${post.type === 'inquiry' ? '문의' : '후기'}]</span>
                        ${post.title}
                    </td>
                    <td class="px-6 py-3 whitespace-nowrap">${writer}</td>
                    <td class="px-6 py-3 whitespace-nowrap">${formatDate(post.created_at)}</td>
                    <td class="px-6 py-3 whitespace-nowrap">${post.views}</td>
                `;
                // ⭐ 추후: 클릭 시 상세 페이지로 이동하는 이벤트 리스너 추가 예정 ⭐
                row.addEventListener('click', () => {
                    alert(`[${post.title}] 게시글을 클릭했습니다. 상세 페이지는 다음 단계에서 구현됩니다.`);
                    // window.location.href = `post_detail.html?id=${post.id}`;
                });

                postListBody.appendChild(row);
            });

        } catch (error) {
            console.error("Fetch posts error:", error);
            postListBody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-red-500">데이터 로드 중 오류가 발생했습니다. 서버를 확인해주세요.</td></tr>';
        }
    }

    // 탭 전환 핸들러
    function handleTabClick(newType, clickedButton) {
        if (currentBoardType === newType) return; // 같은 탭 클릭 시 무시

        // Review 탭 클릭 시 회원 로그인 확인
        if (newType === 'review' && !localStorage.getItem('token')) {
            alert("후기는 회원 전용입니다. 로그인 후 이용해주세요.");
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

    // 글쓰기 버튼 이벤트 (추후 모달 창으로 교체)
    writePostButton.addEventListener('click', () => {
        // ⭐ 추후: 글쓰기 모달을 띄우는 함수로 대체 예정 ⭐
        alert("글쓰기 기능은 다음 단계에서 구현됩니다.");
    });

    // 페이지 로드 시 초기 게시판 불러오기
    fetchPosts(currentBoardType);
});