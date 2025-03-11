const apiKey = "AIzaSyAqlhGyZUTLMn4-AuC_tyMrNl2lv6M2SNQ"; // Replace with your YouTube API Key

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
    if (playlistId === currentPlaylistId) return; // Skip if the same playlist is selected

    playlistTitle.innerText = name;
    currentPlaylistId = playlistId;

    if (videoList.children.length === 0) { // Prevent unnecessary clearing
        videoList.innerHTML = "";
    }

    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=10&key=${apiKey}`);
        const data = await response.json();

        videoList.innerHTML = ""; // Clear the video list before rendering new videos

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
    console.log("Download button clicked"); // Debugging
    event.preventDefault(); // Prevent default button behavior
    event.stopPropagation(); // Stop event bubbling

    console.log("Video ID:", videoId); // Debugging

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
        console.log("Sending download request..."); // Debugging
        const response = await fetch('http://localhost:5000/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: videoUrl })
        });

        if (!response.ok) throw new Error(`Server Error: ${response.status}`);

        const data = await response.json();
        console.log("Download response:", data); // Debugging

        if (data.video_id) {
            console.log("Download started, showing progress..."); // Debugging
            showProgress(data.video_id);
        }
    } catch (error) {
        console.error("Download Error:", error);
        alert("Error: " + error.message);
    }
}

// Fetch and display downloaded videos
async function updateDownloadedVideos() {
    console.log("Updating downloaded videos list..."); // Debugging
    try {
        const response = await fetch('http://localhost:5000/downloaded_videos');
        const data = await response.json();

        const currentVideos = Array.from(downloadedVideosContainer.children).map(child => child.querySelector('p').innerText);
        const newVideos = data.videos.filter(filename => !currentVideos.includes(filename));

        if (newVideos.length > 0) {
            console.log("New videos found:", newVideos); // Debugging

            newVideos.forEach(filename => {
                const videoElement = document.createElement("div");
                videoElement.classList.add("video-box");
                videoElement.innerHTML = `
                    <p>${filename}</p>
                    <video controls width="320">
                        <source src="http://localhost:5000/get_video/${filename}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                `;
                downloadedVideosContainer.appendChild(videoElement);
            });
        }
    } catch (error) {
        console.error("Failed to fetch downloaded videos:", error);
    }
}

// Show download progress
async function showProgress(videoId) {
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");

    progressBar.style.display = "block"; // Show progress bar

    let retries = 0;

    while (retries < 50) { // Stop after 50 attempts (100 sec max)
        try {
            const response = await fetch(`http://localhost:5000/progress/${videoId}`);
            const data = await response.json();

            if (data.status === "Completed") {
                progressBar.value = 100;
                progressText.innerText = "Download Complete!";
                break; // Do not call updateDownloadedVideos here
            } else if (data.status === "Failed") {
                progressText.innerText = "Download Failed!";
                break;
            } else {
                // Ensure data.progress is a string before calling replace
                const progressValue = typeof data.progress === 'string' ? parseInt(data.progress.replace('%', '')) : 0;
                progressBar.value = progressValue;
                progressText.innerText = `Downloading: ${data.progress || '0%'}`;
            }

            await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
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