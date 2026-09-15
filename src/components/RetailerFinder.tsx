"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { RetailerMapLoading } from "./RetailerMapShell";
import { ArrowUpRight, MapPin, ExternalLink } from "lucide-react";
import { directionsUrl, type Retailer } from "@/lib/retailers";

const RetailerMap = dynamic(() => import("./RetailerMap"), {
  ssr: false,
  loading: () => <RetailerMapLoading />,
});

export default function RetailerFinder({
  retailers,
}: {
  retailers: Retailer[];
}) {
  const [mapReady, setMapReady] = useState(false);
  const finderRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const results = useMemo(
    () =>
      [...retailers].sort((a, b) => a.postcode.localeCompare(b.postcode)),
    [retailers],
  );
  const visible = expanded ? results : results.slice(0, 6);

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
      <div className="retailer-map" id="retailer-map">
        {mapReady ? <RetailerMap retailers={results} /> : (
          <RetailerMapLoading count={results.length} />
        )}
      </div>
      <div className="finder-summary">
        <p role="status">
          {results.length}{" "}
          {results.length === 1 ? "Verkaufsstelle" : "Verkaufsstellen"} in der
          Schweiz
        </p>
        <span>Nur im ausgewählten Fachhandel</span>
      </div>
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
      {!expanded ? (
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
