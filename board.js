// board.js

document.addEventListener("DOMContentLoaded", function () {

    // ⭐ 중요! 서버 주소 변경 (NAS 기본 포트 5000번으로 통신) ⭐
    const SERVER_URL = 'http://yellowneko.iptime.org:5000/api';
    const postListBody = document.getElementById('post-list-body');
    const tabInquiry = document.getElementById('tab-inquiry');
    const tabReview = document.getElementById('tab-review');
    const writePostButton = document.getElementById('write-post-button');
    const postCountInfo = document.getElementById('post-count-info');

    // 1. 모달 관련 DOM 요소
    const writeModal = document.getElementById('write-modal');
    const closeModalButton = document.getElementById('close-modal-button');
    const postForm = document.getElementById('post-form');
    const modalTitle = document.getElementById('modal-title');
    const postTypeInput = document.getElementById('post-type-input');
    const guestFields = document.getElementById('guest-fields');
    const guestNameInput = document.getElementById('guest-name');
    const guestPasswordInput = document.getElementById('guest-password');
    const requiredGuestFields = [guestNameInput, guestPasswordInput];


    let currentBoardType = 'inquiry'; // 초기값은 1:1 문의
    // ⭐ ⭐ ⭐ 현재 로그인 상태를 가정합니다. ⭐ ⭐ ⭐
    // 실제 로그인 기능 구현 시 이 변수의 값을 변경해야 합니다.
    let isUserLoggedIn = false;

    // ----------------------------------------------------
    // 유틸리티 함수
    // ----------------------------------------------------

    // 닉네임 마스킹 (예: 홍길동 -> 홍*동)
    function maskNickname(nickname) {
        if (!nickname) return "비회원";
        if (nickname.length <= 2) return nickname.charAt(0) + '*';
        return nickname.charAt(0) + '*'.repeat(nickname.length - 2) + nickname.slice(-1);
    }

    // 날짜 포맷팅
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\./g, '-').slice(0, -1);
    }

    // ----------------------------------------------------
    // 모달 제어 함수 (로직 수정)
    // ----------------------------------------------------

    function openModal() {
        const isReview = currentBoardType === 'review';

        // 1. 후기 게시판 (회원 전용) 로직
        if (isReview && !isUserLoggedIn) {
            alert("고객 후기는 회원만 작성할 수 있습니다. 먼저 로그인하거나 회원가입을 해주세요. (회원가입/로그인 기능 구현 예정)");
            return;
        }

        // 2. 문의 게시판 (회원/비회원 모두 가능) 로직
        if (currentBoardType === 'inquiry') {
            modalTitle.textContent = '1:1 문의 작성';
            postTypeInput.value = 0; // 문의: 0

            // 로그인 상태가 아닐 경우에만 비회원 필드 표시
            if (!isUserLoggedIn) {
                guestFields.classList.remove('hidden');
                requiredGuestFields.forEach(input => input.setAttribute('required', 'required'));
            } else {
                guestFields.classList.add('hidden');
                requiredGuestFields.forEach(input => input.removeAttribute('required'));
            }
        } else { // review (isReview && isUserLoggedIn이 true인 경우만 실행됨)
            modalTitle.textContent = '고객 후기 작성';
            postTypeInput.value = 1; // 후기: 1
            guestFields.classList.add('hidden'); // 후기는 회원 작성 시 비회원 필드 숨김
            requiredGuestFields.forEach(input => input.removeAttribute('required'));
        }

        // 모달 열기 애니메이션
        writeModal.classList.remove('hidden');
        setTimeout(() => {
            writeModal.style.opacity = '1';
            writeModal.querySelector('.max-w-2xl').style.transform = 'translateY(0)';
            writeModal.querySelector('.max-w-2xl').style.scale = '1';
        }, 10);
    }

    function closeModal() {
        // 모달 닫기 애니메이션
        writeModal.style.opacity = '0';
        writeModal.querySelector('.max-w-2xl').style.transform = 'translateY(40px)';
        writeModal.querySelector('.max-w-2xl').style.scale = '0.95';

        setTimeout(() => {
            writeModal.classList.add('hidden');
            postForm.reset(); // 폼 초기화
        }, 300);
    }

    // ----------------------------------------------------
    // 게시글 목록 및 페이징 함수 (이전 코드와 동일)
    // ----------------------------------------------------

    async function fetchPosts(type = currentBoardType, page = 1) {
        postListBody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-neon-cyan/50 font-tech">데이터 로딩 중...</td></tr>`;

        try {
            const typeValue = type === 'review' ? 1 : 0; // 'review' -> 1, 'inquiry' -> 0
            const response = await fetch(`${SERVER_URL}/posts?type=${typeValue}&page=${page}&limit=10`);
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

    function renderPosts(posts) {
        postListBody.innerHTML = '';
        if (posts.length === 0) {
            postListBody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-gray-500">등록된 게시글이 없습니다.</td></tr>`;
            return;
        }

        posts.forEach((post) => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-neon-cyan/10 transition-colors cursor-pointer';

            const commentInfo = (post.comment_count > 0)
                ? `<span class="text-neon-pink ml-2">(${post.comment_count})</span>`
                : '';

            const titlePrefix = (currentBoardType === 'inquiry')
                ? `<span class="text-neon-cyan/70 mr-2">[문의]</span>`
                : '';

            // 회원 작성 시 author_nickname, 비회원 작성 시 guest_name 사용
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

            tr.addEventListener('click', () => {
                alert(`[${post.id}번 게시글] ${post.title} 클릭됨! (상세 보기 기능 구현 예정)`);
            });

            postListBody.appendChild(tr);
        });
    }

    function renderPagination(totalPages, currentPage) {
        const paginationDiv = document.getElementById('pagination');
        paginationDiv.innerHTML = '';

        const maxButtons = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        if (endPage - startPage + 1 < maxButtons) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        if (currentPage > 1) {
            paginationDiv.appendChild(createPageButton('prev', currentPage - 1));
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationDiv.appendChild(createPageButton(i, i, i === currentPage));
        }

        if (currentPage < totalPages) {
            paginationDiv.appendChild(createPageButton('next', currentPage + 1));
        }
    }

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

    function updatePostCount(total) {
        postCountInfo.textContent = `총 ${total}개의 게시물`;
    }

    function handleTabClick(newType, clickedButton) {
        if (newType === currentBoardType) {
            return;
        }

        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active-tab'));
        clickedButton.classList.add('active-tab');

        tabInquiry.classList.remove('text-neon-pink', 'border-neon-pink', 'text-gray-500', 'border-neon-cyan');
        tabReview.classList.remove('text-neon-pink', 'border-neon-pink', 'text-gray-500', 'border-neon-cyan');

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

    // ----------------------------------------------------
    // 게시글 작성 API 호출 함수 (수정)
    // ----------------------------------------------------

    async function createPost(postData) {
        const submitButton = document.getElementById('submit-post-button');
        submitButton.disabled = true;
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-sync fa-spin mr-2"></i> 전송 중...';

        // 💡 로그인 상태일 경우 guest_name, guest_password 제거
        if (isUserLoggedIn) {
            delete postData.guest_name;
            delete postData.guest_password;
            // TODO: 실제 토큰을 사용하여 postData.user_id를 서버에 전달해야 합니다.
        } else {
            // 비회원 작성 시, 닉네임과 비밀번호가 없으면 서버에서 거부될 수 있으므로 클라이언트에서 한번 더 체크
            if (postData.type === 0 && (!postData.guest_name || !postData.guest_password)) {
                alert("비회원 문의 작성 시 닉네임과 비밀번호는 필수입니다.");
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
                return;
            }
        }

        try {
            const response = await fetch(`${SERVER_URL}/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // TODO: 회원 작성 시 'Authorization' 헤더에 토큰 추가 필요
                },
                body: JSON.stringify(postData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || '게시글 작성에 실패했습니다.');
            }

            alert("게시글이 성공적으로 등록되었습니다!");
            closeModal();
            fetchPosts(currentBoardType, 1); // 첫 페이지로 이동하여 새로고침

        } catch (error) {
            console.error('게시글 작성 오류:', error);
            alert(`오류: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    }


    // ----------------------------------------------------
    // 이벤트 리스너
    // ----------------------------------------------------

    // 초기 탭 설정 및 이벤트 리스너
    tabInquiry.addEventListener('click', () => handleTabClick('inquiry', tabInquiry));
    tabReview.addEventListener('click', () => handleTabClick('review', tabReview));

    // 버튼 초기 스타일 설정 (inquiry가 기본이므로 cyan)
    tabInquiry.classList.add('text-neon-cyan', 'border-neon-cyan');
    tabReview.classList.add('text-gray-500', 'border-neon-pink');

    // 게시글 작성 버튼 이벤트
    writePostButton.addEventListener('click', openModal);

    // 모달 닫기 버튼 및 배경 클릭 이벤트
    closeModalButton.addEventListener('click', closeModal);
    writeModal.addEventListener('click', (e) => {
        if (e.target.id === 'write-modal') {
            closeModal();
        }
    });

    // 폼 제출 이벤트
    postForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const postData = Object.fromEntries(formData.entries());

        // type을 정수로 변환
        postData.type = parseInt(postData.type);

        // 서버로 데이터 전송
        createPost(postData);
    });


    // 페이지 로드 시 문의 게시판을 기본으로 불러옴
    fetchPosts(currentBoardType);
});