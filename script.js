document.addEventListener("DOMContentLoaded", function () {
    // 1. AOS 초기화
    AOS.init({ duration: 1000, once: true });

    // 2. 이미지 모달 기능
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    const closeModal = document.getElementById('close-modal');

    function openModal(src) {
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('opacity-100'), 10);
        modalImg.src = src;
        document.body.style.overflow = 'hidden';
    }

    document.querySelectorAll('.carousel-track img').forEach(img => {
        img.addEventListener('click', () => openModal(img.src));
    });

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            modal.classList.remove('opacity-100');
            setTimeout(() => {
                modal.classList.add('hidden');
                document.body.style.overflow = 'auto';
            }, 300);
        });
    }

    // 3. 캐러셀 이미지 무한 복제
    const carouselTracks = document.querySelectorAll('.carousel-track');
    carouselTracks.forEach(track => {
        const images = Array.from(track.children);
        images.forEach(img => {
            const clone = img.cloneNode(true);
            clone.addEventListener('click', () => openModal(clone.src));
            track.appendChild(clone);
        });
    });

    // 4. 네이버 지도
    if (typeof naver !== 'undefined' && document.getElementById('map')) {
        const latlng = new naver.maps.LatLng(35.7198, 126.7441);
        const map = new naver.maps.Map('map', {
            center: latlng,
            zoom: 16
        });
        new naver.maps.Marker({
            position: latlng,
            map: map,
            animation: naver.maps.Animation.BOUNCE
        });
    }

    // 5. 로고 클릭 상단 이동
    document.getElementById('logo-link')?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});