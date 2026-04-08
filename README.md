# Real-Time Collaborative Code Editor

A real-time collaborative code editor built with Python, Flask, Flask-SocketIO, and Vanilla JS/CSS. It supports real-time synchronized coding sessions and multi-language code execution via the Judge0 API.

## Features
- Secure login/signup authentication before accessing rooms.
- Real-time collaborative code editing across connected clients.
- Multi-language support (Python, JavaScript, C, C++).
- In-browser code execution using the Judge0 API.
- Synchronized code execution output and state updates via WebSockets.

## Prerequisites
- Python 3.8+
- [RapidAPI](https://rapidapi.com/) account for Judge0 API access

## Environment Setup

1. Navigate to the project directory.
2. Form a Python virtual environment and activate it:
   
   **Windows:**
   ```bash

   venv\Scripts\activate
   ```
   
   **macOS/Linux:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. The application expects a `.env` file in the root directory with your Judge0 API key:
   ```env
   RAPIDAPI_KEY=your_rapidapi_key_here
   ```
   *You can subscribe to the free tier of the [Judge0 CE API](https://rapidapi.com/judge0-official/api/judge0-ce) on RapidAPI to obtain your key.*

## Running the Server

1. Ensure your virtual environment is activated.
2. Start the application:
   ```bash
   python app.py
   ```
3. The server will start on port 5000. Open your web browser and navigate to `http://127.0.0.1:5000` to join or create a session.
