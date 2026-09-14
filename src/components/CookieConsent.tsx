"use client";

import { Cookie, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  CONSENT_KEY, CONSENT_LIFETIME, createAnalyticsController, measurementId,
  parseConsent, type Consent,
} from "@/lib/analytics-consent";

const id = measurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);

export default function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState<Consent | null>(null);
  const [storageFailed, setStorageFailed] = useState(false);
  const settings = useRef<HTMLButtonElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const controller = useRef<ReturnType<typeof createAnalyticsController> | null>(null);
  const sessionConsent = useRef<Consent | null>(null);
  const sessionOnly = useRef(false);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const applyAnalytics = controller.current ??= createAnalyticsController(id);
    function restore() {
      let saved: Consent | null = null;
      try {
        saved = parseConsent(sessionOnly.current ? JSON.stringify(sessionConsent.current) : localStorage.getItem(CONSENT_KEY), id);
      } catch {
        saved = parseConsent(JSON.stringify(sessionConsent.current), id);
      }
      sessionConsent.current = saved;
      setConsent(saved);
      setOpen(!saved);
      applyAnalytics(saved?.analytics === true);
      if (expiryTimer.current) clearTimeout(expiryTimer.current);
      if (saved) {
        // Browsers clamp very long timeouts; recheck at least daily.
        expiryTimer.current = setTimeout(restore, Math.min(saved.expiresAt - Date.now(), 86400000));
      }
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === CONSENT_KEY || event.key === null) restore();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") restore();
    };
    restore();
    const interval = setInterval(restore, 86400000);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (expiryTimer.current) clearTimeout(expiryTimer.current);
      clearInterval(interval);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
      applyAnalytics(false);
    };
  }, []);

  function choose(analytics: boolean) {
    const next: Consent = { analytics, measurementId: id, expiresAt: Date.now() + CONSENT_LIFETIME };
    sessionConsent.current = next;
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
      sessionOnly.current = false;
      setStorageFailed(false);
    } catch {
      sessionOnly.current = true;
      setStorageFailed(true);
    }
    controller.current?.(analytics);
    setConsent(next);
    setOpen(false);
    settings.current?.focus({ preventScroll: true });
  }

  return (
    <>
      <button ref={settings} className="cookie-settings" type="button"
        aria-expanded={open} aria-controls="cookie-banner"
        onClick={() => { setOpen(true); requestAnimationFrame(() => title.current?.focus({ preventScroll: true })); }}>
        Cookie-Einstellungen
      </button>
      <span className="sr-only" role="status">
        {storageFailed ? "Deine Auswahl gilt für diesen Besuch. Dein Browser konnte sie nicht speichern." : ""}
      </span>
      {open ? (
        <section id="cookie-banner" className="cookie-banner" aria-labelledby="cookie-title"
          onKeyDown={(event) => {
            if (event.key === "Escape" && consent) {
              setOpen(false);
              settings.current?.focus({ preventScroll: true });
            }
          }}>
          <div className="cookie-symbol" aria-hidden="true"><Cookie size={27} strokeWidth={1.7} /></div>
          <div className="cookie-copy">
            <p className="eyebrow">Du hast die Wahl</p>
            <h2 id="cookie-title" ref={title} tabIndex={-1}>Ein paar Cookies<span>?</span></h2>
            <p>Mit deiner Erlaubnis nutzen wir Google Analytics, um zu verstehen,
              wie unsere Website besucht wird, und sie zu verbessern.
              Ohne dein Okay bleibt die Statistik aus.</p>
            {!id ? <p className="cookie-note">Google Analytics ist zurzeit nicht aktiv.</p> : null}
            <details className="cookie-details">
              <summary>Was wird gespeichert?</summary>
              <p>Deine Auswahl speichern wir für 180 Tage in diesem Browser.
                Google Analytics darf nur mit deiner Zustimmung Cookies setzen und
                Nutzungsdaten wie Seitenaufrufe und Geräteinformationen an Google
                übermitteln. Dabei kann eine Verarbeitung in den USA stattfinden.
                Über «Cookie-Einstellungen» im Footer kannst du jederzeit ablehnen;
                dann stoppen wir die Analyse und löschen die Analytics-Cookies dieser Website.{" "}
                <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">Mehr zum Datenschutz bei Google</a>.</p>
            </details>
          </div>
          <div className="cookie-actions">
            <button type="button" className="button button-outline" onClick={() => choose(false)}>Nur notwendige</button>
            <button type="button" className="button button-blue" onClick={() => choose(true)}>Analytics erlauben</button>
          </div>
          {consent ? <button type="button" className="cookie-close" aria-label="Cookie-Einstellungen schliessen"
            onClick={() => { setOpen(false); settings.current?.focus({ preventScroll: true }); }}><X size={18} /></button> : null}
        </section>
      ) : null}
    </>
  );
}
