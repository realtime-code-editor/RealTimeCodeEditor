from flask import Flask, render_template, request, redirect, url_for, jsonify, session, flash, g
from flask_socketio import SocketIO, join_room, leave_room, emit
import requests
import os
import random
import string
import subprocess
import tempfile
import sqlite3
import functools
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'realtime-editor-super-secret'
# Using eventlet for better WebSocket performance if available
socketio = SocketIO(app, cors_allowed_origins="*")

DB_PATH = os.path.join(os.path.dirname(__file__), 'users.db')

# State structure to hold room data: dict mapping room_id -> {'code': string, 'users': dict of sid -> username}
rooms = {}


def get_tab_id():
    return request.values.get('tab', 'default')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_column(conn, table, column_name, column_type, default=None):
    columns = [row['name'] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()]
    if column_name not in columns:
        sql = f"ALTER TABLE {table} ADD COLUMN {column_name} {column_type}"
        if default is not None:
            sql += f" DEFAULT {default}"
        conn.execute(sql)


def init_db():
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT DEFAULT (date('now'))
            )
            """
        )
        columns = [row['name'] for row in conn.execute("PRAGMA table_info(users)").fetchall()]
        if 'last_login_at' not in columns:
            conn.execute("ALTER TABLE users ADD COLUMN last_login_at TEXT")
        if 'last_logout_at' in columns:
            conn.execute("ALTER TABLE users RENAME TO users_old")
            conn.execute(
                """
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TEXT DEFAULT (date('now')),
                    last_login_at TEXT
                )
                """
            )
            conn.execute(
                "INSERT INTO users (id, username, password_hash, created_at, last_login_at)"
                " SELECT id, username, password_hash, created_at, last_login_at FROM users_old"
            )
            conn.execute("DROP TABLE users_old")
        conn.execute(
            "UPDATE users SET created_at = substr(created_at, 1, 10) WHERE created_at LIKE '% %'"
        )

init_db()


def create_user(username, password):
    from werkzeug.security import generate_password_hash
    password_hash = generate_password_hash(password)
    created_at = datetime.utcnow().strftime('%Y-%m-%d')
    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
                (username, password_hash, created_at)
            )
        return True
    except sqlite3.IntegrityError:
        return False


def authenticate_user(username, password):
    from werkzeug.security import check_password_hash
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE username = ?",
            (username,)
        ).fetchone()
    if row and check_password_hash(row['password_hash'], password):
        return row['id']
    return None


def record_login_time(user_id):
    if not user_id:
        return
    timestamp = datetime.utcnow().strftime('%Y-%m-%d')
    with get_db() as conn:
        conn.execute(
            "UPDATE users SET last_login_at = ? WHERE id = ?",
            (timestamp, user_id)
        )


def get_user_activity(user_id):
    with get_db() as conn:
        return conn.execute(
            "SELECT last_login_at FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()


def format_date(timestamp):
    if not timestamp:
        return None
    try:
        return timestamp.split(' ')[0]
    except Exception:
        return timestamp


def login_required(view):
    @functools.wraps(view)
    def wrapped_view(*args, **kwargs):
        tab_id = get_tab_id()
        tabs = session.get('tabs', {})
        tab_data = tabs.get(tab_id)
        if not tab_data:
            return redirect(url_for('login', tab=tab_id))

        g.tab_id = tab_id
        g.tab_user_id = tab_data['user_id']
        g.tab_username = tab_data['username']
        return view(*args, **kwargs)
    return wrapped_view


@app.route('/')
def index():
    tab_id = get_tab_id()
    return render_template('index.html', action='login', tab=tab_id)


@app.route('/signup', methods=['GET', 'POST'])
def signup():
    tab_id = get_tab_id()
    tabs = session.get('tabs', {})
    if tabs.get(tab_id):
        return redirect(url_for('dashboard', tab=tab_id))

    error = None
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        confirm_password = request.form.get('confirm_password', '').strip()

        if not username or not password or not confirm_password:
            error = 'All fields are required.'
        elif password != confirm_password:
            error = 'Passwords do not match.'
        elif not create_user(username, password):
            error = 'Username already exists.'
        else:
            flash('Account created successfully. Please log in.')
            return redirect(url_for('login', tab=tab_id))

    return render_template('index.html', action='signup', error=error, tab=tab_id)


@app.route('/login', methods=['GET', 'POST'])
def login():
    tab_id = get_tab_id()
    tabs = session.get('tabs', {})
    if tabs.get(tab_id):
        return redirect(url_for('dashboard', tab=tab_id))

    error = None
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()

        if not username or not password:
            error = 'Username and password are required.'
        else:
            user_id = authenticate_user(username, password)
            if user_id:
                tabs[tab_id] = {'user_id': user_id, 'username': username}
                session['tabs'] = tabs
                record_login_time(user_id)
                return redirect(url_for('dashboard', tab=tab_id))
            error = 'Invalid username or password.'

    return render_template('index.html', action='login', error=error, tab=tab_id)


@app.route('/logout')
def logout():
    tab_id = get_tab_id()
    tabs = session.get('tabs', {})
    if tab_id in tabs:
        tabs.pop(tab_id)
        if tabs:
            session['tabs'] = tabs
        else:
            session.clear()
    return redirect(url_for('login', tab=tab_id))


@app.route('/dashboard')
@login_required
def dashboard():
    activity = get_user_activity(g.tab_user_id)
    return render_template(
        'dashboard.html',
        username=g.tab_username,
        last_login_at=format_date(activity['last_login_at']),
        tab=g.tab_id
    )


@app.route('/create-room', methods=['POST'])
@login_required
def create_room():
    room_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return redirect(url_for('editor', room=room_code, tab=g.tab_id))


@app.route('/editor')
@login_required
def editor():
    room = request.args.get('room')
    if not room:
        return redirect(url_for('dashboard', tab=g.tab_id))

    return render_template('editor.html', username=g.tab_username, room=room, tab=g.tab_id)


@app.route('/run', methods=['POST'])
@login_required
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
            'code': '',
            'users': {},
            'messages': []
        }
        
    # Register this user's SID (Session ID)
    rooms[room]['users'][request.sid] = username
    
    user_list = list(rooms[room]['users'].values())
    
    # Send the current state of the code and user count ONLY to the user who joined
    emit('joined', {
        'code': rooms[room]['code'], 
        'userCount': len(user_list),
        'users': user_list,
        'chatHistory': rooms[room].get('messages', [])
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

@socketio.on('send_chat_message')
def handle_chat_message(data):
    """Handles incoming chat messages and broadcasts them."""
    room = data.get('room')
    username = data.get('username')
    text = data.get('text')
    
    if room in rooms and username and text:
        message = {
            'username': username,
            'text': text,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
        # Ensure messages list exists
        if 'messages' not in rooms[room]:
            rooms[room]['messages'] = []
            
        rooms[room]['messages'].append(message)
        
        # Keep only the last 100 messages in memory
        if len(rooms[room]['messages']) > 100:
            rooms[room]['messages'] = rooms[room]['messages'][-100:]
            
        # Broadcast to everyone in the room
        emit('chat_message', message, room=room)

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
