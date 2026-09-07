/**
 * Pharis Core Application System Patch
 * Designed for High-Precision GPS Emergency Sorting
 */

function calculatePreciseDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

function isPharmacyOpenNow(openingHoursStr) {
    if (!openingHoursStr || openingHoursStr.includes("24/24")) return true;
    try {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const parts = openingHoursStr.split('-');
        if (parts.length !== 2) return true; 
        
        const [startHours, startMinutes] = parts[0].trim().split(':').map(Number);
        const [endHours, endMinutes] = parts[1].trim().split(':').map(Number);
        
        const startTotal = startHours * 60 + startMinutes;
        let endTotal = endHours * 60 + endMinutes;
        
        if (endTotal < startTotal) {
            if (currentMinutes >= startTotal || currentMinutes <= endTotal) return true;
            return false;
        }
        return currentMinutes >= startTotal && currentMinutes <= endTotal;
    } catch (e) {
        console.error("Time parsing exception:", e);
        return true; 
    }
}

async function triggerEmergencyMode(userLat, userLng) {
    try {
        const response = await fetch('sba_city.json');
        const pharmacies = await response.json();
        
        const emergencyList = pharmacies
            .map(pharmacy => {
                const distance = calculatePreciseDistance(userLat, userLng, pharmacy.lat, pharmacy.lng);
                const openNow = isPharmacyOpenNow(pharmacy.opening_hours);
                return { ...pharmacy, distance, openNow };
            })
            .filter(pharmacy => pharmacy.openNow || pharmacy.opening_hours.includes("24/24"))
            .sort((a, b) => a.distance - b.distance);
            
        console.log("⚡ Sorted Emergency Pharmacies:", emergencyList);
        renderEmergencyView(emergencyList);
    } catch (error) {
        console.error("Emergency pipeline execution failed:", error);
    }
}

function renderEmergencyView(list) {
    const container = document.getElementById('pharmacies-container');
    if (!container) return;
    container.innerHTML = '';
    
    if (list.length === 0) {
        container.innerHTML = '<div class="no-results">لا توجد صيدليات مناوبة مفتوحة حالياً في هذا النطاق.</div>';
        return;
    }
    
    list.forEach(ph => {
        const distanceStr = ph.distance < 1 ? `${Math.round(ph.distance * 1000)} متر` : `${ph.distance.toFixed(2)} كم`;
        const card = document.createElement('div');
        card.className = 'pharmacy-card emergency';
        card.innerHTML = `
            <h3>${ph.name_ar} <span class="hours-badge">🕒 ${ph.opening_hours}</span></h3>
            <p class="address">📍 ${ph.address}</p>
            <p class="distance">🎯 تبعد عنك: <strong>${distanceStr}</strong></p>
            <a href="tel:${ph.phone}" class="call-btn">📞 اتصل الآن: ${ph.phone}</a>
        `;
        container.appendChild(card);
    });
}

function activateEmergencyLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                triggerEmergencyMode(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                console.error("GPS Access Denied, fallback to default simulation.", error);
                // Fallback simulation near Village Errih / Cité Mimosa
                triggerEmergencyMode(35.1952, -0.6358);
            }
        );
    } else {
        triggerEmergencyMode(35.1952, -0.6358);
    }
}
