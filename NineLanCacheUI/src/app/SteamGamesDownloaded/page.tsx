"use client";
import { useEffect, useState } from "react";
import NextImage from "next/image";
import { PagerComponent } from "@syncfusion/ej2-react-grids";
import Button from "../../components/Button";
import { getSignalRConnection, startConnection } from "../../../lib/SignalR";
import { imageCache } from "../../../lib/ImageCache";

type Game = {
  appid: number;
  name: string;
};

const PAGE_SIZE = 6;

const PreloadableImage = ({ appId }: { appId: number }) => {
  const imageUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
  
  // Initialize with cache check
  const [imageError, setImageError] = useState(() => {
    return imageCache.getStatus(imageUrl) === 'missing';
  });

  // Check cache asynchronously for unknown status
  useEffect(() => {
    const cachedStatus = imageCache.getStatus(imageUrl);
    if (cachedStatus === 'unknown') {
      imageCache.checkImageExists(imageUrl).then(status => {
        if (status === 'missing') {
          setImageError(true);
        }
      });
    }
  }, [imageUrl]);

  const handleError = () => {
    setImageError(true);
    imageCache.setStatus(imageUrl, 'missing');
  };

  const handleLoad = () => {
    imageCache.setStatus(imageUrl, 'exists');
  };

  return (
    <div className="flex items-center justify-center">
      <a
        className="flex w-full h-full align-items-center justify-center"
        href={`https://steamdb.info/app/${appId}/`}
        target="_blank"
        rel="noopener noreferrer"
        style={{maxHeight: "215px"}}
      >
        {imageError ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 184 69"
            className="h-full p-0"
            preserveAspectRatio="none"
          >
            <path
              fill="#444"
              fillRule="evenodd"
              d="M106.626 37.655a10.524 10.432 0 00-5.117 1.467L60.222 21.176c-1.153-4.773-5.397-8.314-10.456-8.314C43.82 12.862 39 17.752 39 23.786c0 6.033 4.82 10.924 10.766 10.924a10.534 10.442 0 005.725-1.67l40.83 17.54c.928 5.077 5.314 8.92 10.585 8.92 5.8 0 10.53-4.655 10.757-10.484l14.26-10.98C139.23 37.514 145 31.333 145 23.786c0-7.89-6.303-14.286-14.078-14.286-7.697 0-13.95 6.267-14.076 14.046zm24.71-4.206c5.488 0 9.937-4.514 9.937-10.083 0-5.57-4.449-10.084-9.938-10.084-5.487 0-9.936 4.514-9.936 10.083 0 5.57 4.449 10.084 9.936 10.084zm0-2.94c3.887 0 7.04-3.199 7.04-7.144 0-3.944-3.153-7.143-7.04-7.143s-7.039 3.199-7.039 7.143c0 3.945 3.15 7.144 7.04 7.144zm-84.004-.977c-2.617-1.17-4.822-4.778-3.262-8.533 1.51-3.632 5.257-4.391 7.475-3.802 3.34.886 4.01 3.681 5.255 2.86 1.422-.94-.936-3.868-4.3-4.918-3.526-1.1-8.812.433-10.64 5.513-1.926 5.35 1.962 9.644 4.273 10.713 2.312 1.07 6.041 1.797 5.916-.256-.103-1.701-2.1-.406-4.717-1.577zm61.72 12.772c2.674 1.03 5.062 4.516 3.698 8.347-1.32 3.708-5.023 4.666-7.269 4.195-3.38-.708-4.194-3.464-5.395-2.576-1.37 1.013 1.134 3.811 4.548 4.68 3.577.912 8.778-.899 10.342-6.069 1.647-5.445-2.457-9.526-4.82-10.472-2.364-.946-6.126-1.473-5.895.57.19 1.693 2.117.295 4.791 1.325z"
            />
          </svg>
        ) : (
          <NextImage
            src={imageUrl}
            alt={`App ${appId}`}
            width={368}
            height={172}
            className="object-cover rounded shadow bg-gray-900"
            loading="lazy"
            onError={handleError}
            onLoad={handleLoad}
            quality={75}
          />
        )}
      </a>
    </div>
  );
};

export default function SteamGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    fetch("/api/proxy/SteamGames/GetSteamGames")
      .then((res) => res.json())
      .then((data: Game[]) => {
        // Deduplicate by appid to prevent memory bloat
        const uniqueGames = Array.from(
          new Map(data.map(game => [game.appid, game])).values()
        );
        setGames(uniqueGames);
      })
      .catch((err) => {
        console.error("Error fetching games:", err);
      });
  }, []);

  const filteredGames = games.filter((game) => {
    if (!filterText.trim()) return true;
    const lowerFilter = filterText.toLowerCase();
    return (
      game.name.toLowerCase().includes(lowerFilter) ||
      game.appid.toString().includes(lowerFilter)
    );
  });

  const totalPages = Math.ceil(filteredGames.length / PAGE_SIZE) || 1;
  const effectiveCurrentPage = currentPage > totalPages ? 1 : currentPage;

  const pagedGames = filteredGames.slice((effectiveCurrentPage - 1) * PAGE_SIZE, effectiveCurrentPage * PAGE_SIZE);

  const handlePageChange = (e: { currentPage: number }) => {
    setCurrentPage(e.currentPage);
  };

  const handleFilterChange = (value: string) => {
    setFilterText(value);
    setCurrentPage(1);
  };

   useEffect(() => {
       const connection = getSignalRConnection();
   
       const handler = () => {
         fetch("/api/proxy/SteamGames/GetSteamGames")
          .then((res) => res.json())
          .then((data: Game[]) => {
            // Deduplicate by appid to prevent memory bloat
            const uniqueGames = Array.from(
              new Map(data.map(game => [game.appid, game])).values()
            );
            setGames(uniqueGames);
          })
          .catch((err) => {
            console.error("Error fetching games:", err);
          });
       };
   
       connection.on("UpdateDownloadEvents", handler);
   
       startConnection();
   
       return () => {
         connection.off("UpdateDownloadEvents", handler);
       };
     }, []);

  return (
    <div className="p-8 mx-auto" style={{ width: "95%"}}>
        <div className="mb-4 flex items-center gap-2" style={{ maxWidth: "25%", minWidth: "200px" }}>
            <input
                type="text"
                placeholder="Search by Name or AppId..."
                value={filterText}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="p-2 grow rounded border border-gray-600 text-white"
                style={{ backgroundColor: "#121212", color: "#ffffff", marginBottom: "0" }}
            />
            <Button
                onClick={() => handleFilterChange("")}
                disabled={!filterText.trim()}
                className={`p-2 rounded text-white ${
                filterText.trim()
                    ? "bg-gray-700 hover:bg-gray-600 cursor-pointer"
                    : "bg-gray-900 cursor-not-allowed opacity-50"
                }`}
                aria-label="Clear filter"
                type="button"
            >
                Clear
            </Button>
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {pagedGames.map((game, idx) => (
            <div key={idx} className="rounded shadow-lg p-4" style={{ backgroundColor: "#1a1a1a" }}>
            <PreloadableImage appId={game.appid} />
            <h2 className="text-lg font-bold text-center">{game.name}</h2>
            </div>
        ))}
        {filteredGames.length === 0 && (
            <p className="text-center col-span-full text-gray-400">No games found</p>
        )}
        </div>

        <div className="mt-8 flex justify-center " style={{ position:"revert"}}>
        <PagerComponent
            currentPage={effectiveCurrentPage}
            totalRecordsCount={filteredGames.length}
            pageSize={PAGE_SIZE}
            click={handlePageChange}
        />
        </div>
    </div>
    );
}
