"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowUpRight, Play } from "lucide-react";

export default function ProductVideo() {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="video-wrap">
      <div className="video-frame">
        {playing ? (
          <iframe
            src="https://www.youtube-nocookie.com/embed/yGuuYAInBBg?autoplay=1&rel=0"
            title="Globi-Vulkan – originaler Produktfilm"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            className="video-preview"
            onClick={() => setPlaying(true)}
            aria-label="Globi-Vulkan Produktfilm abspielen (YouTube laden)"
          >
            <Image
              src="/assets/video-poster.jpg"
              alt="Goldene Funkenfontäne des Globi-Vulkans bei Nacht"
              fill
              sizes="(max-width: 800px) 100vw, 60vw"
            />
            <span className="play-disc">
              <Play size={26} fill="currentColor" />
            </span>
            <span className="video-label">
              Globi in Aktion <ArrowUpRight size={19} />
            </span>
          </button>
        )}
      </div>
      {playing ? (
        <p className="video-help">
          Video lädt nicht?{" "}
          <a
            href="https://www.youtube.com/watch?v=yGuuYAInBBg"
            target="_blank"
            rel="noreferrer"
          >
            Auf YouTube ansehen
          </a>
          .
        </p>
      ) : (
        <p className="video-help">
          Mit dem Abspielen wird das Video von YouTube geladen.
        </p>
      )}
    </div>
  );
}
