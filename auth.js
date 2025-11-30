// auth.js
document.addEventListener("DOMContentLoaded", function () {
    // ⭐ 수정됨: 포트 8000으로 변경 ⭐
    const SERVER_URL = 'http://192.168.0.30:8000/api'; // ⚠️ 필요 시 이 IP를 실제 NAS 내부 IP로 수정하세요.

    // 1. DOM 요소
    const authModal = document.getElementById('auth-modal');
    const closeModalButton = document.getElementById('close-auth-modal');
    const topNavAuthTrigger = document.getElementById('top-nav-auth-trigger');
    const sideNavAuthTrigger = document.getElementById('side-nav-auth-trigger');

    const authTabLogin = document.getElementById('auth-tab-login');
    const authTabRegister = document.getElementById('auth-tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const modalTitle = document.getElementById('auth-modal-title');

    // 2. 상태 관리
    let isUserLoggedIn = !!localStorage.getItem('authToken');
    let currentNickname = localStorage.getItem('userNickname') || '회원';


    // ----------------------------------------------------
    // 모달 및 탭 제어
    // ----------------------------------------------------

    function openAuthModal(isRegisterMode = false) {
        // 모달 열기 애니메이션
        authModal.classList.remove('hidden');
        setTimeout(() => {
            authModal.style.opacity = '1';
            const modalContent = authModal.querySelector('.max-w-md');
            if (modalContent) {
                modalContent.style.transform = 'translateY(0)';
                modalContent.style.scale = '1';
            }
        }, 10);

        if (isRegisterMode) {
            switchToRegisterTab();
        } else {
            switchToLoginTab();
        }
    }

    function closeAuthModal() {
        // 모달 닫기 애니메이션
        authModal.style.opacity = '0';
        const modalContent = authModal.querySelector('.max-w-md');
        if (modalContent) {
            modalContent.style.transform = 'translateY(40px)';
            modalContent.style.scale = '0.95';
        }

        setTimeout(() => {
            authModal.classList.add('hidden');
            loginForm.reset();
            registerForm.reset();
        }, 300);
    }

    function switchToLoginTab() {
        modalTitle.textContent = '로그인';
        authTabLogin.classList.replace('text-gray-500', 'text-neon-pink');
        authTabLogin.classList.replace('border-gray-700', 'border-neon-pink');
        authTabLogin.classList.add('font-bold');
        authTabRegister.classList.replace('text-neon-pink', 'text-gray-500');
        authTabRegister.classList.replace('border-neon-pink', 'border-gray-700');
        authTabRegister.classList.remove('font-bold');

        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    }

    function switchToRegisterTab() {
        modalTitle.textContent = '회원가입';
        authTabRegister.classList.replace('text-gray-500', 'text-neon-pink');
        authTabRegister.classList.replace('border-gray-700', 'border-neon-pink');
        authTabRegister.classList.add('font-bold');
        authTabLogin.classList.replace('text-neon-pink', 'text-gray-500');
        authTabLogin.classList.replace('border-neon-pink', 'border-gray-700');
        authTabLogin.classList.remove('font-bold');

        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    }

    // ----------------------------------------------------
    // 네비게이션 업데이트
    // ----------------------------------------------------

    // 리스너를 정리하는 함수 (중복 등록 방지)
    function clearAuthListeners(element) {
        element.removeEventListener('click', handleAuthTriggerClick);
        element.removeEventListener('click', handleLogout);
    }

    function updateNavigatonStatus() {
        clearAuthListeners(topNavAuthTrigger);
        clearAuthListeners(sideNavAuthTrigger);

        if (isUserLoggedIn) {
            // 로그인 상태: "OOO님 | 로그아웃" 표시
            topNavAuthTrigger.textContent = `${currentNickname}님 | 로그아웃`;
            topNavAuthTrigger.classList.remove('text-neon-pink');
            topNavAuthTrigger.classList.add('text-neon-cyan');
            topNavAuthTrigger.addEventListener('click', handleLogout);

            sideNavAuthTrigger.textContent = `${currentNickname}님 (로그아웃)`;
            sideNavAuthTrigger.classList.remove('text-white', 'border-white/50');
            sideNavAuthTrigger.classList.add('text-neon-cyan', 'border-neon-cyan/50');
            sideNavAuthTrigger.addEventListener('click', handleLogout);

        } else {
            // 로그아웃 상태: "로그인 / 회원가입" 표시
            topNavAuthTrigger.textContent = '로그인 / 회원가입';
            topNavAuthTrigger.classList.remove('text-neon-cyan');
            topNavAuthTrigger.classList.add('text-neon-pink');
            topNavAuthTrigger.addEventListener('click', handleAuthTriggerClick);

            sideNavAuthTrigger.textContent = '로그인 / 회원가입';
            sideNavAuthTrigger.classList.remove('text-neon-cyan', 'border-neon-cyan/50');
            sideNavAuthTrigger.classList.add('text-white', 'border-white/50');
            sideNavAuthTrigger.addEventListener('click', handleAuthTriggerClick);
        }
    }

    // ----------------------------------------------------
    // 인증 API 통신
    // ----------------------------------------------------

    async function handleRegister(e) {
        e.preventDefault();
        const button = document.getElementById('register-submit-button');
        button.disabled = true;
        button.textContent = '처리 중...';

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        if (data.password.length < 6) {
            alert('비밀번호는 6자 이상이어야 합니다.');
            button.disabled = false;
            button.textContent = '회원가입 완료';
            return;
        }

        try {
            const response = await fetch(`${SERVER_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                // 백엔드에서 에러 메시지를 보낸 경우
                throw new Error(result.error || '회원가입에 실패했습니다.');
            }

            alert(`'${data.username}'님, 회원가입이 완료되었습니다! 로그인해 주세요.`);
            closeAuthModal();
            // 가입 후 바로 로그인 탭으로 전환
            openAuthModal(false);

        } catch (error) {
            console.error('회원가입 오류:', error);
            alert(`회원가입 오류: ${error.message}`);
        } finally {
            button.disabled = false;
            button.textContent = '회원가입 완료';
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        const button = document.getElementById('login-submit-button');
        button.disabled = true;
        button.textContent = '로그인 중...';

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(`${SERVER_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || '로그인에 실패했습니다. 아이디 또는 비밀번호를 확인해 주세요.');
            }

            // 토큰과 닉네임 저장
            localStorage.setItem('authToken', result.token);
            localStorage.setItem('userNickname', result.nickname);

            isUserLoggedIn = true;
            currentNickname = result.nickname;

            alert(`${currentNickname}님, 환영합니다!`);
            closeAuthModal();
            updateNavigatonStatus();
            // 게시판 페이지가 열려 있다면 새로고침
            if (window.location.pathname.endsWith('board.html')) {
                window.location.reload();
            }

        } catch (error) {
            console.error('로그인 오류:', error);
            alert(`로그인 오류: ${error.message}`);
        } finally {
            button.disabled = false;
            button.textContent = '로그인';
        }
    }

    function handleLogout(e) {
        e.preventDefault();

        if (confirm("로그아웃 하시겠습니까?")) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userNickname');
            isUserLoggedIn = false;
            currentNickname = '회원';

            alert("로그아웃되었습니다.");
            updateNavigatonStatus();
            // 게시판 페이지가 열려 있다면 새로고침
            if (window.location.pathname.endsWith('board.html')) {
                window.location.reload();
            }
        }
    }

    function handleAuthTriggerClick(e) {
        e.preventDefault();
        // 로그인/회원가입 버튼 클릭 시 모달 열기
        openAuthModal(false);
    }

    // ----------------------------------------------------
    // 초기화 및 이벤트 리스너
    // ----------------------------------------------------

    // 초기 네비게이션 상태 설정
    updateNavigatonStatus();

    // 모달 닫기
    closeModalButton.addEventListener('click', closeAuthModal);
    authModal.addEventListener('click', (e) => {
        if (e.target.id === 'auth-modal') {
            closeAuthModal();
        }
    });

    // 탭 전환
    authTabLogin.addEventListener('click', switchToLoginTab);
    authTabRegister.addEventListener('click', switchToRegisterTab);

    // 폼 제출
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
});