# Quick Setup & Usage Guide

## Setup Instructions

### 1. Update Database
Execute the updated `schema.sql` in your MySQL database:
```bash
mysql -u root -p < database/schema.sql
```

Or run the SQL commands directly in MySQL:
```sql
CREATE DATABASE IF NOT EXISTS userdb;
USE userdb;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    embedded_image LONGBLOB NOT NULL,
    message_text LONGTEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id),
    INDEX idx_receiver (receiver_id),
    INDEX idx_created (created_at)
);
```

### 2. Update Backend Password
Edit `backend/backend.py` - Line 13:
```python
password="yourpassword",   # ← Change to your MySQL password
```

### 3. Start Backend
```bash
cd backend
python backend.py
```
Backend will run on `http://localhost:5000`

### 4. Open Frontend
Open `frontend/index.html` in a web browser

---

## Usage Guide

### Register Users
1. Click "Create Account"
2. Enter Name, Email, Password
3. Click "Create Account"
4. Repeat to create multiple test users

### Send Embedded Image
1. After login, click "Send" in navigation
2. **Select Recipient**: Choose user from dropdown
3. **Write Message** (optional): Add message text
4. **Upload Cover Image**: Drag-drop or click to upload image
5. **Upload File to Hide**: Upload file you want to hide
6. **Set Password** (optional): Add password protection
7. **Click Send**: Image will be encoded and sent
8. ✅ Confirmation message shows success

### Receive Messages
1. After login, click "Inbox" in navigation
2. See all messages sent to you
3. **Unread Badge**: Red badge shows unread count
4. **View Message**: Click "View" button on any message
5. **Message Details**:
   - See sender's name and email
   - Read optional message text
   - View embedded image
6. **Download Image**: Click download to save embedded image
7. **Decode File**: Click decode to extract hidden file

### Decode Hidden File
**Option 1: From Inbox**
1. Open message in Inbox
2. Click "Decode Hidden File"
3. System auto-loads embedded image in Decode page
4. Enter password if file was encrypted
5. Click "Extract Hidden File"
6. Click "Download File" to save

**Option 2: From Encode/Decode Page**
1. Click "Decode" in navigation
2. Upload or drag-drop embedded image
3. Enter password (if used)
4. Click "Extract Hidden File"
5. Click "Download File"

---

## Key Features Summary

### 📤 Send Page
- **Recipient Selection** from registered users
- **Optional Message** with each embedded image
- **File Embedding** with password protection
- Real-time validation

### 📨 Inbox Page
- **Message Cards** with sender info and date
- **Unread Badge** showing count
- **Quick View** modal with full details
- **Download** embedded images
- **Auto-Decode** image loading in decode page

### 🔐 Security Features
- Password-protected file embedding (XOR encryption)
- Database storage of embedded images
- User authentication required
- Message read status tracking

---

## API Endpoints

All endpoints use JSON and return JSON responses.

### `GET /get-users`
Get all registered users (for recipient dropdown)

**Response:**
```json
{
  "users": [
    { "id": 1, "name": "Alice", "email": "alice@example.com" },
    { "id": 2, "name": "Bob", "email": "bob@example.com" }
  ]
}
```

### `POST /send-message`
Send embedded image message

**Request:**
```json
{
  "sender_id": 1,
  "receiver_email": "bob@example.com",
  "embedded_image": "base64_encoded_image_data",
  "message_text": "Optional message here"
}
```

**Response:**
```json
{
  "message": "Message sent successfully!",
  "message_id": 5
}
```

### `GET /get-messages/<user_id>`
Retrieve inbox for user

**Response:**
```json
{
  "messages": [
    {
      "id": 5,
      "sender_id": 2,
      "sender_name": "Bob",
      "sender_email": "bob@example.com",
      "message_text": "Check this out!",
      "is_read": false,
      "created_at": "2024-03-02 10:30:00",
      "has_image": "yes"
    }
  ]
}
```

### `GET /get-message-image/<message_id>`
Retrieve embedded image from message

**Response:**
```json
{
  "embedded_image": "base64_encoded_image_data"
}
```

### `POST /mark-as-read/<message_id>`
Mark message as read

**Response:**
```json
{
  "message": "Message marked as read"
}
```

---

## Troubleshooting

### Backend Connection Error
```
Error: Failed to connect to backend
```
**Solution**: Ensure Flask is running on port 5000
```bash
python backend.py
```

### No Users in Recipient Dropdown
```
-- Select a user -- (empty)
```
**Solution**: Register more users first
1. Go back to Dashboard
2. Create accounts for other users

### File Size Too Large
```
Error: File exceeds maximum size
```
**Solution**: 
- Files max 5MB
- Images max 50MB
- Use smaller files if needed

### Image Capacity Warning
```
Warning: File is too large for image capacity
```
**Solution**:
- Use larger cover image
- Use smaller file to hide
- Or reduce file size

### Database Error
```
Error: Message: ...
```
**Solution**: 
1. Check MySQL is running
2. Verify database and tables created
3. Check username/password in backend.py

---

## Test Scenario

### Create Test Messages:
1. **User 1 (alice@example.com)** → Register
2. **User 2 (bob@example.com)** → Register
3. **Alice sends to Bob**:
   - Login as Alice
   - Click "Send"
   - Select Bob
   - Type message: "Secret document enclosed"
   - Upload image (test.png)
   - Upload file (secret.txt)
   - Click Send
4. **Bob receives**:
   - Login as Bob
   - Click "Inbox"
   - See Alice's message
   - Click "View"
   - See embedded image
   - Click "Decode"
   - Extract secret.txt

---

## Notes

- All timestamps stored in UTC
- Images stored as BLOB in database
- Password protected with XOR encryption (can upgrade to AES)
- Unread count updates automatically
- Message auto-marks as read when viewed

---

## Support

For issues or questions, check:
1. [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Full technical details
2. Backend logs - See `python backend.py` output
3. Browser console - Check for JS errors
4. Network tab - Verify API calls successful

