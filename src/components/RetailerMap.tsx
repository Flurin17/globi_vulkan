"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { ArrowUpRight, ExternalLink, X } from "lucide-react";
import RetailerMapShell from "./RetailerMapShell";
import { directionsUrl, type Retailer } from "@/lib/retailers";

const logo = "/assets/globi-logo.svg";
const swissBounds: L.LatLngBoundsExpression = [[46.5, 7.05], [47.8, 9.65]];

export default function RetailerMap({ retailers }: { retailers: Retailer[] }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tileError, setTileError] = useState(false);
  const selected = retailers.find((retailer) => retailer.id === selectedId);

  useEffect(() => {
    if (!container.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const map = L.map(container.current, {
      scrollWheelZoom: false,
      zoomControl: false,
      minZoom: 6,
      maxZoom: 18,
      zoomSnap: 0.5,
      zoomAnimation: !reduced,
      fadeAnimation: !reduced,
      markerZoomAnimation: !reduced,
    });
    mapRef.current = map;
    map.attributionControl.setPrefix(false);
    L.control.zoom({ position: "bottomright", zoomInTitle: "Vergrössern", zoomOutTitle: "Verkleinern" }).addTo(map);
    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    tiles.on("tileerror", () => setTileError(true));
    tiles.on("tileload", () => setTileError(false));
    const clusters = L.markerClusterGroup({
      animate: !reduced,
      maxClusterRadius: 48,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster) => {
        const badge = document.createElement("span");
        badge.className = "globi-cluster-count";
        badge.textContent = String(cluster.getChildCount());
        const icon = L.divIcon({ className: "globi-cluster", html: badge, iconSize: [44, 44] });
        const createIcon = icon.createIcon.bind(icon);
        icon.createIcon = (oldIcon) => {
          const element = createIcon(oldIcon);
          element.setAttribute("aria-label", `${cluster.getChildCount()} Verkaufsstellen: Kartenausschnitt vergrössern`);
          element.onkeydown = (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            L.DomEvent.stop(event);
            setSelectedId(null);
            if (map.getZoom() === map.getMaxZoom()) cluster.spiderfy();
            else cluster.zoomToBounds();
          };
          return element;
        };
        return icon;
      },
    });
    clusters.on("clusterclick", () => setSelectedId(null));
    clusterRef.current = clusters;
    map.addLayer(clusters);
    map.fitBounds(swissBounds, { animate: false });
    const resize = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
      const bounds = clusters.getBounds();
      map.fitBounds(bounds.isValid() ? bounds : swissBounds, { padding: [45, 55], maxZoom: 14, animate: false });
    });
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const clusters = clusterRef.current;
    if (!map || !clusters) return;
    clusters.clearLayers();
    for (const retailer of retailers) {
      const badge = document.createElement("span");
      badge.className = "globi-pin-badge";
      const img = document.createElement("img");
      img.src = logo;
      img.alt = "";
      img.width = 55;
      img.height = 22;
      badge.append(img);
      const marker = L.marker(retailer.coordinates, {
        icon: L.divIcon({ className: "globi-map-pin", html: badge, iconSize: [68, 40], iconAnchor: [34, 40] }),
        title: `${retailer.name}, ${retailer.town}`,
        alt: `${retailer.name}, ${retailer.town}`,
        keyboard: true,
        autoPanOnFocus: false,
      });
      marker.on("click", () => {
        setSelectedId(retailer.id);
      });
      marker.on("add", () => {
        const element = marker.getElement();
        if (!element) return;
        element.setAttribute("aria-label", `${retailer.name}, ${retailer.town}: Details anzeigen`);
        element.onkeydown = (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          L.DomEvent.stop(event);
          marker.fire("click");
        };
      });
      clusters.addLayer(marker);
    }
    map.fitBounds(retailers.length ? L.latLngBounds(retailers.map((retailer) => retailer.coordinates)) : swissBounds,
      { padding: [45, 55], maxZoom: 14, animate: false });
  }, [retailers]);

  function resetView() {
    setSelectedId(null);
    mapRef.current?.fitBounds(retailers.length ? L.latLngBounds(retailers.map((retailer) => retailer.coordinates)) : swissBounds,
      { padding: [45, 55], maxZoom: 14, animate: false });
  }

  return (
    <RetailerMapShell count={retailers.length} onReset={resetView}>
      <div className="native-map-viewport">
        <div ref={container} className="native-map-canvas" role="region" aria-label="Interaktive Karte der Globi-Vulkan Verkaufsstellen" aria-describedby="map-help" />
        {!retailers.length && <div className="map-notice">Keine Verkaufsstellen für diese Suche.</div>}
        {tileError && <div className="map-notice" role="status">Die Hintergrundkarte ist gerade nicht verfügbar. Alle Adressen findest du unten.</div>}
      </div>
      {selected ? (
        <div className="map-selection" aria-live="polite">
          <div>
            <span className="map-selection-town">{selected.postcode} {selected.town}</span>
            <h3>{selected.name}</h3>
            <p>{selected.address}{selected.note ? ` · ${selected.note}` : ""}</p>
            {selected.website ? (
              <a className="retailer-website" href={selected.website} target="_blank" rel="noreferrer">
                Website <ExternalLink size={12} />
                <span className="sr-only"> von {selected.name} (neuer Tab)</span>
              </a>
            ) : null}
          </div>
          <a className="button button-blue" href={directionsUrl(selected)} target="_blank" rel="noreferrer">Route planen <ArrowUpRight size={17} /><span className="sr-only"> (Google Maps, neuer Tab)</span></a>
          <button className="map-close" onClick={() => setSelectedId(null)} type="button" aria-label="Händlerdetails schliessen"><X size={18} /></button>
        </div>
      ) : null}
    </RetailerMapShell>
  );
}
