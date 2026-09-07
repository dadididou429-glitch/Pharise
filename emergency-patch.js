/**
 * ⚡ بروتوكول طوارئ تطبيق Pharis المطور
 * حساب جغرافي دقيق وفلترة زمنية ذكية للصيدليات المناوبة
 */

function calculatePreciseDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // نصف قطر كوكب الأرض بالكيلومترات
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
        console.error("خطأ تقني في معالجة مصفوفة الوقت:", e);
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
            
        if (typeof renderEmergencyView === 'function') {
            renderEmergencyView(emergencyList);
        } else {
            console.log("النتائج المرتبة جاهزة:", emergencyList);
        }
    } catch (error) {
        console.error("فشل في استدعاء مسار معالجة الطوارئ الحية:", error);
    }
}
