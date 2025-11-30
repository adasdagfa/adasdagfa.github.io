// board.js

document.addEventListener("DOMContentLoaded", function () {

    // ⭐ 수정됨: 포트 8000으로 변경 ⭐
    const SERVER_URL = 'http://192.168.0.30:8000/api'; // ⚠️ 필요 시 이 IP를 실제 NAS 내부 IP로 수정하세요.
    const postListBody = document.getElementById('post-list-body');
    const tabInquiry = document.getElementById('tab-inquiry');
    const tabReview = document.getElementById('tab-review');
    const writePostButton = document.getElementById('write-post-button');
    const postCountInfo = document.getElementById('post-count-info');
    const writeModal = document.getElementById('write-modal');
    const closeWriteModalButton = document.getElementById('close-write-modal');
    const writeForm = document.getElementById('write-form');
    const writePostType = document.getElementById('write-post-type');
    const guestInputGroup = document.getElementById('guest-input-group'); // 비회원 입력 필드

    let currentBoardType = 'inquiry'; // 초기값은 1:1 문의
    let isUserLoggedIn = !!localStorage.getItem('authToken');

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

    // ----------------------------------------------------
    // 게시글 목록 로드
    // ----------------------------------------------------

    async function fetchPosts(type = currentBoardType, page = 1) {
        postListBody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-neon-cyan/50 animate-pulse">게시물을 불러오는 중...</td></tr>';

        try {
            const response = await fetch(`${SERVER_URL}/posts?type=${type}&page=${page}`);
            if (!response.ok) {
                // 서버가 켜져 있어도 DB 문제 등으로 500 오류가 날 수 있음
                throw new Error('게시물 로드에 실패했습니다. (DB/서버 로직 오류)');
            }

            const result = await response.json();

            // 총 개수 정보 업데이트
            postCountInfo.textContent = `총 ${result.totalCount}건`;

            renderPosts(result.posts);
            renderPagination(result.totalPages, page);

        } catch (error) {
            console.error('게시물 로드 오류:', error);
            postListBody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-red-500">게시물 로드 중 오류가 발생했습니다. 서버 상태를 확인하세요.</td></tr>';
        }
    }

    function renderPosts(posts) {
        postListBody.innerHTML = ''; // 기존 목록 초기화

        if (posts.length === 0) {
            postListBody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-gray-500">아직 등록된 게시물이 없습니다.</td></tr>';
            return;
        }

        posts.forEach(post => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-neon-cyan/10 cursor-pointer transition-colors';
            row.innerHTML = `
                <td class="px-6 py-3 font-tech text-neon-pink text-center w-1/12">${post.id}</td>
                <td class="px-6 py-3 text-left w-6/12 flex items-center">
                    <span class="truncate max-w-full">${post.title}</span>
                    ${post.has_comment ? '<span class="ml-2 text-xs font-tech text-neon-cyan border border-neon-cyan rounded-full px-2 py-0.5">답변 완료</span>' : ''}
                </td>
                <td class="px-6 py-3 text-center w-2/12">${maskNickname(post.nickname || post.guest_name)}</td>
                <td class="px-6 py-3 text-center w-2/12">${formatDate(post.created_at)}</td>
                <td class="px-6 py-3 font-tech text-center w-1/12">${post.views}</td>
            `;
            // TODO: 게시글 클릭 이벤트 리스너 추가 (상세 보기 모달)
            // row.addEventListener('click', () => alert(`게시글 ${post.id} 상세 보기`)); 

            postListBody.appendChild(row);
        });
    }

    function renderPagination(totalPages, currentPage) {
        const paginationContainer = document.getElementById('pagination');
        paginationContainer.innerHTML = ''; // 기존 페이지네이션 초기화

        if (totalPages <= 1) return;

        // 페이지 버튼 생성
        for (let i = 1; i <= totalPages; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.className = `px-3 py-1 rounded transition-colors ${i === currentPage ? 'bg-neon-cyan text-black font-bold' : 'text-gray-400 hover:bg-black/50'}`;
            button.addEventListener('click', () => fetchPosts(currentBoardType, i));
            paginationContainer.appendChild(button);
        }
    }

    // ----------------------------------------------------
    // 쓰기 모달 제어
    // ----------------------------------------------------

    function openWriteModal() {
        // 비회원 입력 필드 표시/숨김 설정
        if (isUserLoggedIn) {
            guestInputGroup.classList.add('hidden');
        } else {
            guestInputGroup.classList.remove('hidden');
        }

        // 탭 상태를 모달 내에 반영
        writePostType.value = currentBoardType;

        writeModal.classList.remove('hidden');
        setTimeout(() => {
            writeModal.style.opacity = '1';
            writeModal.querySelector('.max-w-xl').style.transform = 'translateY(0)';
            writeModal.querySelector('.max-w-xl').style.scale = '1';
        }, 10);
    }

    function closeWriteModal() {
        writeModal.style.opacity = '0';
        writeModal.querySelector('.max-w-xl').style.transform = 'translateY(40px)';
        writeModal.querySelector('.max-w-xl').style.scale = '0.95';

        setTimeout(() => {
            writeModal.classList.add('hidden');
            writeForm.reset();
        }, 300);
    }

    async function handlePostSubmit(e) {
        e.preventDefault();
        const button = document.getElementById('submit-post-button');
        button.disabled = true;
        button.textContent = '등록 중...';

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // 비회원일 경우, 닉네임과 비밀번호 유효성 검사
        if (!isUserLoggedIn) {
            if (!data.guest_name || !data.guest_password) {
                alert('비회원 작성 시 이름과 비밀번호를 모두 입력해야 합니다.');
                button.disabled = false;
                button.textContent = '작성 완료';
                return;
            }
        }

        // 인증 토큰 가져오기 (로그인 상태일 경우)
        const authToken = localStorage.getItem('authToken');

        // POST 요청 본문 구성
        const bodyData = {
            title: data.title,
            content: data.content,
            type: data.type === 'inquiry' ? 0 : 1, // 0: 문의, 1: 후기
        };

        if (!isUserLoggedIn) {
            bodyData.guest_name = data.guest_name;
            bodyData.guest_password = data.guest_password; // 평문 비밀번호 전송 (백엔드에서 암호화 처리)
        }


        try {
            const response = await fetch(`${SERVER_URL}/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 로그인 상태일 경우 토큰 추가
                    ...(authToken && { 'Authorization': `Bearer ${authToken}` })
                },
                body: JSON.stringify(bodyData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || '게시글 등록에 실패했습니다.');
            }

            alert('게시글이 성공적으로 등록되었습니다.');
            closeWriteModal();
            fetchPosts(currentBoardType); // 목록 새로고침

        } catch (error) {
            console.error('게시글 등록 오류:', error);
            alert(`게시글 등록 오류: ${error.message}`);
        } finally {
            button.disabled = false;
            button.textContent = '작성 완료';
        }
    }


    // ----------------------------------------------------
    // 초기화 및 이벤트 리스너
    // ----------------------------------------------------

    // 탭 전환 핸들러
    function handleTabClick(newType, clickedButton) {
        if (newType === currentBoardType) {
            return;
        }

        // 버튼 스타일 업데이트
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active-tab'));
        clickedButton.classList.add('active-tab');

        // 문의 탭 (cyan) / 후기 탭 (pink) 색상으로 border/text 변경
        tabInquiry.classList.remove('text-neon-pink', 'border-neon-pink', 'text-gray-500', 'border-neon-cyan');
        tabReview.classList.remove('text-neon-cyan', 'border-neon-cyan', 'text-gray-500', 'border-neon-pink');

        if (newType === 'inquiry') {
            tabInquiry.classList.add('text-neon-cyan', 'border-neon-cyan');
            tabReview.classList.add('text-gray-500', 'border-neon-pink'); // 비활성 탭은 다른 쪽 색상으로 보더 유지
        } else {
            tabReview.classList.add('text-neon-pink', 'border-neon-pink');
            tabInquiry.classList.add('text-gray-500', 'border-neon-cyan'); // 비활성 탭은 다른 쪽 색상으로 보더 유지
        }

        currentBoardType = newType;
        fetchPosts(newType);
    }

    // 초기 탭 설정 및 이벤트 리스너
    tabInquiry.addEventListener('click', () => handleTabClick('inquiry', tabInquiry));
    tabReview.addEventListener('click', () => handleTabClick('review', tabReview));

    // 버튼 초기 스타일 설정 및 게시물 로드
    // 최초에는 inquiry가 활성화된 상태로 시작
    tabInquiry.classList.add('active-tab', 'text-neon-cyan', 'border-neon-cyan');
    tabReview.classList.add('text-gray-500', 'border-neon-pink');
    fetchPosts(currentBoardType);


    // 쓰기 버튼 및 모달 이벤트 리스너
    writePostButton.addEventListener('click', openWriteModal);
    closeWriteModalButton.addEventListener('click', closeWriteModal);
    writeModal.addEventListener('click', (e) => {
        if (e.target.id === 'write-modal') {
            closeWriteModal();
        }
    });

    // 게시글 작성 폼 제출
    writeForm.addEventListener('submit', handlePostSubmit);
});