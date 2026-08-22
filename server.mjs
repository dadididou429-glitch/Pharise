import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "maftouha-ap";
const ADMIN_UID = process.env.PHARIS_ADMIN_UID || "";
const AUDIT_COLLECTION = process.env.PHARIS_AUDIT_COLLECTION || "audit_log";
const OSM_ENDPOINT = process.env.PHARIS_OSM_ENDPOINT || "https://overpass-api.de/api/interpreter";
const MAX_LIMIT = 100;

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
  });
}

const db = getFirestore();
const server = new McpServer({ name: "pharis-admin", version: "1.0.0" });

function fail(message) {
  throw new Error(String(message));
}

function limitValue(value, fallback = 50) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(n)));
}

function docId(value, label = "id") {
  const id = String(value || "").trim();
  if (!id || id.length > 150 || id.includes("/")) fail(`${label} غير صالح`);
  return id;
}

function boundedString(value, label, max, required = false) {
  const s = String(value ?? "").trim();
  if (required && !s) fail(`${label} مطلوب`);
  if (s.length > max) fail(`${label} يتجاوز ${max} حرفًا`);
  return s;
}

function coordinates(lat, lng) {
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || a < -90 || a > 90) fail("lat يجب أن يكون بين -90 و90");
  if (!Number.isFinite(b) || b < -180 || b > 180) fail("lng يجب أن يكون بين -180 و180");
  return { lat: a, lng: b };
}

function serialize(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value.toDate === "function") return value.toDate().toISOString();
  if (value && typeof value === "object") {
    const output = {};
    for (const [key, item] of Object.entries(value)) output[key] = serialize(item);
    return output;
  }
  return value;
}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const output = {};
    for (const [key, item] of Object.entries(value)) {
      if (/password|token|secret|credential|phone|whatsapp/i.test(key)) output[key] = "[REDACTED]";
      else output[key] = redact(item);
    }
    return output;
  }
  return value;
}

function result(data) {
  return {
    content: [{ type: "text", text: JSON.stringify(serialize(data), null, 2) }],
  };
}

function errorResult(error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify({ ok: false, error: message }) }],
  };
}

function auditDoc(action, target, details) {
  return {
    action,
    target,
    actor: "openclaw",
    adminUid: ADMIN_UID || null,
    createdAt: FieldValue.serverTimestamp(),
    details: redact(details),
  };
}

function batchWithAudit(action, target, details) {
  const batch = db.batch();
  const auditRef = db.collection(AUDIT_COLLECTION).doc();
  batch.create(auditRef, auditDoc(action, target, details));
  return batch;
}

function register(name, description, inputSchema, handler) {
  server.registerTool(name, { description, inputSchema }, async (input) => {
    try {
      return result(await handler(input || {}));
    } catch (error) {
      console.error(`[pharis-mcp] ${name}:`, error);
      return errorResult(error);
    }
  });
}

const Hours = z.object({
  open: z.number().int().min(0).max(23).default(8),
  close: z.number().int().min(0).max(23).default(21),
});

const PharmacyFields = z.object({
  name: z.string().trim().min(1).max(80),
  address: z.string().trim().min(1).max(200),
  area: z.string().trim().max(80).optional().default(""),
  phone: z.string().trim().max(20).nullable().optional().default(null),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  wilaya: z.string().trim().max(80).optional().default(""),
  commune: z.string().trim().max(80).optional().default(""),
  country: z.string().trim().max(8).optional().default("DZ"),
  hours: Hours.optional().default({ open: 8, close: 21 }),
  onDuty: z.boolean().optional().default(false),
});

const PharmacyPatch = PharmacyFields.partial().extend({
  id: z.string().trim().min(1).max(150),
});

