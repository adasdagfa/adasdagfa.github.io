document.addEventListener("DOMContentLoaded", function () {

    // 1. AOS 애니메이션 초기화
    AOS.init({
        duration: 1000,
        once: false,
        mirror: true,
        offset: 100,
    });

    // 2. 로딩 바 스크립트 및 캐러셀 이미지 복제 로직
    const loadingBar = document.getElementById('loading-bar');
    const initialGameImages = document.querySelectorAll('.carousel-track img');
    let totalAssets = initialGameImages.length;
    let loadedAssets = 0;

    function updateLoadingBar() {
        loadedAssets++;
        const progress = (loadedAssets / totalAssets) * 100;
        if(loadingBar) loadingBar.style.width = progress + '%';

        if (loadedAssets >= totalAssets) {
            setupCarouselTracks();
            setTimeout(() => {
                if(loadingBar) {
                    loadingBar.style.opacity = '0';
                    setTimeout(() => {
                        loadingBar.style.display = 'none';
                    }, 300);
                }
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

        const allCarouselImgs = document.querySelectorAll(".carousel-track img");
        allCarouselImgs.forEach(img => {
            img.addEventListener('click', function (e) {
                e.preventDefault();
                openModal(this);
            });
        });
    }

    // 3. 네이버 지도 API 연동
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

    // 4. 이미지 확대 모달 (Lightbox) 기능
    const modal = document.getElementById("image-modal");
    const modalImg = document.getElementById("modal-img");
    const modalClose = document.querySelector(".modal-close-btn");

    function openModal(imgElement) {
        if(!modal) return;
        modal.classList.remove("hidden");
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);

        modalImg.src = imgElement.src;
        modalImg.style.transform = 'scale(1)';
    }

    function closeModal() {
        if(!modal) return;
        modal.style.opacity = '0';
        if(modalImg) modalImg.style.transform = 'scale(0.95)';
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

    // 5. 방문자 카운터: CounterAPI.dev V2 로직
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

    // 6. 로고 클릭 시 맨 위로 이동
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

    // 7. 사이드 내비게이션 (스크롤 감지 및 부드러운 이동)
    const sideNavItems = document.querySelectorAll('#side-nav .nav-item');
    const sections = document.querySelectorAll('header[id], section[id]');

    function activateNavItem(targetId) {
        sideNavItems.forEach(item => {
            const dot = item.querySelector('.nav-dot');
            const text = item.querySelector('.nav-text');

            dot.classList.remove('active-pulse');
            dot.classList.remove('bg-neon-cyan', 'border-neon-cyan');
            dot.classList.add('bg-white/20', 'border-white/50');
            text.classList.remove('text-neon-cyan', 'opacity-100');
            text.classList.add('text-white', 'opacity-80');

            if (item.getAttribute('data-target') === targetId) {
                dot.classList.add('active-pulse');
                dot.classList.add('bg-neon-cyan', 'border-neon-cyan');
                dot.classList.remove('bg-white/20', 'border-white/50');
                text.classList.add('text-neon-cyan', 'opacity-100');
                text.classList.remove('text-white', 'opacity-80');
            }
        });
    }

    sideNavItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-target');
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                activateNavItem(targetId);
                const offset = targetId === 'home' ? 0 : 60;
                window.scrollTo({
                    top: targetElement.offsetTop - offset,
                    behavior: 'smooth'
                });
            }
        });
    });

    const observerOptions = {
        root: null,
        rootMargin: '-100px 0px -30% 0px',
        threshold: 0
    };

    let activeSectionId = null;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                activeSectionId = entry.target.id;
            }
        });

        if (activeSectionId) {
            activateNavItem(activeSectionId);
        }
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });

    // 8. 유튜브 전용 동영상 모달 제어 함수 (수정 완료)
    window.openVideoModal = function (videoSrc, titleText, colorTheme) {
        const modal = document.getElementById('video-modal');
        const modalContainer = document.getElementById('video-modal-container');
        const modalTitle = document.getElementById('video-modal-title').querySelector('span');
        const titleIcon = document.getElementById('video-title-icon');
        const playerContainer = document.getElementById('video-player-container');

        if (!modal) return;

        // 동적으로 유튜브 iframe 삽입 (닫을 때 제거하여 소리 재생 방지)
        if (playerContainer) {
            playerContainer.innerHTML = `
                <iframe class="w-full h-full rounded-b" 
                        src="${videoSrc}" 
                        title="${titleText}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowfullscreen>
                </iframe>
            `;
        }

        if (modalTitle) modalTitle.textContent = titleText;

        const themeMap = {
            pink: { border: 'border-neon-pink', shadow: 'shadow-[0_0_50px_rgba(255,0,255,0.4)]', icon: 'text-neon-pink' },
            green: { border: 'border-neon-green', shadow: 'shadow-[0_0_50px_rgba(0,255,136,0.4)]', icon: 'text-neon-green' },
            purple: { border: 'border-neon-purple', shadow: 'shadow-[0_0_50px_rgba(157,0,255,0.4)]', icon: 'text-neon-purple' }
        };

        const currentTheme = themeMap[colorTheme] || themeMap.pink;

        if (modalContainer) {
            modalContainer.className = `relative max-w-4xl w-full bg-dark border-2 rounded-lg overflow-hidden transition-all duration-300 transform ${currentTheme.border} ${currentTheme.shadow}`;
        }
        if (titleIcon) {
            titleIcon.className = `fas fa-play-circle ${currentTheme.icon}`;
        }

        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            if (modalContainer) {
                modalContainer.classList.remove('translate-y-4', 'scale-95');
                modalContainer.classList.add('translate-y-0', 'scale-100');
            }
        }, 10);
    };

    window.closeVideoModal = function () {
        const modal = document.getElementById('video-modal');
        const modalContainer = document.getElementById('video-modal-container');
        const playerContainer = document.getElementById('video-player-container');

        if (!modal) return;

        modal.classList.add('opacity-0');
        if (modalContainer) {
            modalContainer.classList.remove('translate-y-0', 'scale-100');
            modalContainer.classList.add('translate-y-4', 'scale-95');
        }

        setTimeout(() => {
            modal.classList.add('hidden');
            // iframe 제거를 통해 모달을 닫았을 때 유튜브 오디오가 멈추도록 함
            if (playerContainer) {
                playerContainer.innerHTML = '';
            }
        }, 300);
    };

    const closeVidBtn = document.getElementById('close-video-modal');
    if (closeVidBtn) {
        closeVidBtn.addEventListener('click', closeVideoModal);
    }

    const videoModal = document.getElementById('video-modal');
    if (videoModal) {
        videoModal.addEventListener('click', (e) => {
            if (e.target.id === 'video-modal') {
                closeVideoModal();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const videoModal = document.getElementById('video-modal');
            if (videoModal && !videoModal.classList.contains('hidden')) {
                closeVideoModal();
            }
        }
    });

    // 9. CSS 애니메이션 추가
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

// 공지 팝업 드래그 로직
document.addEventListener("DOMContentLoaded", function () {
    const popup = document.getElementById('popup');
    const content = document.querySelector('.popup-content');
    const body = document.querySelector('.popup-body');

    if (!popup || !content || !body) return;

    const now = new Date().getTime();
    const expireTime = localStorage.getItem('popupExpireTime');
    if (!expireTime || now > expireTime) {
        popup.style.display = 'block';
    }

    let isDragging = false;
    let offsetX, offsetY;

    body.addEventListener('mousedown', (e) => {
        if (e.target.contentEditable === 'true') return;
        isDragging = true;
        offsetX = e.clientX - content.getBoundingClientRect().left;
        offsetY = e.clientY - content.getBoundingClientRect().top;
        content.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        content.style.left = (e.clientX - offsetX) + 'px';
        content.style.top = (e.clientY - offsetY) + 'px';
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        content.style.cursor = 'move';
    });
});