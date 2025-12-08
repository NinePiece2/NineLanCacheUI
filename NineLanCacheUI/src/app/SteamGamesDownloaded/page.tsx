"use client";
import { useEffect, useState, useRef } from "react";
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
  const fallbackUrl = "https://steamdb.info/static/img/applogo.svg";
  
  const [currentSrc, setCurrentSrc] = useState(imageUrl);
  const hasErrored = useRef(false);

  const handleError = () => {
    console.log('Image error for appId:', appId, 'hasErrored:', hasErrored.current);
    if (!hasErrored.current) {
      hasErrored.current = true;
      setCurrentSrc(fallbackUrl);
      console.log('Switched to fallback for appId:', appId);
      imageCache.setStatus(imageUrl, 'missing');
    }
  };

  const handleLoad = () => {
    if (currentSrc === imageUrl) {
      imageCache.setStatus(imageUrl, 'exists');
    }
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
        {currentSrc === fallbackUrl ? (
          <object
            data={fallbackUrl}
            type="image/svg+xml"
            width={368}
            height={172}
            className="object-cover rounded shadow bg-gray-900"
          >
            <div className="flex items-center justify-center" style={{width: '368px', height: '172px'}}>Steam App</div>
          </object>
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
            <PreloadableImage key={game.appid} appId={game.appid} />
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
