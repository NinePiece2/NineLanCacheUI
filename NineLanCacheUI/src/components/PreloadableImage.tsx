"use client";

import React, { useState, useRef } from "react";
import NextImage from "next/image";
import { imageCache } from "@/lib/ImageCache";
import { STEAM_HEADER_URL, STEAM_FALLBACK_URL } from "@/lib/recentDownloadsTypes";

export const PreloadableImage = ({
  appId,
  width = 184,
  height = 69,
}: {
  appId: number;
  width?: number;
  height?: number;
}) => {
  const imageUrl = STEAM_HEADER_URL(appId);
  const fallbackUrl = STEAM_FALLBACK_URL;

  const [currentSrc, setCurrentSrc] = useState(imageUrl);
  const hasErrored = useRef(false);

  const handleError = () => {
    if (!hasErrored.current) {
      hasErrored.current = true;
      setCurrentSrc(fallbackUrl);
      imageCache.setStatus(imageUrl, "missing");
    }
  };

  const handleLoad = () => {
    if (currentSrc === imageUrl) {
      imageCache.setStatus(imageUrl, "exists");
    }
  };

  return (
    <div className="flex items-center justify-center">
      <a href={`https://steamdb.info/app/${appId}/`} target="_blank" rel="noopener noreferrer">
        {currentSrc === fallbackUrl ? (
          <object
            data={fallbackUrl}
            type="image/svg+xml"
            width={width}
            height={height}
            className="object-cover rounded shadow bg-muted"
          >
            <div
              className="flex items-center justify-center"
              style={{ width: `${width}px`, height: `${height}px` }}
            >
              Steam App
            </div>
          </object>
        ) : (
          <NextImage
            src={imageUrl}
            alt={`App ${appId}`}
            width={width}
            height={height}
            className="object-cover rounded shadow bg-muted"
            loading="lazy"
            onError={handleError}
            onLoad={handleLoad}
            quality={75}
            priority={false}
          />
        )}
      </a>
    </div>
  );
};

export default PreloadableImage;
