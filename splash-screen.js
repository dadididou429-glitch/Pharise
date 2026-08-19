// ===== PHARIS 3D SPLASH SCREEN — Add-on =====
// Add this script to your existing JS, or link as splash-screen.js
// Place BEFORE your main app initialization

(function() {
    'use strict';

    const SPLASH_DURATION = 3800; // ms before auto-hide
    let splashEl = null;

    // Initialize splash on DOM ready
    function initSplash() {
        splashEl = document.getElementById('pharis-splash');
        if (!splashEl) return;

        // Randomize letter scatter
        const letters = splashEl.querySelectorAll('.pharis-letter');
        letters.forEach((letter) => {
            const x = (Math.random() - 0.5) * 300;
            const y = (Math.random() - 0.5) * 200;
            const r = (Math.random() - 0.5) * 120;
            letter.style.setProperty('--scatter-x', x + 'px');
            letter.style.setProperty('--scatter-y', y + 'px');
            letter.style.setProperty('--scatter-r', r + 'deg');
        });

        // Auto-hide splash after animation
        setTimeout(() => {
            hideSplash();
        }, SPLASH_DURATION);
    }

    function hideSplash() {
        if (!splashEl) return;
        splashEl.classList.add('hidden');
        setTimeout(() => {
            if (splashEl && splashEl.parentNode) {
                splashEl.parentNode.removeChild(splashEl);
            }
            // Trigger your app's main init here if needed
            if (typeof window.onPharisSplashDone === 'function') {
                window.onPharisSplashDone();
            }
        }, 800);
    }

    // Fast geolocation helper (can be used by your main app too)
    window.pharisFastGeo = function(successCallback, errorCallback, timeoutMs) {
        timeoutMs = timeoutMs || 5000;
        const geoStatus = document.getElementById('pharis-geo-status');
        const geoText = document.getElementById('pharis-geo-text');

        if (geoStatus) geoStatus.classList.add('active');
        if (geoText) geoText.textContent = 'Detecting location...';

        let finished = false;
        const timeout = setTimeout(() => {
            if (!finished) {
                finished = true;
                if (geoStatus) geoStatus.classList.remove('active');
                if (errorCallback) errorCallback(new Error('Timeout'));
            }
        }, timeoutMs);

        if (!navigator.geolocation) {
            clearTimeout(timeout);
            finished = true;
            if (geoStatus) geoStatus.classList.remove('active');
            if (errorCallback) errorCallback(new Error('Geolocation not supported'));
            return;
        }

        // High accuracy first
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                if (finished) return;
                finished = true;
                clearTimeout(timeout);
                if (geoText) geoText.textContent = 'Location found! ✓';
                setTimeout(() => { if (geoStatus) geoStatus.classList.remove('active'); }, 1000);
                if (successCallback) successCallback(pos);
            },
            (err) => {
                // Fallback: low accuracy
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        if (finished) return;
                        finished = true;
                        clearTimeout(timeout);
                        if (geoText) geoText.textContent = 'Location found! ✓';
                        setTimeout(() => { if (geoStatus) geoStatus.classList.remove('active'); }, 1000);
                        if (successCallback) successCallback(pos);
                    },
                    (err2) => {
                        if (finished) return;
                        finished = true;
                        clearTimeout(timeout);
                        if (geoStatus) geoStatus.classList.remove('active');
                        if (errorCallback) errorCallback(err2);
                    },
                    { enableHighAccuracy: false, timeout: 3000, maximumAge: 300000 }
                );
            },
            { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 }
        );
    };

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSplash);
    } else {
        initSplash();
    }
})();
