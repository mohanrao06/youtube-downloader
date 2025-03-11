const apiKey = "AIzaSyAqlhGyZUTLMn4-AuC_tyMrNl2lv6M2SNQ"; // Replace with your YouTube API Key

const backendURL = "https://youtube-downloader-b2nm.onrender.com";

const playlists = [
    { id: "PLgUwDviBIf0rGlzIn_7rsaR2FQ5e6ZOL9", name: "Recursion" },
    { id: "PLabc123xyz456", name: "Playlist 2" },
    { id: "PLxyz789def123", name: "Playlist 3" }
];

const playlistButtons = document.getElementById("playlistButtons");
const playlistTitle = document.getElementById("playlistTitle");
const videoList = document.getElementById("videoList");
const downloadedVideosContainer = document.getElementById("downloadedVideos");
const refreshButton = document.getElementById("refreshButton");

let currentPlaylistId = null; // Track the currently loaded playlist

// Create playlist buttons
playlists.forEach(playlist => {
    const btn = document.createElement("button");
    btn.innerText = playlist.name;
    btn.classList.add("playlist-btn");
    btn.onclick = () => loadVideos(playlist.id, playlist.name);
    playlistButtons.appendChild(btn);
});

// Fetch and display videos
async function loadVideos(playlistId, name) {
    if (playlistId === currentPlaylistId) return;

    playlistTitle.innerText = name;
    currentPlaylistId = playlistId;
    videoList.innerHTML = "";

    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=10&key=${apiKey}`);
        const data = await response.json();

        videoList.innerHTML = "";

        data.items.forEach(item => {
            const videoId = item.snippet.resourceId.videoId;
            const title = item.snippet.title;
            const videoElement = document.createElement("div");
            videoElement.classList.add("video-box");
            videoElement.innerHTML = `
                <h4>${title}</h4>
                <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>
                <br>
                <button class="btn" onclick="downloadVideo(event, '${videoId}')">Download</button>
            `;
            videoList.appendChild(videoElement);
        });

        updateDownloadedVideos();
    } catch (error) {
        console.error("Error loading videos:", error);
    }
}

// Download video and refresh list
async function downloadVideo(event, videoId) {
    event.preventDefault();
    event.stopPropagation();

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
        const response = await fetch(`${backendURL}/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: videoUrl })
        });

        if (!response.ok) throw new Error(`Server Error: ${response.status}`);

        const data = await response.json();

        if (data.video_id) {
            showProgress(data.video_id);
        }
    } catch (error) {
        console.error("Download Error:", error);
        alert("Error: " + error.message);
    }
}

// Fetch and display downloaded videos
async function updateDownloadedVideos() {
    try {
        const response = await fetch(`${backendURL}/downloaded_videos`);
        const data = await response.json();

        downloadedVideosContainer.innerHTML = "";

        data.videos.forEach(filename => {
            const videoElement = document.createElement("div");
            videoElement.classList.add("video-box");
            videoElement.innerHTML = `
                <p>${filename}</p>
                <video controls width="320">
                    <source src="${backendURL}/get_video/${filename}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            `;
            downloadedVideosContainer.appendChild(videoElement);
        });
    } catch (error) {
        console.error("Failed to fetch downloaded videos:", error);
    }
}

// Show download progress
async function showProgress(videoId) {
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    progressBar.style.display = "block";

    let retries = 0;

    while (retries < 50) {
        try {
            const response = await fetch(`${backendURL}/progress/${videoId}`);
            const data = await response.json();

            if (data.status === "Completed") {
                progressBar.value = 100;
                progressText.innerText = "Download Complete!";
                break;
            } else if (data.status === "Failed") {
                progressText.innerText = "Download Failed!";
                break;
            } else {
                const progressValue = typeof data.progress === 'string' ? parseInt(data.progress.replace('%', '')) : 0;
                progressBar.value = progressValue;
                progressText.innerText = `Downloading: ${data.progress || '0%'}`;
            }

            await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
            console.error("Error fetching progress:", error);
            break;
        }
        retries++;
    }
}

// Add event listener for the refresh button
refreshButton.onclick = () => updateDownloadedVideos();

// Load downloaded videos on page load
updateDownloadedVideos();
