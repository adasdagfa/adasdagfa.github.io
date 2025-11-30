document.addEventListener("DOMContentLoaded", function () {

    // 1. AOS 애니메이션 초기화 (기존 코드)
    AOS.init({
        duration: 1000,
        once: false,
        mirror: true,
        offset: 100,
    });

    // 2. 커스텀 커서 로직 (모바일에서는 실행되지 않도록 수정)
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');

    // ⭐ 수정: 모바일이 아닌 경우(768px 이상)에만 커스텀 커서 로직 실행 ⭐
    if (cursorDot && cursorOutline && window.innerWidth >= 768) {
        window.addEventListener('mousemove', (e) => {
            const posX = e.clientX;
            const posY = e.clientY;

            cursorDot.style.transform = `translate(${posX}px, ${posY}px)`;

            // 아웃라인은 약간 늦게 따라오도록 지연
            setTimeout(() => {
                cursorOutline.style.transform = `translate(${posX}px, ${posY}px)`;
            }, 80);
        });

        // 링크나 버튼 호버 시 커서 효과 변경
        const hoverElements = document.querySelectorAll('a, button, .cyber-card');
        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursorOutline.style.transform += ' scale(1.5)';
                cursorOutline.style.backgroundColor = 'rgba(0, 243, 255, 0.1)';
                cursorDot.style.backgroundColor = '#ff00ff';
            });
            el.addEventListener('mouseleave', () => {
                // scale(1.5)를 정확하게 제거하여 원래 크기로 돌아가게 함
                if (cursorOutline.style.transform.includes('scale(1.5)')) {
                    cursorOutline.style.transform = cursorOutline.style.transform.replace(' scale(1.5)', '');
                }
                cursorOutline.style.backgroundColor = 'transparent';
                cursorDot.style.backgroundColor = '#00f3ff';
            });
        });
    }

    // 3. 로딩 바 스크립트 및 캐러셀 이미지 복제 로직 (기존 코드 유지)
    const loadingBar = document.getElementById('loading-bar');
    const initialGameImages = document.querySelectorAll('.carousel-track img');
    let totalAssets = initialGameImages.length;
    let loadedAssets = 0;

    function updateLoadingBar() {
        loadedAssets++;
        const progress = (loadedAssets / totalAssets) * 100;
        loadingBar.style.width = progress + '%';

        if (loadedAssets >= totalAssets) {
            setupCarouselTracks();
            setTimeout(() => {
                loadingBar.style.opacity = '0';
                setTimeout(() => {
                    loadingBar.style.display = 'none';
                }, 300);
            }, 500);
        }
    }

    if (loadingBar && totalAssets > 0) {
        loadingBar.style.opacity = '1';
        loadingBar.style.width = '10%';

        initialGameImages.forEach(img => {
            if (img.complete) {
                updateLoadingBar();
            } else {
                img.addEventListener('load', updateLoadingBar);
                img.addEventListener('error', updateLoadingBar);
            }
        });
    }

    function setupCarouselTracks() {
        const carouselTracks = document.querySelectorAll('.carousel-track');

        carouselTracks.forEach(track => {
            const images = Array.from(track.children);
            images.forEach(img => {
                const clone = img.cloneNode(true);
                track.appendChild(clone);
            });
        });

        // 이미지 복제 후 모든 캐러셀 이미지에 모달 이벤트 리스너를 다시 연결
        const allCarouselImgs = document.querySelectorAll(".carousel-track img");
        allCarouselImgs.forEach(img => {
            img.addEventListener('click', function (e) {
                e.preventDefault();
                openModal(this);
            });
        });
    }


    // 5. 네이버 지도 API 연동 (기존 코드 유지)
    var targetLat = 35.719821400;
    var targetLng = 126.744099357;

    if (typeof naver !== 'undefined' && document.getElementById('map')) {
        var mapOptions = {
            center: new naver.maps.LatLng(targetLat, targetLng),
            zoom: 18,
        };

        var map = new naver.maps.Map('map', mapOptions);

        var marker = new naver.maps.Marker({
            position: new naver.maps.LatLng(targetLat, targetLng),
            map: map,
            icon: {
                content: [
                    '<div style="padding:10px; background:rgba(0, 243, 255, 0.2); border:1px solid #00f3ff; border-radius:50%; box-shadow:0 0 10px #00f3ff;">',
                    '<div style="width:10px; height:10px; background:#ff00ff; border-radius:50%;"></div>',
                    '</div>'
                ].join(''),
                size: new naver.maps.Size(30, 30),
                anchor: new naver.maps.Point(15, 15)
            }
        });
    }

    // 6. 이미지 확대 모달 (Lightbox) 기능 (기존 코드 유지)
    const modal = document.getElementById("image-modal");
    const modalImg = document.getElementById("modal-img");
    const modalClose = document.querySelector(".modal-close-btn");

    function openModal(imgElement) {
        modal.classList.remove("hidden");
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);

        modalImg.src = imgElement.src;
        modalImg.style.transform = 'scale(1)';
    }

    function closeModal() {
        modal.style.opacity = '0';
        modalImg.style.transform = 'scale(0.95)';
        setTimeout(() => {
            modal.classList.add("hidden");
        }, 300);
    }

    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }

    if (modal) {
        modal.addEventListener('click', function (event) {
            if (event.target === modal) {
                closeModal();
            }
        });
    }

    // 7. 방문자 카운터: CounterAPI.dev V2 로직 (기존 코드 유지)
    const countElement = document.getElementById('visitor-count-number');

    const YOUR_API_KEY = "ut_v51MEVP3IRZSPHtBOCddgX8Zqk3M3eCqXiW0cxDZ";
    const BASE_ENDPOINT = "https://api.counterapi.dev/v2/s-team-4-1812/컴퓨터-이리온-방문";
    const API_HIT_ENDPOINT = `${BASE_ENDPOINT}/up`;

    if (countElement) {
        function animateCountUp(targetCount) {
            let currentCount = 0;
            const duration = 1500;
            const stepTime = 20;
            const steps = duration / stepTime;
            const increment = Math.max(1, Math.ceil(targetCount / steps));

            const timer = setInterval(() => {
                currentCount += increment;
                if (currentCount >= targetCount) {
                    currentCount = targetCount;
                    clearInterval(timer);
                }
                countElement.textContent = currentCount.toLocaleString();
            }, stepTime);
        }

        const requestOptions = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${YOUR_API_KEY}`
            }
        };

        fetch(API_HIT_ENDPOINT, requestOptions)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(JSON.stringify(err)); });
                }
                return response.json();
            })
            .then(data => {
                if (data && typeof data.count === 'number') {
                    animateCountUp(data.count);
                } else {
                    throw new Error('Invalid response structure from CounterAPI.dev V2');
                }
            })
            .catch(error => {
                console.error('Visitor counter error (CounterAPI.dev V2):', error);
                countElement.textContent = '연결 실패 (API 오류)';
            });
    }

    // 8. 로고 클릭 시 맨 위로 이동 (기존 코드 유지)
    const logoLink = document.getElementById('logo-link');
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // ***************************************************************
    // 9. 사이드 내비게이션 (스크롤 감지 및 부드러운 이동) 로직 추가
    // ***************************************************************

    const sideNavItems = document.querySelectorAll('#side-nav .nav-item');
    // home 섹션을 포함하여 모든 섹션을 가져옵니다.
    const sections = document.querySelectorAll('header[id], section[id]');

    // 활성 상태 스타일을 관리하는 함수
    function activateNavItem(targetId) {
        sideNavItems.forEach(item => {
            const dot = item.querySelector('.nav-dot');
            const text = item.querySelector('.nav-text');

            // 모든 항목의 활성 스타일 제거
            dot.classList.remove('active-pulse');
            dot.classList.remove('bg-neon-cyan', 'border-neon-cyan');
            dot.classList.add('bg-white/20', 'border-white/50');
            text.classList.remove('text-neon-cyan', 'opacity-100');
            text.classList.add('text-white', 'opacity-80');


            // 현재 활성화된 항목에 스타일 추가
            if (item.getAttribute('data-target') === targetId) {
                dot.classList.add('active-pulse');
                dot.classList.add('bg-neon-cyan', 'border-neon-cyan');
                dot.classList.remove('bg-white/20', 'border-white/50');
                text.classList.add('text-neon-cyan', 'opacity-100');
                text.classList.remove('text-white', 'opacity-80');
            }
        });
    }

    // 9-1. 부드러운 스크롤 (클릭 시 이동)
    sideNavItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-target');
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                // 활성 스타일을 즉시 적용하여 사용자에게 피드백 제공
                activateNavItem(targetId);

                // 스크롤 시 헤더 높이를 고려하여 60px 띄웁니다.
                const offset = targetId === 'home' ? 0 : 60;

                window.scrollTo({
                    top: targetElement.offsetTop - offset,
                    behavior: 'smooth'
                });
            }
        });
    });


    // 9-2. 스크롤 감지 및 항목 활성화 (Intersection Observer 사용)
    const observerOptions = {
        root: null, // 뷰포트를 기준으로 감지
        // 뷰포트의 상단 100px 지점부터 뷰포트 하단 30% 지점 사이를 기준으로 감지
        rootMargin: '-100px 0px -30% 0px',
        threshold: 0 // 섹션이 rootMargin 범위에 조금이라도 들어오면 감지
    };

    let activeSectionId = null;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // 현재 진입한 섹션의 ID를 활성 ID로 설정
                activeSectionId = entry.target.id;
            }
        });

        // 가장 최근에 활성화된 섹션을 기반으로 메뉴 항목 업데이트
        if (activeSectionId) {
            activateNavItem(activeSectionId);
        }
    }, observerOptions);

    // 모든 섹션에 관찰자 등록
    sections.forEach(section => {
        observer.observe(section);
    });

    // 9-3. 새로운 스타일: 네온 반짝임 효과를 위한 CSS 키프레임 추가
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
        @keyframes pulse-neon {
            0%, 100% {
                box-shadow: 0 0 5px #00f3ff, 0 0 10px #00f3ff, 0 0 15px #00f3ff;
            }
            50% {
                box-shadow: 0 0 1px #00f3ff, 0 0 2px #00f3ff, 0 0 5px #00f3ff;
            }
        }
        .active-pulse {
            animation: pulse-neon 1.5s infinite alternate;
        }
    `;
    document.head.appendChild(styleSheet);
});