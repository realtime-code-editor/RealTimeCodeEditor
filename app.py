from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_socketio import SocketIO, join_room, leave_room, emit
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'realtime-editor-super-secret'
# Using eventlet for better WebSocket performance if available
socketio = SocketIO(app, cors_allowed_origins="*")

# State structure to hold room data: dict mapping room_id -> {'code': string, 'users': dict of sid -> username}
rooms = {}

# Judge0 API supported runtimes mapping
JUDGE0_VERSIONS = {
    'python': 71,
    'javascript': 63,
    'c': 50,
    'c++': 54
}

@app.route('/')
def index():
    """Renders the join room page."""
    return render_template('index.html')

@app.route('/editor')
def editor():
    """Renders the editor page if username and room are provided."""
    username = request.args.get('username')
    room = request.args.get('room')
    
    if not username or not room:
        return redirect(url_for('index'))
        
    return render_template('editor.html', username=username, room=room)

@app.route('/run', methods=['POST'])
def run_code():
    """Endpoint to execute code via Judge0 API."""
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
        
    code = data.get('code')
    language = data.get('language')
    stdin_data = data.get('stdin', '')
    
    if not code or not language:
        return jsonify({"error": "Code and language are required"}), 400
        
    language_id = JUDGE0_VERSIONS.get(language)
    if not language_id:
        return jsonify({"error": "Language not supported"}), 400
    
    payload = {
        "language_id": language_id,
        "source_code": code,
        "stdin": stdin_data
    }
    
    headers = {
        "x-rapidapi-key": os.environ.get('RAPIDAPI_KEY', 'YOUR_API_KEY'),
        "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', 
            json=payload, 
            headers=headers,
            timeout=15
        )
        
        if response.status_code != 200 and response.status_code != 201:
            return jsonify({
                "output": f"Error: API returned {response.status_code}\n{response.text}",
                "isError": True
            })
            
        result = response.json()
        
        # Judge0 execution result format
        stderr = result.get('stderr')
        compile_output = result.get('compile_output')
        stdout = result.get('stdout')
        
        if compile_output:
            return jsonify({
                "output": compile_output,
                "isError": True
            })
            
        if stderr:
            return jsonify({
                "output": stderr,
                "isError": True
            })
            
        return jsonify({
            "output": stdout if stdout is not None else "No output",
            "isError": False
        })
        
    except requests.exceptions.RequestException as e:
        return jsonify({"output": f"Execution request failed: {str(e)}", "isError": True})

@socketio.on('join_room')
def handle_join(data):
    """Handles a user joining a room via WebSockets."""
    username = data.get('username')
    room = data.get('room')
    
    if not username or not room:
        return
        
    # Join SocketIO room
    join_room(room)
    
    # Initialize room state if it doesn't exist
    if room not in rooms:
        rooms[room] = {
            'code': '// Welcome to the real-time collaborative code editor\n// Start typing below...\n\n',
            'users': {}
        }
        
    # Register this user's SID (Session ID)
    rooms[room]['users'][request.sid] = username
    
    # Send the current state of the code and user count ONLY to the user who joined
    emit('joined', {
        'code': rooms[room]['code'], 
        'userCount': len(rooms[room]['users'])
    })
    
    # Broadcast to EVERYONE in the room that the user count has changed
    emit('presence_update', {
        'userCount': len(rooms[room]['users'])
    }, room=room)

@socketio.on('code_change')
def handle_code_change(data):
    """Handles code updates from a client and broadcasts them out."""
    room = data.get('room')
    code = data.get('code')
    
    if room in rooms:
        # Update server state
        rooms[room]['code'] = code
        # Broadcast the new code to all other users in the room
        emit('code_update', {'code': code}, room=room, include_self=False)

@socketio.on('run_output')
def handle_run_output(data):
    """Broadcasts code execution output to all users in the room."""
    room = data.get('room')
    output = data.get('output')
    is_error = data.get('isError', False)
    
    if room in rooms:
        emit('output_update', {
            'output': output,
            'isError': is_error
        }, room=room, include_self=False)

@socketio.on('disconnect')
def handle_disconnect():
    """Handles cleanup when a socket connection drops."""
    for room_id, room_data in rooms.items():
        if request.sid in room_data['users']:
            # Remove user from tracking
            del room_data['users'][request.sid]
            # Notify remaining users of the new count
            emit('presence_update', {
                'userCount': len(room_data['users'])
            }, room=room_id)
            
            # Optional: Clean up empty rooms to save memory
            # if len(room_data['users']) == 0:
            #     del rooms[room_id]
            break

if __name__ == '__main__':
    # Using socketio.run instead of app.run to include WebSocket support
    socketio.run(app, debug=True)
