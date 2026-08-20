/**
 * Pharis — Cloud Functions
 * -----------------------------------------------------------------------
 * يحسب sum/count/average لتقييمات الصيدلية تلقائيًا من مستندات reviews،
 * بدل ما نسمح للعميل يكتب هالأرقام مباشرة (كانت هذي ثغرة في Firestore rules).
 *
 * البنية المتوقعة:
 *   ratings/{pharmacyId}                 -> { sum, count, average, updatedAt }
 *   ratings/{pharmacyId}/reviews/{reviewId} -> { stars, comment, uid, createdAt }
 *
 * كل تعديل بمستند review (إنشاء/تعديل/حذف) يعيد حساب المستند الأب بالكامل
 * (recount) بدل increment بسيط، عشان نتفادى انحراف الأرقام مع مرور الوقت
 * أو أي حذف يدوي من الأدمِن.
 * -----------------------------------------------------------------------
 */

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

exports.recalcPharmacyRating = onDocumentWritten(
  {
    document: "ratings/{pharmacyId}/reviews/{reviewId}",
    region: "europe-west1", // غيّرها لو مشروعك بمنطقة مختلفة
  },
  async (event) => {
    const pharmacyId = event.params.pharmacyId;
    const reviewsRef = db.collection("ratings").doc(pharmacyId).collection("reviews");
    const parentRef = db.collection("ratings").doc(pharmacyId);

    // نجيب كل المراجعات الحالية ونعيد الحساب بالكامل (مصدر الحقيقة الوحيد)
    const snapshot = await reviewsRef.get();

    let sum = 0;
    let count = 0;
    snapshot.forEach((doc) => {
      const stars = doc.data().stars;
      if (typeof stars === "number" && stars >= 1 && stars <= 5) {
        sum += stars;
        count += 1;
      }
    });

    const average = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;

    await parentRef.set(
      {
        sum,
        count,
        average,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
);