register(
  "pharis_status",
  "تحقق من اتصال جسر Pharis بقاعدة Firebase وأظهر حالة الإعدادات دون كشف أي سر.",
  z.object({}),
  async () => {
    const stats = await db.collection("stats").doc("users").get();
    return {
      ok: true,
      projectId: PROJECT_ID,
      configuredAdminUid: ADMIN_UID || null,
      auditCollection: AUDIT_COLLECTION,
      firebaseReachable: true,
      statsDocumentExists: stats.exists,
      availableCollections: [
        "pharmacies_submitted",
        "removed_pharmacies",
        "pharmacy_features",
        "activation_codes",
        "medicine_requests",
        "admins",
        "audit_log",
      ],
      note: "هذا الجسر يعمل بصلاحيات Firebase Admin من جهاز OpenClaw؛ لا تضع ملف الاعتماد في GitHub Pages.",
    };
  },
);

register(
  "pharis_list_submitted_pharmacies",
  "اعرض الصيدليات التي سجّلها المستخدمون في Pharis مع إمكان التصفية بالولاية.",
  z.object({ wilaya: z.string().trim().max(80).optional(), limit: z.number().int().min(1).max(MAX_LIMIT).optional() }),
  async ({ wilaya, limit }) => {
    let query = db.collection("pharmacies_submitted");
    if (wilaya) query = query.where("wilaya", "==", wilaya);
    const snap = await query.limit(limitValue(limit)).get();
    return { count: snap.size, items: snap.docs.map((d) => ({ id: d.id, ...serialize(d.data()) })) };
  },
);

register(
  "pharis_get_pharmacy",
  "اعرض تفاصيل صيدلية مسجّلة وحالتها من حيث الإخفاء والشارة.",
  z.object({ id: z.string().trim().min(1).max(150) }),
  async ({ id }) => {
    const safeId = docId(id);
    const [submitted, feature, removed] = await Promise.all([
      db.collection("pharmacies_submitted").doc(safeId).get(),
      db.collection("pharmacy_features").doc(safeId).get(),
      db.collection("removed_pharmacies").doc(safeId).get(),
    ]);
    return {
      id: safeId,
      submitted: submitted.exists ? serialize(submitted.data()) : null,
      feature: feature.exists ? serialize(feature.data()) : null,
      removed: removed.exists ? serialize(removed.data()) : null,
    };
  },
);

