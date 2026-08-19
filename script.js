// ===== PHARIS 3D SPLASH + FAST GEOLOCATION =====

// Scatter letters with randomness on each load
const letters = document.querySelectorAll('.pharis-name .letter');
letters.forEach((letter) => {
    const x = (Math.random() - 0.5) * 300;
    const y = (Math.random() - 0.5) * 200;
    const r = (Math.random() - 0.5) * 120;
    letter.style.setProperty('--scatter-x', x + 'px');
    letter.style.setProperty('--scatter-y', y + 'px');
    letter.style.setProperty('--scatter-r', r + 'deg');
});

// Auto transition to welcome after animation (3.8s total)
setTimeout(() => {
    const splash = document.getElementById('splash');
    splash.classList.add('exit');
    setTimeout(() => {
        splash.style.display = 'none';
        document.getElementById('welcome').classList.add('active');
    }, 800);
}, 3800);

/**
 * Fast Geolocation with timeout fallback
 * Tries high accuracy first, then falls back to low accuracy for speed
 * @param {Function} successCallback
 * @param {Function} errorCallback
 * @param {number} timeoutMs - default 5000ms
 */
function fastGeolocation(successCallback, errorCallback, timeoutMs = 5000) {
    const geoStatus = document.getElementById('geoStatus');
    const geoText = document.getElementById('geoText');

    geoStatus.classList.add('active');
    geoText.textContent = 'Detecting location...';

    let finished = false;

    const timeout = setTimeout(() => {
        if (!finished) {
            finished = true;
            geoStatus.classList.remove('active');
            if (errorCallback) errorCallback(new Error('Timeout'));
        }
    }, timeoutMs);

    if (!navigator.geolocation) {
        clearTimeout(timeout);
        finished = true;
        geoStatus.classList.remove('active');
        if (errorCallback) errorCallback(new Error('Geolocation not supported'));
        return;
    }

    // Try high accuracy first
    const options = {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 60000 // Accept cached position up to 1 minute old
    };

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            if (finished) return;
            finished = true;
            clearTimeout(timeout);
            geoText.textContent = 'Location found! ✓';
            setTimeout(() => geoStatus.classList.remove('active'), 1000);
            if (successCallback) successCallback(pos);
        },
        (err) => {
            // Fallback: try again with low accuracy for faster result
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    if (finished) return;
                    finished = true;
                    clearTimeout(timeout);
                    geoText.textContent = 'Location found! ✓';
                    setTimeout(() => geoStatus.classList.remove('active'), 1000);
                    if (successCallback) successCallback(pos);
                },
                (err2) => {
                    if (finished) return;
                    finished = true;
                    clearTimeout(timeout);
                    geoStatus.classList.remove('active');
                    if (errorCallback) errorCallback(err2);
                },
                { enableHighAccuracy: false, timeout: 3000, maximumAge: 300000 }
            );
        },
        options
    );
}

// Detect button handler
document.getElementById('detectBtn').addEventListener('click', () => {
    fastGeolocation(
        (pos) => {
            console.log('Location:', pos.coords.latitude, pos.coords.longitude);
            // TODO: Redirect to pharmacy list or fetch nearest pharmacies
            alert(`Location found!\nLat: ${pos.coords.latitude.toFixed(4)}\nLng: ${pos.coords.longitude.toFixed(4)}\n\nNow showing nearest pharmacies...`);
        },
        (err) => {
            console.error('Geolocation error:', err);
            alert('Could not detect location. Please enable location permissions or search manually.');
        },
        4000 // 4 second timeout for faster UX
    );
});

/**
 * Utility: Replay splash animation (for testing)
 */
function replaySplash() {
    const splash = document.getElementById('splash');
    const welcome = document.getElementById('welcome');
    splash.style.display = 'flex';
    splash.classList.remove('exit');
    welcome.classList.remove('active');

    // Reset capsule animation
    const capsule = document.getElementById('capsule3d');
    const newCapsule = capsule.cloneNode(true);
    capsule.parentNode.replaceChild(newCapsule, capsule);

    // Reset name animation with new random scatter
    const name = document.getElementById('pharisName');
    const newName = name.cloneNode(true);
    name.parentNode.replaceChild(newName, name);

    const newLetters = newName.querySelectorAll('.letter');
    newLetters.forEach((letter) => {
        const x = (Math.random() - 0.5) * 300;
        const y = (Math.random() - 0.5) * 200;
        const r = (Math.random() - 0.5) * 120;
        letter.style.setProperty('--scatter-x', x + 'px');
        letter.style.setProperty('--scatter-y', y + 'px');
        letter.style.setProperty('--scatter-r', r + 'deg');
    });

    setTimeout(() => {
        splash.classList.add('exit');
        setTimeout(() => {
            splash.style.display = 'none';
            welcome.classList.add('active');
        }, 800);
    }, 3800);
}

// Expose for console testing
window.replaySplash = replaySplash;
