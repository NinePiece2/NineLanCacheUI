# NineLanCacheUI

## Table Of Contents
- [NineLanCacheUI](#ninelancacheui)
  - [Table Of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Screenshots](#screenshots)
  - [Install/Run Instructions](#installrun-instructions)
    - [Docker Compose File:](#docker-compose-file)
    - [Configuration variable explanation](#configuration-variable-explanation)
  - [Issue: My access.log file is updated but my DeveLanCacheUI\_Backend isn't reading the new lines](#issue-my-accesslog-file-is-updated-but-my-develancacheui_backend-isnt-reading-the-new-lines)
  - [References:](#references)


## Introduction

| CI Status |
|-----------|
| [![UI Build](https://img.shields.io/github/actions/workflow/status/NinePiece2/NineLanCacheUI/build-ui.yml?label=UI%20Build&logo=github&style=flat-square)](https://github.com/NinePiece2/NineLanCacheUI/actions/workflows/build-ui.yml) [![API Build](https://img.shields.io/github/actions/workflow/status/NinePiece2/NineLanCacheUI/build-api.yml?label=API%20Build&logo=github&style=flat-square)](https://github.com/NinePiece2/NineLanCacheUI/actions/workflows/build-api.yml) [![UI Pulls](https://img.shields.io/docker/pulls/ninepiece2/nine-lancache-ui.svg?label=UI%20Pulls&logo=docker&style=flat-square)](https://hub.docker.com/r/ninepiece2/nine-lancache-ui/tags?name=UI) [![API Pulls](https://img.shields.io/docker/pulls/ninepiece2/nine-lancache-ui.svg?label=API%20Pulls&logo=docker&style=flat-square)](https://hub.docker.com/r/ninepiece2/nine-lancache-ui/tags?name=API) |

Based on [DeveLanCacheUI_Backend](https://github.com/devedse/DeveLanCacheUI_Backend) / [DeveLanCacheUI_Frontend](https://github.com/devedse/DeveLanCacheUI_Frontend)
Directly forking the DeveLanCacheUI_Backend project and creating a new UI for [LanCache.NET](https://lancache.net/). This is done using Syncfusion grids and pie charts for an improved look and better data filtering and visualization. There are also filters that are perisitant throughout certain pages and through closing and reopening the page that allow for time filtration and showing or hiding excluded IPs.

The Backend/API runs a .NET 9 Web API and the Frontend/UI uses NextJS and Nginx. 

## Screenshots

Shows a few statistics about the usage per service:

[<img src=images/Dashboard.png height=400>](images/Dashboard.png)

Shows a graph for the outbound usage of a given interface (Changable in Settings):

[<img src=images/DashboardSpeed.png height=300>](images/DashboardSpeed.png)

Shows recent downloads by service:

[<img src=images/RecentDownloads.png height=400>](images/RecentDownloads.png)

Shows recent download steam games and their download progress based on manifest size:

[<img src=images/RecentSteamDownloads.png height=400>](images/RecentSteamDownloads.png)

Shows all games that have been downloaded through steam:

[<img src=images/AllSteamGames.png height=400>](images/AllSteamGames.png)

Shows the hit and miss statistics of every client:

[<img src=images/StatsPage.png height=400>](images/StatsPage.png)

Shows the settings page where the active interface can be selected for the graph and excluded IPs can be added:

[<img src=images/SettingsPage.png height=375>](images/SettingsPage.png)

## Install/Run Instructions
1. Create a folder somewhere on the system for the persistant data to be stored. For exmple ```mkdir backendData``` then give it permissions with something like ```chown 777 backendData```.
2. Update the docker-compose.yml volumes to match your LanCache Logs folder and the new persistant data folder
3. Change the Timezone and Lang information to help with debugging inside the container.
4. Change the dns to your LanCache.
5. Run ```docker compose up -d```
6. Visit http://LanCacheIP:8080 where LanCacheIP is the machine that is running NineLanCacheUI (In my case 192.168.15.200).
   
### Docker Compose File:

docker-compose.yml:
```yml
services:
  api:
    image: ninepiece2/nine-lancache-ui:api
    restart: unless-stopped
    network_mode: "host"
    environment:
      - LanCacheLogsDirectory=/var/ninelancacheui/lancachelogs
      - LanCacheUIDataDirectory=/var/ninelancacheuidata
      - ConnectionStrings__DefaultConnection=Data Source={LanCacheUIDataDirectory}/database/nine-lancache-ui.db;
      - TZ=America/Toronto
      - ASPNETCORE_ENVIRONMENT=Production
      - LANG=en_CA.UTF-8
      - DirectSteamIntegration=false
      - SkipLinesBasedOnBytesRead=false
      - ASPNETCORE_HTTP_PORTS=7401
    volumes:
      - "/home/romit/NineLanCacheUI/backendData:/var/ninelancacheuidata"
      - "/mnt/NvmeSSD/LanCacheData/logs:/var/ninelancacheui/lancachelogs:ro"
    dns:
      - 192.168.15.200
  ui:
    image: ninepiece2/nine-lancache-ui:ui
    restart: unless-stopped
    network_mode: "host"
    environment:
      - API_BASE_URL=http://localhost:7401
      - API_PORT=7401
      - AllowedHosts=*
```

### Configuration variable explanation

**Environment Variables API**

| Variable  | Explanation | Default | 
| -- | -- | -- |
| LanCacheLogsDirectory | The internal folder inside the container the backend tries to look for the lancache log files. Ideally don't touch this. | /var/ninelancacheui/lancachelogs |
| LanCacheUIDataDirectory | The internal folder inside the container the backend stores all it's data. Ideally don't touch this. | /var/ninelancacheuidata |
| ConnectionStrings__DefaultConnection | The connection string used with SQLite. Ideally don't touch this. | Data Source={LanCacheUIDataDirectory}/database/nine-lancache-ui.db; |
| TZ | Set this to your timezone | ?? |
| LANG | Set this to your language | ?? |
| DirectSteamIntegration | When false, the backend will download a .CSV file with all depot => steam game mappings (from: https://github.com/devedse/DeveLanCacheUI_SteamDepotFinder_Runner/releases). When true, the tool wil generate this itself / keep it up to date. I would suggest turning this on. | false (for now) |
| SkipLinesBasedOnBytesRead | When false, it will re-read through the whole file on startup. When true, it tries to be smart and start reading from where it last left off. I would suggest turning this on. | false (for now) |

**Volume Mounts API**

| Path  | Explanation | 
| -- | -- |
| - "/home/romit/NineLanCacheUI/backendData:/var/ninelancacheuidata" | Change the part before the `:` to an empty data directory |
| - "/mnt/NvmeSSD/LanCacheData/logs:/var/ninelancacheui/lancachelogs:ro" | Change the part before the `:` to the log directory for lancache |

**Environment Variables UI**

| Variable  | Explanation | Default | 
| -- | -- | -- |
| AllowedHosts | Sets the HOSTS header for CORS. Leave at * unless you know what you're doing | * |
| API_BASE_URL | The backend url where the frontend connects to. | http://localhost:7401 |
| API_PORT | The backend port where the frontend connects to in nginx. | 7401 |

## Issue: My access.log file is updated but my DeveLanCacheUI_Backend isn't reading the new lines

So apparently if the access.log file is in a SMB Share which is mounted in docker the DeveLanCacheUI_Backend application takes a READ lock on the share. This apparently lets CIFS decide that no other applications will write to this file which allows it to cache things.
If you manually execute the `ls` command in the lancachelogs directory it will in fact start reading the file again.

To work around this issue you need to add `cache=none` to the CIFS mount in `/etc/fstab`:
```
//192.168.2.201/DockerComposers /mnt/mynas/DockerComposers cifs credentials=/home/pi/.mynascredentialssmb,iocharset=utf8,vers=3.0,sec=ntlmssp,cache=none 0 0
```


## References:
- https://github.com/devedse/DeveLanCacheUI_Backend?tab=readme-ov-file