register(
  "pharis_create_pharmacy",
  "أضف صيدلية جديدة إلى قائمة Pharis. هذه عملية كتابة وتُسجّل تلقائيًا في سجل التدقيق.",
  PharmacyFields,
  async (input) => {
    const data = PharmacyFields.parse(input);
    const ref = db.collection("pharmacies_submitted").doc();
    const auditBatch = batchWithAudit("create_pharmacy", ref.id, data);
    auditBatch.create(ref, {
      ...data,
      verified: false,
      featured: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    await auditBatch.commit();
    return { ok: true, id: ref.id, item: data, verified: false, featured: false };
  },
);

register(
  "pharis_update_pharmacy",
  "عدّل بيانات صيدلية مسجّلة في Pharis. لا يغيّر هذا الأمر الشارة؛ استخدم pharis_set_feature.",
  PharmacyPatch,
  async (input) => {
    const data = PharmacyPatch.parse(input);
    const safeId = docId(data.id);
    const ref = db.collection("pharmacies_submitted").doc(safeId);
    const current = await ref.get();
    if (!current.exists) fail("الصيدلية المسجّلة غير موجودة؛ قد يكون المعرّف من OpenStreetMap وليس من Firestore");
    const { id: _id, ...patch } = data;
    const batch = batchWithAudit("update_pharmacy", safeId, patch);
    batch.update(ref, { ...patch, updatedAt: FieldValue.serverTimestamp() });
    await batch.commit();
    return { ok: true, id: safeId, updated: patch };
  },
);

register(
  "pharis_remove_pharmacy",
  "أخفِ صيدلية من تطبيق Pharis عبر سجل removed_pharmacies. permanent=false للإخفاء القابل للاسترجاع. permanent=true يحذف سجل Firestore المرسل أيضًا، ويتطلب confirmation=DELETE_PERMANENTLY؛ لا يؤثر في مصدر OpenStreetMap نفسه.",
  z.object({
    id: z.string().trim().min(1).max(150),
    name: z.string().trim().max(80).optional().default(""),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    reason: z.string().trim().max(300).optional().default(""),
    permanent: z.boolean().optional().default(false),
    confirmation: z.string().optional(),
  }),
  async ({ id, name, lat, lng, reason, permanent, confirmation }) => {
    const safeId = docId(id);
    if (permanent && confirmation !== "DELETE_PERMANENTLY") {
      fail("الحذف النهائي يتطلب confirmation=DELETE_PERMANENTLY بعد تأكيد المشرف صراحةً");
    }
    const fingerprint = lat !== undefined && lng !== undefined
      ? `${String(name || "").trim().toLowerCase()}|${Number(lat).toFixed(4)}|${Number(lng).toFixed(4)}`
      : null;
    const removed = {
      name: boundedString(name, "name", 80),
      removedAt: FieldValue.serverTimestamp(),
      fingerprint,
      sourceId: safeId,
      reason: boundedString(reason, "reason", 300),
      removedBy: ADMIN_UID || "openclaw",
    };
    const batch = batchWithAudit(permanent ? "delete_pharmacy" : "hide_pharmacy", safeId, { ...removed, permanent });
    const removedRef = db.collection("removed_pharmacies").doc(safeId);
    batch.set(removedRef, removed, { merge: true });
    if (fingerprint) {
      const fpId = `fp_${fingerprint.replace(/[^a-z0-9|.-]/gi, "_").slice(0, 120)}`;
      batch.set(db.collection("removed_pharmacies").doc(fpId), removed, { merge: true });
    }
    if (permanent) {
      batch.delete(db.collection("pharmacies_submitted").doc(safeId));
      batch.delete(db.collection("pharmacy_features").doc(safeId));
    }
    await batch.commit();
    return { ok: true, id: safeId, hidden: true, permanent: !!permanent, source: permanent ? "Firestore + overlay" : "overlay only" };
  },
);

register(
  "pharis_restore_pharmacy",
  "أزل علامة الإخفاء عن صيدلية. إذا حُذفت بيانات Firestore نهائيًا فلن يعيد هذا الأمر السجل المحذوف.",
  z.object({ id: z.string().trim().min(1).max(150), fingerprint: z.string().trim().max(180).optional() }),
  async ({ id, fingerprint }) => {
    const safeId = docId(id);
    const batch = batchWithAudit("restore_pharmacy", safeId, { fingerprint: fingerprint || null });
    batch.delete(db.collection("removed_pharmacies").doc(safeId));
    if (fingerprint) {
      const fpId = `fp_${fingerprint.replace(/[^a-z0-9|.-]/gi, "_").slice(0, 120)}`;
      batch.delete(db.collection("removed_pharmacies").doc(fpId));
    }
    await batch.commit();
    return { ok: true, id: safeId, restoredOverlay: true };
  },
);

register(
  "pharis_set_feature",
  "فعّل أو عطّل شارة الصيدلية المميزة/الموثقة في Pharis. لا يغيّر هذا الأمر بيانات OpenStreetMap.",
  z.object({
    id: z.string().trim().min(1).max(150),
    featured: z.boolean(),
    verified: z.boolean().optional().default(true),
    note: z.string().trim().max(300).optional().default(""),
  }),
  async ({ id, featured, verified, note }) => {
    const safeId = docId(id);
    const ref = db.collection("pharmacy_features").doc(safeId);
    const value = { featured: !!featured, verified: featured ? !!verified : false, note, updatedAt: FieldValue.serverTimestamp() };
    const batch = batchWithAudit("set_feature", safeId, value);
    if (featured || verified) batch.set(ref, value, { merge: true });
    else batch.delete(ref);
    await batch.commit();
    return { ok: true, id: safeId, ...value };
  },
);

register(
  "pharis_list_removed_pharmacies",
  "اعرض الصيدليات التي يخفيها التطبيق عبر removed_pharmacies.",
  z.object({ limit: z.number().int().min(1).max(MAX_LIMIT).optional() }),
  async ({ limit }) => {
    const snap = await db.collection("removed_pharmacies").limit(limitValue(limit)).get();
    return { count: snap.size, items: snap.docs.map((d) => ({ id: d.id, ...serialize(d.data()) })) };
  },
);

register(
  "pharis_list_medicine_requests",
  "اعرض طلبات الأدوية المخزنة في Pharis للمراجعة أو المتابعة. قد تتضمن أرقام تواصل؛ استخدمها لغرض الإدارة فقط.",
  z.object({ activeOnly: z.boolean().optional().default(false), limit: z.number().int().min(1).max(MAX_LIMIT).optional() }),
  async ({ activeOnly, limit }) => {
    let query = db.collection("medicine_requests");
    if (activeOnly) query = query.where("active", "==", true);
    const snap = await query.limit(limitValue(limit)).get();
    const items = snap.docs
      .map((d) => ({ id: d.id, ...serialize(d.data()) }))
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return { count: items.length, items };
  },
);

register(
  "pharis_set_medicine_request_status",
  "غيّر حالة طلب دواء إلى نشط أو غير نشط.",
  z.object({ id: z.string().trim().min(1).max(150), active: z.boolean(), reason: z.string().trim().max(300).optional().default("") }),
  async ({ id, active, reason }) => {
    const safeId = docId(id);
    const ref = db.collection("medicine_requests").doc(safeId);
    const current = await ref.get();
    if (!current.exists) fail("طلب الدواء غير موجود");
    const patch = { active: !!active, updatedAt: FieldValue.serverTimestamp() };
    const batch = batchWithAudit("set_medicine_request_status", safeId, { active, reason });
    batch.update(ref, patch);
    await batch.commit();
    return { ok: true, id: safeId, active: !!active };
  },
);

register(
  "pharis_list_admins",
  "اعرض قائمة المشرفين المسجلين في Firestore دون تعديلها.",
  z.object({}),
  async () => {
    const snap = await db.collection("admins").get();
    return { count: snap.size, primaryUid: ADMIN_UID || null, items: snap.docs.map((d) => ({ id: d.id, ...serialize(d.data()) })) };
  },
);

register(
  "pharis_list_audit_log",
  "اعرض سجل أوامر OpenClaw المنفذة على Pharis.",
  z.object({ limit: z.number().int().min(1).max(MAX_LIMIT).optional() }),
  async ({ limit }) => {
    const snap = await db.collection(AUDIT_COLLECTION).orderBy("createdAt", "desc").limit(limitValue(limit)).get();
    return { count: snap.size, items: snap.docs.map((d) => ({ id: d.id, ...serialize(d.data()) })) };
  },
);

register(
  "pharis_search_osm_pharmacies",
  "ابحث عن صيدليات OpenStreetMap حول إحداثيات معينة. هذه أداة قراءة فقط؛ تعديل المصدر الخارجي يحتاج حساب OpenStreetMap منفصلًا.",
  z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), radiusMeters: z.number().int().min(100).max(50000).optional().default(25000) }),
  async ({ lat, lng, radiusMeters }) => {
    const query = `[out:json][timeout:30];(node[\"amenity\"=\"pharmacy\"](around:${radiusMeters},${lat},${lng});way[\"amenity\"=\"pharmacy\"](around:${radiusMeters},${lat},${lng});relation[\"amenity\"=\"pharmacy\"](around:${radiusMeters},${lat},${lng}););out center;`;
    const response = await fetch(OSM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain", "User-Agent": "PharisOpenClawMCP/1.0" },
      body: query,
    });
    if (!response.ok) fail(`OpenStreetMap/Overpass أعاد HTTP ${response.status}`);
    const body = await response.json();
    const items = (body.elements || []).map((el) => {
      const tags = el.tags || {};
      return {
        id: String(el.id),
        name: tags.name || tags["name:ar"] || tags["name:fr"] || "صيدلية",
        address: tags["addr:street"] || tags["addr:full"] || "",
        phone: tags.phone || tags["contact:phone"] || "",
        openingHours: tags.opening_hours || "",
        lat: el.lat ?? el.center?.lat ?? null,
        lng: el.lon ?? el.center?.lon ?? null,
        source: "OpenStreetMap",
      };
    }).filter((item) => item.lat !== null && item.lng !== null);
    return { count: items.length, radiusMeters, items };
  },
);

await serveStdio(() => server);
console.error("[pharis-mcp] stdio server ready");
