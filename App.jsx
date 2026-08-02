import { useState, useEffect, useMemo, useCallback } from "react";
import { RAW } from "./data/pharmacies";
import { COUNTRIES, CITIES_BY_COUNTRY } from "./data/locations";
import { t as tr } from "./i18n";
import {
  DEFAULT_LOC,
  haversine,
  fmtHour,
  computeStatus,
  storageGet,
  storageSet,
} from "./utils";
import { fetchOSMPharmacies, fetchOSMByCity } from "./api/osm";
import "./App.css";

const WILAYA_NAMES = {
  16: "الجزائر",
  31: "وهران",
  22: "سيدي بلعباس",
};

export default function App() {
  const [lang, setLang] = useState(() => {
    const s = storageGet("pharis_lang", null);
    if (s) return s;
    const b = (navigator.language || "ar").slice(0, 2);
    return ["ar", "fr", "en"].includes(b) ? b : "ar";
  });
  const [dark, setDark] = useState(() => {
    const s = storageGet("pharis_dark", null);
    if (s !== null) return !!s;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [emergencyMode, setEmergencyMode] = useState(() => {
    const h = new Date().getHours();
    return h >= 20 || h < 8;
  });
  const [showOnboarding, setShowOnboarding] = useState(
    () => !storageGet("pharis_onboarded", false)
  );
  const [showLocation, setShowLocation] = useState(false);
  const [countryId, setCountryId] = useState("DZ");
  const [wilayaId, setWilayaId] = useState(22);
  const [userLoc, setUserLoc] = useState(DEFAULT_LOC);
  const [currentPlace, setCurrentPlace] = useState("سيدي بلعباس");
  const [osmPharmacies, setOsmPharmacies] = useState([]);
  const [loadingOSM, setLoadingOSM] = useState(false);
  const [locating, setLocating] = useState(true);
  const [geoError, setGeoError] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [favorites, setFavorites] = useState(
    () => new Set(storageGet("pharis_favorites", []))
  );
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const [citySearch, setCitySearch] = useState("");
  const [now, setNow] = useState(() => new Date());

  const t = useCallback((key, vars) => tr(lang, key, vars), [lang]);
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    storageSet("pharis_dark", dark);
  }, [dark]);

  useEffect(() => {
    storageSet("pharis_lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocating(false);
      setGeoError("unsupported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLoc({ lat, lng });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const data = await res.json();
          const state = data.address?.state || data.address?.city || "";
          const match = Object.entries(WILAYA_NAMES).find(([, n]) =>
            state.includes(n) || n.includes(state)
          );
          if (match) {
            setWilayaId(Number(match[0]));
            setCurrentPlace(match[1]);
          } else {
            setLoadingOSM(true);
            try {
              const list = await fetchOSMPharmacies(lat, lng, 15000);
              if (list.length) {
                setOsmPharmacies(list);
                setWilayaId(999);
                setCurrentPlace(
                  data.address?.city || data.address?.town || "Nearby"
                );
              }
            } catch {
              /* ignore */
            } finally {
              setLoadingOSM(false);
            }
          }
        } catch {
          /* ignore */
        }
        setLocating(false);
      },
      () => {
        setGeoError("denied");
        setLocating(false);
      },
      { timeout: 12000 }
    );
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const allComputed = useMemo(() => {
    const local =
      wilayaId === 999
        ? []
        : RAW.filter((p) => p.wilaya === WILAYA_NAMES[wilayaId]);
    const base = [...local, ...osmPharmacies];
    return base
      .map((ph) => {
        const status = computeStatus(ph, now);
        const distance = haversine(userLoc.lat, userLoc.lng, ph.lat, ph.lng);
        return {
          ...ph,
          status,
          distance,
          isFavorite: favorites.has(ph.id),
        };
      })
      .sort((a, b) => a.distance - b.distance);
  }, [wilayaId, osmPharmacies, now, userLoc, favorites]);

  const list = useMemo(() => {
    return allComputed
      .filter((ph) =>
        (ph.name + " " + (ph.area || "")).toLowerCase().includes(query.toLowerCase())
      )
      .filter((ph) => (filter === "open" ? ph.status.open : true))
      .filter((ph) => (filter === "urgent" ? ph.onDuty : true))
      .filter((ph) => (filter === "favorites" ? ph.isFavorite : true));
  }, [allComputed, query, filter]);

  const emergencyList = useMemo(() => {
    return allComputed
      .filter((p) => p.status.open)
      .sort((a, b) => {
        if (a.onDuty !== b.onDuty) return a.onDuty ? -1 : 1;
        return a.distance - b.distance;
      })
      .slice(0, 8);
  }, [allComputed]);

  const openCount = list.filter((p) => p.status.open).length;

  const selectCity = async (city) => {
    setUserLoc({ lat: city.lat, lng: city.lng });
    setCurrentPlace(city.name);
    setShowLocation(false);
    setCitySearch("");
    if (countryId === "DZ" && city.wilayaId) {
      setWilayaId(city.wilayaId);
      setOsmPharmacies([]);
      const n = RAW.filter((p) => p.wilaya === city.name).length;
      showToast(t("pharmaciesFound", { n, name: city.name }));
      return;
    }
    setLoadingOSM(true);
    try {
      const data = await fetchOSMByCity(city.nameEn || city.name, city.lat, city.lng);
      setOsmPharmacies(data);
      setWilayaId(999);
      showToast(t("pharmaciesFound", { n: data.length, name: city.name }));
    } catch {
      showToast(t("loadFailed"));
    } finally {
      setLoadingOSM(false);
    }
  };

  const loadNearMe = async () => {
    setLoadingOSM(true);
    try {
      const data = await fetchOSMPharmacies(userLoc.lat, userLoc.lng, 20000);
      setOsmPharmacies(data);
      setWilayaId(999);
      showToast(t("pharmaciesFound", { n: data.length, name: "…" }));
    } catch {
      showToast(t("loadFailed"));
    } finally {
      setLoadingOSM(false);
    }
  };

  const toggleFav = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      storageSet("pharis_favorites", [...next]);
      return next;
    });
  };

  const cities = (CITIES_BY_COUNTRY[countryId] || []).filter(
    (c) =>
      !citySearch ||
      c.name.toLowerCase().includes(citySearch.toLowerCase()) ||
      (c.nameEn && c.nameEn.toLowerCase().includes(citySearch.toLowerCase()))
  );

  const finishOnboard = () => {
    storageSet("pharis_onboarded", true);
    setShowOnboarding(false);
  };

  return (
    <div className={`app ${dark ? "dark" : ""}`} dir={dir}>
      {showOnboarding && (
        <div className="overlay">
          <div className="sheet onboard">
            <div className="logo">+</div>
            <h2>{t("welcome")}</h2>
            <p>{t("welcomeSub")}</p>
            <button className="btn primary full" onClick={finishOnboard}>
              {t("getStarted")}
            </button>
          </div>
        </div>
      )}

      <header className="header">
        <div className="header-top">
          <div>
            <h1>Pharis</h1>
            <p className="place">{currentPlace}</p>
          </div>
          <div className="header-actions">
            <button onClick={() => setDark((d) => !d)} className="icon-btn">
              {dark ? "☀" : "☾"}
            </button>
            {["ar", "fr", "en"].map((code) => (
              <button
                key={code}
                className={`lang ${lang === code ? "active" : ""}`}
                onClick={() => setLang(code)}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <button className="loc-btn" onClick={() => setShowLocation((s) => !s)}>
          📍 {t("tagline", { place: currentPlace })}
          <span>{t("changeLocation")}</span>
        </button>

        {showLocation && (
          <div className="loc-panel">
            <p className="label">{t("country")}</p>
            <div className="grid2">
              {COUNTRIES.map((c) => (
                <button
                  key={c.id}
                  className={c.id === countryId ? "active" : ""}
                  onClick={() => {
                    setCountryId(c.id);
                    setCitySearch("");
                  }}
                >
                  {lang === "ar" ? c.name : lang === "fr" ? c.nameFr : c.nameEn}
                </button>
              ))}
            </div>
            <p className="label">{t("city")}</p>
            <input
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              placeholder={t("city")}
              className="input"
            />
            <div className="city-list">
              {cities.map((city, i) => (
                <button key={i} onClick={() => selectCity(city)}>
                  {lang === "en" && city.nameEn ? city.nameEn : city.name}
                  {city.wilayaId && <span className="badge">محلي</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="stats">
          <span className="big">{openCount}</span>
          <span className="muted">/ {list.length}</span>
        </div>

        <input
          className="input search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
        />

        <div className="filters">
          <button
            className={emergencyMode ? "urgent active" : "urgent"}
            onClick={() => setEmergencyMode(true)}
          >
            🚨 {t("emergency")}
          </button>
          {[
            ["all", t("filterAll")],
            ["open", t("filterOpen")],
            ["urgent", t("filterUrgent")],
            ["favorites", t("filterFavorites")],
          ].map(([id, label]) => (
            <button
              key={id}
              className={!emergencyMode && filter === id ? "active" : ""}
              onClick={() => {
                setFilter(id);
                setEmergencyMode(false);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <button className="map-load" onClick={loadNearMe} disabled={loadingOSM}>
          {loadingOSM ? "…" : `🌐 ${t("loadFromMap")}`}
        </button>
        {locating && <p className="muted">{t("detecting")}</p>}
        {geoError && !locating && <p className="error">{t("geoError")}</p>}
      </header>

      {toast && <div className="toast">{toast}</div>}

      <main className="main">
        {emergencyMode ? (
          <>
            <div className="emergency-banner">
              <h2>{t("emergencyTitle")}</h2>
              <p>{t("emergencySubtitle")}</p>
            </div>
            {emergencyList.length === 0 ? (
              <p className="empty">{t("emergencyEmpty")}</p>
            ) : (
              emergencyList.map((ph, i) => (
                <div key={ph.id} className={`card ${i === 0 ? "nearest" : ""}`}>
                  {i === 0 && <div className="nearest-tag">★ {t("nearest")}</div>}
                  <h3>{ph.name}</h3>
                  <p className="muted">
                    {ph.area} · {ph.distance.toFixed(1)} {t("kmAway")}
                    {ph.onDuty && <span className="badge24">24h</span>}
                    <span className="src">{ph.fromOSM ? t("sourceOSM") : t("sourceLocal")}</span>
                  </p>
                  <div className="actions">
                    {ph.phone && (
                      <a className="btn primary" href={`tel:${ph.phone.replace(/\s/g, "")}`}>
                        📞 {t("callNow")}
                      </a>
                    )}
                    <a
                      className="btn dark"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${ph.lat},${ph.lng}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      🧭 {t("goNow")}
                    </a>
                  </div>
                </div>
              ))
            )}
            <button className="btn outline full" onClick={() => setEmergencyMode(false)}>
              {t("viewAll")} ({list.length})
            </button>
          </>
        ) : list.length === 0 ? (
          <p className="empty">{t("noResults")}</p>
        ) : (
          list.map((ph) => (
            <div key={ph.id} className="card" onClick={() => setSelected(ph)}>
              <div className="row">
                <span className={`dot ${ph.status.open ? "on" : "off"}`} />
                <div className="flex1">
                  <h3>{ph.name}</h3>
                  <p className="muted">
                    {ph.area} · {ph.distance.toFixed(1)} {t("kmAway")}
                  </p>
                  <p className={ph.status.open ? "open" : "closed"}>
                    {ph.status.open ? t("openNow") : t("closedNow")}
                    {ph.status.kind === "onDuty"
                      ? ` · ${t("onDutyLabel")}`
                      : ` · ${t(ph.status.kind, { time: fmtHour(ph.status.time) })}`}
                  </p>
                </div>
                <button
                  className="icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFav(ph.id);
                  }}
                >
                  {ph.isFavorite ? "♥" : "♡"}
                </button>
              </div>
            </div>
          ))
        )}
      </main>

      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="row between">
              <h2>{selected.name}</h2>
              <button className="icon-btn" onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>
            <p className={selected.status.open ? "open" : "closed"}>
              {selected.status.open ? t("openNow") : t("closedNow")}
            </p>
            <p className="muted">{selected.address || selected.area}</p>
            <p className="muted">
              {selected.distance.toFixed(1)} {t("kmAway")}
            </p>
            {selected.phone && (
              <p dir="ltr">
                <a href={`tel:${selected.phone.replace(/\s/g, "")}`}>{selected.phone}</a>
              </p>
            )}
            <div className="actions">
              {selected.phone && (
                <a className="btn primary" href={`tel:${selected.phone.replace(/\s/g, "")}`}>
                  {t("callNow")}
                </a>
              )}
              <a
                className="btn dark"
                href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                {t("goNow")}
              </a>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        Pharis v2 · OpenStreetMap · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
