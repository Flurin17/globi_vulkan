"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  Map,
  Search,
  X,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { directionsUrl, filterRetailers, type Retailer } from "@/lib/retailers";

const RetailerMap = dynamic(() => import("./RetailerMap"), {
  ssr: false,
  loading: () => <div className="map-loading" role="status">Die Globi-Karte wird geladen …</div>,
});

export default function RetailerFinder({
  retailers,
}: {
  retailers: Retailer[];
}) {
  const [query, setQuery] = useState("");
  const [map, setMap] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const finderRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const results = useMemo(
    () =>
      filterRetailers(retailers, query).sort((a, b) =>
        a.postcode.localeCompare(b.postcode),
      ),
    [retailers, query],
  );
  const visible = query.trim() || expanded ? results : results.slice(0, 6);

  useEffect(() => {
    const element = finderRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setMapReady(true);
        observer.disconnect();
      }
    }, { rootMargin: "300px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="finder" ref={finderRef}>
      <div className="finder-controls">
        <div className="search-field">
          <Search size={21} aria-hidden="true" />
          <label className="sr-only" htmlFor="retailer-search">
            Ort, Postleitzahl oder Händler suchen
          </label>
          <input
            id="retailer-search"
            placeholder="Dein Ort, deine PLZ oder dein Händler"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Suche löschen"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className={`button button-outline map-toggle ${map ? "active" : ""}`}
          aria-expanded={map}
          aria-controls="retailer-map"
          onClick={() => setMap((v) => !v)}
        >
          <Map size={19} />
          {map ? "Karte schliessen" : "Karte öffnen"}
        </button>
      </div>
      {map ? (
        <div className="retailer-map" id="retailer-map">
          {mapReady ? <RetailerMap retailers={results} /> : (
            <div className="map-loading" role="status">Die Globi-Karte wird geladen …</div>
          )}
        </div>
      ) : null}
      <div className="finder-summary">
        <p role="status">
          {results.length}{" "}
          {results.length === 1 ? "Verkaufsstelle" : "Verkaufsstellen"}
          {query.trim() ? " gefunden" : " in der Schweiz"}
        </p>
        <span>Nur im ausgewählten Fachhandel</span>
      </div>
      {results.length ? (
        <ul className="retailer-list">
          {visible.map((retailer) => (
            <li key={retailer.id} className="retailer">
              <div className="retailer-location">
                <MapPin size={17} />
                <span>
                  {retailer.postcode} {retailer.town}
                </span>
              </div>
              <div className="retailer-detail">
                <h3>{retailer.name}</h3>
                <p>{retailer.address}</p>
                {retailer.note ? (
                  <p className="retailer-note">{retailer.note}</p>
                ) : null}
                {retailer.website ? (
                  <a
                    className="retailer-website"
                    href={retailer.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Website <ExternalLink size={12} />
                    <span className="sr-only">
                      {" "}
                      von {retailer.name} (neuer Tab)
                    </span>
                  </a>
                ) : null}
              </div>
              <a
                className="directions-link"
                href={directionsUrl(retailer)}
                target="_blank"
                rel="noreferrer"
              >
                <span>Route</span>
                <ArrowUpRight size={19} />
                <span className="sr-only">
                  {" "}
                  zu {retailer.name}, {retailer.town} (Google Maps, neuer Tab)
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-results">
          <MapPin size={30} />
          <h3>Hier haben wir noch nichts gefunden.</h3>
          <p>
            Versuche einen anderen Ort, eine PLZ oder den Namen deines Händlers.
          </p>
          <button
            className="text-link"
            type="button"
            onClick={() => setQuery("")}
          >
            Alle Verkaufsstellen anzeigen <ArrowUpRight size={16} />
          </button>
        </div>
      )}
      {!query.trim() && !expanded ? (
        <button
          type="button"
          className="button button-blue all-retailers"
          onClick={() => setExpanded(true)}
        >
          Alle {retailers.length} Verkaufsstellen anzeigen{" "}
          <ArrowUpRight size={18} />
        </button>
      ) : null}
      <p className="availability-note">
        Vorfreude ist gut. Nachfragen ist besser: Erkundige dich direkt beim
        Händler nach Verfügbarkeit und Öffnungszeiten.
      </p>
    </div>
  );
}
