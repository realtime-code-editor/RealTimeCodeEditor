from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_socketio import SocketIO, join_room, leave_room, emit
import requests
import os
import random
import string
import subprocess
import tempfile
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'realtime-editor-super-secret'
# Using eventlet for better WebSocket performance if available
socketio = SocketIO(app, cors_allowed_origins="*")

# State structure to hold room data: dict mapping room_id -> {'code': string, 'users': dict of sid -> username}
rooms = {}



@app.route('/')
def index():
    """Renders the join room page."""
    return render_template('index.html')

@app.route('/create-room', methods=['POST'])
def create_room():
    """Creates a new room with an auto-generated code."""
    username = request.form.get('username')
    if not username:
        return redirect(url_for('index'))
    room_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return redirect(url_for('editor', username=username, room=room_code))

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
        
    with tempfile.TemporaryDirectory() as temp_dir:
        file_path = ""
        cmd = []
        compile_cmd = []
        
        if language == 'python':
            file_path = os.path.join(temp_dir, 'main.py')
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(code)
            cmd = ['python', file_path]
            
        elif language == 'javascript':
            file_path = os.path.join(temp_dir, 'main.js')
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(code)
            cmd = ['node', file_path]
            
        elif language == 'c':
            file_path = os.path.join(temp_dir, 'main.c')
            exe_path = os.path.join(temp_dir, 'main.exe' if os.name == 'nt' else 'main')
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(code)
            compile_cmd = ['gcc', file_path, '-o', exe_path]
            cmd = [exe_path]
            
        elif language == 'c++':
            file_path = os.path.join(temp_dir, 'main.cpp')
            exe_path = os.path.join(temp_dir, 'main.exe' if os.name == 'nt' else 'main')
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(code)
            compile_cmd = ['g++', file_path, '-o', exe_path]
            cmd = [exe_path]
            
        elif language == 'java':
            file_path = os.path.join(temp_dir, 'Main.java')
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(code)
            compile_cmd = ['javac', file_path]
            cmd = ['java', '-cp', temp_dir, 'Main']
        else:
            return jsonify({"output": "Unsupported language for local execution.", "isError": True})
            
        try:
            if compile_cmd:
                compile_process = subprocess.run(compile_cmd, capture_output=True, text=True, timeout=10)
                if compile_process.returncode != 0:
                    return jsonify({"output": compile_process.stderr, "isError": True})
                    
            process = subprocess.run(cmd, input=stdin_data, capture_output=True, text=True, timeout=10)
            
            output = process.stdout
            if process.returncode != 0:
                output += "\nError:\n" + process.stderr
                return jsonify({"output": output.strip(), "isError": True})
                
            return jsonify({
                "output": output.strip() if output.strip() else "Program finished with no output.",
                "isError": False
            })
            
        except subprocess.TimeoutExpired:
            return jsonify({"output": "Execution timed out.", "isError": True})
        except FileNotFoundError as e:
            cmd_name = e.filename if e.filename else (compile_cmd[0] if compile_cmd else cmd[0])
            return jsonify({"output": f"Error: Command '{cmd_name}' not found. Please ensure it is installed and in your system PATH.", "isError": True})
        except Exception as e:
            return jsonify({"output": f"Execution error: {str(e)}", "isError": True})

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
    
    user_list = list(rooms[room]['users'].values())
    
    # Send the current state of the code and user count ONLY to the user who joined
    emit('joined', {
        'code': rooms[room]['code'], 
        'userCount': len(user_list),
        'users': user_list
    })
    
    # Broadcast to EVERYONE in the room that the user count has changed
    emit('presence_update', {
        'userCount': len(user_list),
        'users': user_list
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
            user_list = list(room_data['users'].values())
            emit('presence_update', {
                'userCount': len(user_list),
                'users': user_list
            }, room=room_id)
            
            # Optional: Clean up empty rooms to save memory
            # if len(room_data['users']) == 0:
            #     del rooms[room_id]
            break

if __name__ == '__main__':
    # Using socketio.run instead of app.run to include WebSocket support
    socketio.run(app, debug=True)
