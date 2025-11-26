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

    // 6. 이미지 확대 모달 (Lightbox) 기능 (이전 요청대로 캡션 제거 유지)
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

    // ⭐ 7. 방문자 카운터: CounterAPI.dev V2 로직으로 완벽 교체 ⭐
    const countElement = document.getElementById('visitor-count-number');

    // 📢 중요: 사용자님이 제공한 API 키와 엔드포인트로 변경되었습니다.
    const YOUR_API_KEY = "ut_v51MEVP3IRZSPHtBOCddgX8Zqk3M3eCqXiW0cxDZ"; // <--- 사용자님의 실제 API Key
    // 기본 엔드포인트: 캡처 화면 참고
    const BASE_ENDPOINT = "https://api.counterapi.dev/v2/s-team-4-1812/컴퓨터-이리온-방문";

    // 카운터 증가 엔드포인트 (기본 엔드포인트 + /up)
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

        // v2 API 요청 옵션 (인증 헤더 필수)
        const requestOptions = {
            method: 'GET',
            headers: {
                // Bearer 토큰 형식으로 API 키를 헤더에 포함
                'Authorization': `Bearer ${YOUR_API_KEY}`
            }
        };

        // 새 CounterAPI 호출 (페이지 로드 시 카운터 증가 및 값 가져오기)
        fetch(API_HIT_ENDPOINT, requestOptions)
            .then(response => {
                if (!response.ok) {
                    // 오류 발생 시, 응답 본문을 읽어 정확한 에러 확인 시도
                    return response.json().then(err => { throw new Error(JSON.stringify(err)); });
                }
                return response.json();
            })
            .then(data => {
                // v2 응답 구조에 맞게 'count' 속성 사용
                if (data && typeof data.count === 'number') {
                    animateCountUp(data.count);
                } else {
                    throw new Error('Invalid response structure from CounterAPI.dev V2');
                }
            })
            .catch(error => {
                console.error('Visitor counter error (CounterAPI.dev V2):', error);
                // 오류 발생 시 표시될 텍스트
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
});