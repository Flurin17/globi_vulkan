import Image from "next/image";
import { LocateFixed } from "lucide-react";
import type { ReactNode } from "react";

export default function RetailerMapShell({ count, onReset, children }: {
  count: number;
  onReset?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="native-map">
      <div className="native-map-heading">
        <Image src="/assets/globi-logo.svg" alt="Globi" width={118} height={40} unoptimized />
        <div><strong>Dein Globi ist ganz in der Nähe.</strong><span>Entdecke unsere Verkaufsstellen.</span></div>
        <button type="button" onClick={onReset} disabled={!onReset} className="map-reset"><LocateFixed size={17} /><span>Übersicht</span></button>
      </div>
      {children}
      <div className="native-map-caption" id="map-help"><span>{count} {count === 1 ? "Verkaufsstelle" : "Verkaufsstellen"} auf der Karte</span><span>Globi antippen für Details · Zahlen zeigen mehrere Händler</span></div>
    </div>
  );
}

export function RetailerMapLoading({ count = 37 }: { count?: number }) {
  return <RetailerMapShell count={count}><div className="native-map-canvas map-loading" role="status">Die Globi-Karte wird geladen …</div></RetailerMapShell>;
}
