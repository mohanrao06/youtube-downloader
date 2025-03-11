from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import yt_dlp
import os
import threading
import logging
from flask.logging import default_handler



# Create the Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

  # Allow all origins

  

# Disable logging for the /downloaded_videos route
logging.getLogger('werkzeug').disabled = True
app.logger.removeHandler(default_handler)

# Define the downloads folder
DOWNLOAD_FOLDER = "downloads"

# Ensure the downloads folder exists
try:
    os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)
    print(f"Directory '{DOWNLOAD_FOLDER}' created or already exists.")
except Exception as e:
    print(f"Failed to create directory '{DOWNLOAD_FOLDER}': {e}")
    raise  # Re-raise the exception to stop the server if the directory cannot be created

# Global variable to track download progress
download_progress = {}

def download_video(video_url, video_id):
    global download_progress
    download_progress[video_id] = {"status": "Downloading", "progress": 0}

    def progress_hook(d):
        if d['status'] == 'downloading':
            percent = d['_percent_str'].strip()
            download_progress[video_id] = {"status": "Downloading", "progress": percent}
        elif d['status'] == 'finished':
            download_progress[video_id] = {"status": "Completed", "progress": "100%"}

    try:
        ydl_opts = {
            'outtmpl': f'{DOWNLOAD_FOLDER}/%(title)s.%(ext)s',
            'format': 'bestvideo+bestaudio/best',
            'merge_output_format': 'mp4',
            'quiet': True,  # Suppress all logs
            'no_warnings': True,  # Suppress warnings
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)
            filename = f"{info['title'].replace('/', '_')}.mp4"

        return filename
    except Exception as e:
        download_progress[video_id] = {"status": "Failed", "error": str(e)}
        return None

@app.route('/download', methods=['POST'])
def download_video_handler():
    data = request.get_json()
    video_url = data.get('url')

    if not video_url:
        return jsonify({"error": "No URL provided"}), 400

    video_id = video_url.split('=')[-1]  # Extract video ID
    threading.Thread(target=download_video, args=(video_url, video_id)).start()

    return jsonify({"message": "Download started", "video_id": video_id})

@app.route('/progress/<video_id>', methods=['GET'])
def get_progress(video_id):
    progress = download_progress.get(video_id, {"status": "Not Found"})
    return jsonify(progress)

@app.route('/get_video/<filename>', methods=['GET'])
def get_video(filename):
    file_path = os.path.join(DOWNLOAD_FOLDER, filename)
    if os.path.exists(file_path):
        return send_file(file_path)
    return jsonify({"error": "File not found"}), 404

@app.route('/downloaded_videos', methods=['GET'])
def list_downloaded_videos():
    try:
        # Check if the directory exists
        if not os.path.exists(DOWNLOAD_FOLDER):
            print(f"Directory '{DOWNLOAD_FOLDER}' does not exist. Creating it now.")
            os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)
            return jsonify({"videos": []})  # Return an empty list since no videos exist yet

        # List all .mp4 files in the directory
        videos = [f for f in os.listdir(DOWNLOAD_FOLDER) if f.endswith('.mp4')]
        return jsonify({"videos": videos})
    except Exception as e:
        print(f"Error listing downloaded videos: {e}")
        return jsonify({"error": "Failed to list downloaded videos"}), 500

if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000, use_reloader=False)