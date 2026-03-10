from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime
import base64
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# SQLite database setup
DB_NAME = 'securesteg.db'

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            embedded_image BLOB NOT NULL,
            message_text TEXT,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users(id),
            FOREIGN KEY (receiver_id) REFERENCES users(id)
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database
init_db()

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

@app.route("/register", methods=["POST"])
def register():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", 
                      (data["name"], data["email"], data["password"]))
        conn.commit()
        return jsonify({"message": "User registered successfully!"})
    except sqlite3.IntegrityError:
        return jsonify({"message": "Email already exists"}), 400
    finally:
        conn.close()

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (data["email"],))
    user = cursor.fetchone()
    conn.close()
    
    if user and user["password"] == data["password"]:
        return jsonify({"message": "Login successful!", "user": dict(user)})
    return jsonify({"message": "Invalid email or password"}), 401

@app.route("/get-users", methods=["GET"])
def get_users():
    """Get all users (for recipient selection)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, email FROM users ORDER BY name")
        users = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify({"users": users})
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@app.route("/send-message", methods=["POST"])
def send_message():
    """Send embedded image to a user"""
    try:
        data = request.json
        sender_id = data.get("sender_id")
        receiver_email = data.get("receiver_email")
        embedded_image = data.get("embedded_image")  # Base64 encoded image
        message_text = data.get("message_text", "")

        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get receiver by email
        cursor.execute("SELECT id FROM users WHERE email = ?", (receiver_email,))
        receiver = cursor.fetchone()
        
        if not receiver:
            conn.close()
            return jsonify({"message": "Recipient not found"}), 404

        receiver_id = receiver["id"]

        # Convert base64 to bytes for storage
        image_bytes = base64.b64decode(embedded_image) if embedded_image else b''

        # Insert message into database
        cursor.execute("INSERT INTO messages (sender_id, receiver_id, embedded_image, message_text) VALUES (?, ?, ?, ?)", 
                      (sender_id, receiver_id, image_bytes, message_text))
        conn.commit()
        message_id = cursor.lastrowid
        conn.close()

        return jsonify({"message": "Message sent successfully!", "message_id": message_id})
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@app.route("/get-messages/<int:user_id>", methods=["GET"])
def get_messages(user_id):
    """Get inbox messages for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                m.id,
                m.sender_id,
                u.name as sender_name,
                u.email as sender_email,
                m.message_text,
                m.is_read,
                m.created_at,
                CASE WHEN LENGTH(m.embedded_image) > 0 THEN 'yes' ELSE 'no' END as has_image
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.receiver_id = ?
            ORDER BY m.created_at DESC
        """, (user_id,))
        messages = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return jsonify({"messages": messages})
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@app.route("/get-message-image/<int:message_id>", methods=["GET"])
def get_message_image(message_id):
    """Get embedded image from a message"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT embedded_image FROM messages WHERE id = ?", (message_id,))
        message = cursor.fetchone()
        conn.close()
        
        if not message:
            return jsonify({"message": "Message not found"}), 404

        # Convert bytes back to base64
        image_data = message['embedded_image']
        if isinstance(image_data, bytes):
            image_base64 = base64.b64encode(image_data).decode('utf-8')
        else:
            image_base64 = image_data
            
        return jsonify({"embedded_image": image_base64})
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@app.route("/mark-as-read/<int:message_id>", methods=["POST"])
def mark_as_read(message_id):
    """Mark a message as read"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE messages SET is_read = 1 WHERE id = ?", (message_id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Message marked as read"})
    except Exception as e:
        return jsonify({"message": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
