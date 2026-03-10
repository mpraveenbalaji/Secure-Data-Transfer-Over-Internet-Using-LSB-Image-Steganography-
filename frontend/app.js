// Main application logic
class SteganographyApp {
    constructor() {
        this.steg = new Steganography();
        this.authManager = new AuthManager();
        this.navigationManager = new NavigationManager(this.authManager);
        
        this.encodeImage = null;
        this.decodeImage = null;
        this.fileToHide = null;
        this.registeredUsers = [];
        this.selectedRecipient = null;
        this.currentEmbeddedImage = null;
        this.currentMessageId = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.setupModalEventListeners();
    }

    setupEventListeners() {
        // Encode section
        document.getElementById('encodeUploadArea').addEventListener('click', () => {
            document.getElementById('encodeImageInput').click();
        });

        document.getElementById('encodeImageInput').addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files[0], 'encode');
        });

        document.getElementById('fileUploadArea').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });

        document.getElementById('removeEncodeImage').addEventListener('click', () => {
            this.removeImage('encode');
        });

        document.getElementById('removeFile').addEventListener('click', () => {
            this.removeFile();
        });

        document.getElementById('encodeBtn').addEventListener('click', () => {
            this.encodeMessage();
        });

        document.getElementById('downloadBtn').addEventListener('click', () => {
            this.downloadEncodedImage();
        });

        document.getElementById('shareBtn').addEventListener('click', () => {
            this.openShareModal();
        });

        // Share modal
        document.getElementById('closeShareModal').addEventListener('click', () => {
            this.closeShareModal();
        });

        document.getElementById('cancelShareBtn').addEventListener('click', () => {
            this.closeShareModal();
        });

        document.getElementById('shareRecipientInput').addEventListener('input', (e) => {
            this.handleRecipientSearch(e.target.value);
        });

        document.getElementById('confirmShareBtn').addEventListener('click', () => {
            this.sendSharedImage();
        });

        const removeRecipientBtn = document.querySelector('#selectedRecipient .remove-recipient');
        if (removeRecipientBtn) {
            removeRecipientBtn.addEventListener('click', () => {
                this.clearSelectedRecipient();
            });
        }

        // Decode section
        document.getElementById('decodeUploadArea').addEventListener('click', () => {
            document.getElementById('decodeImageInput').click();
        });

        document.getElementById('decodeImageInput').addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files[0], 'decode');
        });

        document.getElementById('removeDecodeImage').addEventListener('click', () => {
            this.removeImage('decode');
        });

        document.getElementById('decodeBtn').addEventListener('click', () => {
            this.decodeMessage();
        });

        document.getElementById('copyBtn').addEventListener('click', () => {
            this.downloadDecodedFile();
        });

        // Password toggles
        document.getElementById('encodePasswordToggle').addEventListener('click', () => {
            this.togglePasswordVisibility('encodePassword', 'encodePasswordToggle');
        });

        document.getElementById('decodePasswordToggle').addEventListener('click', () => {
            this.togglePasswordVisibility('decodePassword', 'decodePasswordToggle');
        });
    }

    setupDragAndDrop() {
        const dropAreas = [
            { area: 'encodeUploadArea', type: 'encode' },
            { area: 'decodeUploadArea', type: 'decode' },
            { area: 'fileUploadArea', type: 'file' }
        ];

        dropAreas.forEach(({ area, type }) => {
            const element = document.getElementById(area);

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                element.addEventListener(eventName, this.preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                element.addEventListener(eventName, () => element.classList.add('drag-over'), false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                element.addEventListener(eventName, () => element.classList.remove('drag-over'), false);
            });

            element.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    if (type === 'file') {
                        this.handleFileUpload(files[0]);
                    } else {
                        this.handleImageUpload(files[0], type);
                    }
                }
            }, false);
        });
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    async handleImageUpload(file, type) {
        if (!file) return;

        try {
            const { imageData, originalImage } = await this.steg.loadImageData(file);
            
            if (type === 'encode') {
                this.encodeImage = { imageData, originalImage, file };
                this.displayImagePreview(originalImage, 'encode');
                this.updateImageCapacity(imageData);
            } else {
                this.decodeImage = { imageData, originalImage, file };
                this.displayImagePreview(originalImage, 'decode');
            }

            this.validateForms();
            this.showToast('Image loaded successfully!', 'success');

        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    displayImagePreview(img, type) {
        const previewContainer = document.getElementById(`${type}ImagePreview`);
        const previewImg = document.getElementById(`${type}PreviewImg`);
        const uploadArea = document.getElementById(`${type}UploadArea`);

        previewImg.src = img.src;
        previewContainer.style.display = 'block';
        uploadArea.style.display = 'none';
    }

    removeImage(type) {
        const previewContainer = document.getElementById(`${type}ImagePreview`);
        const uploadArea = document.getElementById(`${type}UploadArea`);
        const input = document.getElementById(`${type}ImageInput`);

        previewContainer.style.display = 'none';
        uploadArea.style.display = 'block';
        input.value = '';

        if (type === 'encode') {
            this.encodeImage = null;
            this.updateImageCapacity(null);
        } else {
            this.decodeImage = null;
        }

        this.validateForms();
    }

    async handleFileUpload(file) {
        if (!file) return;

        try {
            this.steg.validateHiddenFile(file);
            
            this.fileToHide = file;
            this.displayFilePreview(file);
            this.updateFileCapacity();
            this.validateEncodeForm();
            this.showToast('File loaded successfully!', 'success');

        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    displayFilePreview(file) {
        const previewContainer = document.getElementById('filePreview');
        const uploadArea = document.getElementById('fileUploadArea');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const fileType = document.getElementById('fileType');

        fileName.textContent = file.name;
        fileSize.textContent = this.steg.formatFileSize(file.size);
        fileType.textContent = file.type || 'Unknown';

        previewContainer.style.display = 'block';
        uploadArea.style.display = 'none';
    }

    removeFile() {
        const previewContainer = document.getElementById('filePreview');
        const uploadArea = document.getElementById('fileUploadArea');
        const input = document.getElementById('fileInput');

        previewContainer.style.display = 'none';
        uploadArea.style.display = 'block';
        input.value = '';

        this.fileToHide = null;
        this.updateFileCapacity();
        this.validateEncodeForm();
    }

    updateImageCapacity(imageData) {
        const capacityElement = document.getElementById('imageCapacity');
        if (imageData) {
            const capacity = this.steg.getImageCapacity(imageData);
            capacityElement.textContent = `${this.steg.formatFileSize(capacity)} available`;
            capacityElement.className = 'capacity-info good';
            capacityElement.style.display = 'block';
        } else {
            capacityElement.textContent = '';
            capacityElement.className = 'capacity-info';
            capacityElement.style.display = 'none';
        }
    }

    updateFileCapacity() {
        const capacityElement = document.getElementById('fileCapacity');
        if (this.fileToHide) {
            const size = this.fileToHide.size;
            capacityElement.textContent = `${this.steg.formatFileSize(size)} required`;
            capacityElement.className = 'capacity-info warning';
            capacityElement.style.display = 'block';
        } else {
            capacityElement.textContent = '';
            capacityElement.className = 'capacity-info';
            capacityElement.style.display = 'none';
        }
    }

    validateForms() {
        this.validateEncodeForm();
        this.validateDecodeForm();
    }

    validateEncodeForm() {
        const encodeBtn = document.getElementById('encodeBtn');
        const isValid = this.encodeImage && this.fileToHide;
        encodeBtn.disabled = !isValid;
    }

    validateDecodeForm() {
        const decodeBtn = document.getElementById('decodeBtn');
        const isValid = this.decodeImage;
        decodeBtn.disabled = !isValid;
    }

    async encodeMessage() {
        try {
            const password = document.getElementById('encodePassword').value;
            const btn = document.getElementById('encodeBtn');
            const progress = document.getElementById('encodeProgress');

            btn.classList.add('loading');
            btn.disabled = true;
            progress.style.display = 'block';

            // Small delay to show loading state
            await new Promise(resolve => setTimeout(resolve, 100));

            const encodedImageData = await this.steg.encode(
                this.encodeImage.imageData,
                this.fileToHide,
                password
            );

            this.displayEncodedResult(encodedImageData);
            this.showToast('File encoded successfully!', 'success');

        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            const btn = document.getElementById('encodeBtn');
            const progress = document.getElementById('encodeProgress');
            
            btn.classList.remove('loading');
            btn.disabled = false;
            progress.style.display = 'none';
        }
    }

    displayEncodedResult(encodedImageData) {
        const resultArea = document.getElementById('encodeResult');
        const encodedImage = document.getElementById('encodedImage');
        const canvas = document.createElement('canvas');

        canvas.width = encodedImageData.width;
        canvas.height = encodedImageData.height;
        const ctx = canvas.getContext('2d');
        ctx.putImageData(encodedImageData, 0, 0);

        encodedImage.src = canvas.toDataURL('image/png');
        resultArea.style.display = 'block';

        // Store canvas for later use
        this.encodedCanvas = canvas;
    }

    downloadEncodedImage() {
        if (!this.encodedCanvas) return;

        this.steg.canvasToBlob(this.encodedCanvas).then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `encoded_image_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast('Image downloaded successfully!', 'success');
        });
    }

    async decodeMessage() {
        try {
            const password = document.getElementById('decodePassword').value;
            const btn = document.getElementById('decodeBtn');
            const progress = document.getElementById('decodeProgress');

            btn.classList.add('loading');
            btn.disabled = true;
            progress.style.display = 'block';

            // Small delay to show loading state
            await new Promise(resolve => setTimeout(resolve, 100));

            const decodedFileInfo = await this.steg.decode(
                this.decodeImage.imageData,
                password
            );

            this.displayDecodedResult(decodedFileInfo);
            this.showToast('File decoded successfully!', 'success');

        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            const btn = document.getElementById('decodeBtn');
            const progress = document.getElementById('decodeProgress');
            
            btn.classList.remove('loading');
            btn.disabled = false;
            progress.style.display = 'none';
        }
    }

    displayDecodedResult(fileInfo) {
        const resultArea = document.getElementById('decodeResult');
        const decodedFileName = document.getElementById('decodedFileName');
        const decodedFileSize = document.getElementById('decodedFileSize');
        const decodedFileType = document.getElementById('decodedFileType');
        const decodedFileIcon = document.getElementById('decodedFileIcon');

        decodedFileName.textContent = fileInfo.name;
        decodedFileSize.textContent = this.steg.formatFileSize(fileInfo.size);
        decodedFileType.textContent = fileInfo.type || 'Unknown';

        // Set appropriate icon
        const iconMap = {
            'application/pdf': 'fa-file-pdf',
            'text/plain': 'fa-file-alt',
            'image/jpeg': 'fa-file-image',
            'image/png': 'fa-file-image',
            'application/msword': 'fa-file-word',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'fa-file-word'
        };

        const iconClass = iconMap[fileInfo.type] || 'fa-file';
        decodedFileIcon.className = `fas ${iconClass}`;

        resultArea.style.display = 'block';
        
        // Store file data for download
        this.decodedFileInfo = fileInfo;
    }

    downloadDecodedFile() {
        if (!this.decodedFileInfo) return;

        const blob = this.steg.base64ToBlob(this.decodedFileInfo.data, this.decodedFileInfo.type);
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = this.decodedFileInfo.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.showToast('File downloaded successfully!', 'success');
    }

    togglePasswordVisibility(inputId, toggleId) {
        const input = document.getElementById(inputId);
        const toggle = document.getElementById(toggleId);
        const icon = toggle.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    // Share functionality
    async openShareModal() {
        if (!this.encodedCanvas) {
            this.showToast('Please encode an image first', 'error');
            return;
        }

        await this.loadRegisteredUsers();
        document.getElementById('shareModal').style.display = 'flex';

        const searchContainer = document.querySelector('.recipient-search-container');
        if (searchContainer) {
            searchContainer.style.display = 'block';
        }
        document.getElementById('selectedRecipient').style.display = 'none';
        document.getElementById('shareRecipientInput').value = '';
    }

    closeShareModal() {
        document.getElementById('shareModal').style.display = 'none';
        document.getElementById('shareRecipientInput').value = '';
        document.getElementById('shareMessage').value = '';
        this.clearSelectedRecipient();
    }

    async loadRegisteredUsers() {
        try {
            const response = await fetch('http://127.0.0.1:5000/get-users');
            const data = await response.json();
            
            // Filter out the current user
            this.registeredUsers = data.users.filter(u => u.email !== this.authManager.currentUser.email);
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    }

    handleRecipientSearch(searchTerm) {
        const suggestionsContainer = document.getElementById('recipientSuggestions');
        const suggestionsList = document.getElementById('suggestionsList');

        if (!searchTerm) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        const filteredUsers = this.registeredUsers.filter(user => 
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filteredUsers.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        suggestionsList.innerHTML = '';
        filteredUsers.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user.email;
            li.addEventListener('click', () => this.selectRecipient(user));
            suggestionsList.appendChild(li);
        });

        suggestionsContainer.style.display = 'block';
    }

    selectRecipient(user) {
        this.selectedRecipient = user;
        document.getElementById('shareRecipientInput').value = '';
        document.getElementById('recipientSuggestions').style.display = 'none';
        
        const selectedDiv = document.getElementById('selectedRecipient');
        selectedDiv.style.display = 'block';
        document.getElementById('selectedRecipientName').textContent = user.email;

        const searchContainer = document.querySelector('.recipient-search-container');
        if (searchContainer) {
            searchContainer.style.display = 'none';
        }
        
        document.getElementById('confirmShareBtn').disabled = false;
    }

    clearSelectedRecipient() {
        this.selectedRecipient = null;
        const selectedDiv = document.getElementById('selectedRecipient');
        if (selectedDiv) {
            selectedDiv.style.display = 'none';
        }
        const searchContainer = document.querySelector('.recipient-search-container');
        if (searchContainer) {
            searchContainer.style.display = 'block';
        }
        document.getElementById('confirmShareBtn').disabled = true;
    }

    async sendSharedImage() {
        if (!this.selectedRecipient || !this.encodedCanvas) return;

        try {
            const btn = document.getElementById('confirmShareBtn');
            btn.disabled = true;
            btn.classList.add('loading');

            // Convert canvas to base64
            const imageBase64 = this.encodedCanvas.toDataURL('image/png').split(',')[1];
            const messageText = document.getElementById('shareMessage').value;

            // Send to backend
            const response = await fetch('http://127.0.0.1:5000/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sender_id: this.authManager.currentUser.id,
                    receiver_email: this.selectedRecipient.email,
                    embedded_image: imageBase64,
                    message_text: messageText
                })
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showToast(`Message sent successfully to ${this.selectedRecipient.email}!`, 'success');
                this.closeShareModal();
            } else {
                this.showToast(result.message || 'Failed to send message', 'error');
            }
        } catch (error) {
            this.showToast('Error sending message: ' + error.message, 'error');
            console.error(error);
        } finally {
            const btn = document.getElementById('confirmShareBtn');
            btn.disabled = false;
            btn.classList.remove('loading');
        }
    }

    // Inbox functionality
    async initializeInboxPage() {
        await this.loadInboxMessages();
    }

    async loadInboxMessages() {
        if (!this.authManager.currentUser) return;

        try {
            const response = await fetch(`http://127.0.0.1:5000/get-messages/${this.authManager.currentUser.id}`);
            const data = await response.json();
            
            const messagesGrid = document.getElementById('messagesGrid');
            const inboxEmpty = document.getElementById('inboxEmpty');
            const inboxList = document.getElementById('inboxList');

            if (data.messages && data.messages.length > 0) {
                inboxEmpty.style.display = 'none';
                inboxList.style.display = 'block';
                messagesGrid.innerHTML = '';

                // Count unread messages
                const unreadCount = data.messages.filter(m => !m.is_read).length;
                const badge = document.getElementById('unreadBadge');
                if (unreadCount > 0) {
                    badge.textContent = unreadCount;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }

                data.messages.forEach(message => {
                    const messageCard = document.createElement('div');
                    messageCard.className = `message-card ${!message.is_read ? 'unread' : ''}`;
                    messageCard.innerHTML = `
                        <div class="message-header">
                            <div class="sender-info">
                                <h3>${message.sender_name}</h3>
                                <p>${message.sender_email}</p>
                            </div>
                            <span class="message-date">${new Date(message.created_at).toLocaleDateString()}</span>
                        </div>
                        <div class="message-body">
                            ${message.message_text ? `<p>${message.message_text}</p>` : '<p><em>No message included</em></p>'}
                            <div class="message-footer">
                                <span class="has-image"><i class="fas fa-image"></i> Embedded Image</span>
                            </div>
                        </div>
                        <div class="message-actions">
                            <button class="btn btn-primary btn-sm view-message" data-message-id="${message.id}">
                                <i class="fas fa-eye"></i>
                                View
                            </button>
                        </div>
                    `;
                    messagesGrid.appendChild(messageCard);
                });

                // Add event listeners to view buttons
                document.querySelectorAll('.view-message').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const messageId = e.currentTarget.dataset.messageId;
                        this.viewMessage(messageId);
                    });
                });
            } else {
                inboxEmpty.style.display = 'block';
                inboxList.style.display = 'none';
            }
        } catch (error) {
            this.showToast('Failed to load messages', 'error');
            console.error(error);
        }
    }

    async viewMessage(messageId) {
        try {
            const response = await fetch(`http://127.0.0.1:5000/get-message-image/${messageId}`);
            const data = await response.json();
            
            if (response.ok) {
                // Get message details from the list
                const messageCard = document.querySelector(`[data-message-id="${messageId}"]`).closest('.message-card');
                const senderName = messageCard.querySelector('.sender-info h3').textContent;
                const senderEmail = messageCard.querySelector('.sender-info p').textContent;
                const dateText = messageCard.querySelector('.message-date').textContent;
                const messageText = messageCard.querySelector('.message-body p').textContent;

                // Decode base64 image to displayable format
                const imageData = data.embedded_image;
                const imageUrl = 'data:image/png;base64,' + imageData;

                // Populate modal
                document.getElementById('modalSenderName').textContent = senderName;
                document.getElementById('modalSenderEmail').textContent = senderEmail;
                document.getElementById('modalDate').textContent = dateText;
                document.getElementById('modalEmbeddedImage').src = imageUrl;
                
                if (messageText && messageText !== 'No message included') {
                    document.getElementById('modalMessageText').style.display = 'block';
                    document.getElementById('modalMessageContent').textContent = messageText;
                } else {
                    document.getElementById('modalMessageText').style.display = 'none';
                }

                // Store current message ID for decode action
                this.currentMessageId = messageId;
                this.currentEmbeddedImage = imageData;

                // Mark as read
                await fetch(`http://127.0.0.1:5000/mark-as-read/${messageId}`, { method: 'POST' });

                // Show modal
                document.getElementById('messageModal').style.display = 'flex';
            } else {
                this.showToast('Failed to load message', 'error');
            }
        } catch (error) {
            this.showToast('Error loading message: ' + error.message, 'error');
            console.error(error);
        }
    }

    setupModalEventListeners() {
        const modal = document.getElementById('messageModal');
        const closeBtn = document.getElementById('closeMessageModal');
        
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            this.loadInboxMessages(); // Refresh to show updated read status
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                this.loadInboxMessages();
            }
        });

        document.getElementById('downloadEmbeddedBtn').addEventListener('click', () => {
            this.downloadEmbeddedImage();
        });

        document.getElementById('decodeMessageBtn').addEventListener('click', () => {
            this.openDecodeForEmbeddedImage();
        });
    }

    downloadEmbeddedImage() {
        try {
            const imageData = this.currentEmbeddedImage;
            const byteCharacters = atob(imageData);
            const byteNumbers = new Array(byteCharacters.length);
            
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/png' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `embedded_image_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            this.showToast('Image downloaded successfully!', 'success');
        } catch (error) {
            this.showToast('Failed to download image', 'error');
        }
    }

    openDecodeForEmbeddedImage() {
        // Close modal
        document.getElementById('messageModal').style.display = 'none';
        
        // Navigate to decode page
        this.navigationManager.navigateTo('decode');
        
        // Load the embedded image for decoding
        setTimeout(() => {
            try {
                const imageData = this.currentEmbeddedImage;
                
                // Create image from base64
                const img = new Image();
                img.onload = () => {
                    // Display image preview
                    const previewContainer = document.getElementById('decodeImagePreview');
                    const previewImg = document.getElementById('decodePreviewImg');
                    const uploadArea = document.getElementById('decodeUploadArea');
                    
                    previewImg.src = img.src;
                    previewContainer.style.display = 'block';
                    uploadArea.style.display = 'none';
                    
                    // Store image data for decoding
                    this.decodeImage = { 
                        imageData: this.steg.createImageData(img), 
                        originalImage: img, 
                        file: new File([this.dataURLtoBlob(imageData)], 'embedded_image.png', { type: 'image/png' })
                    };
                    
                    // Enable decode button
                    document.getElementById('decodeBtn').disabled = false;
                    
                    this.showToast('Embedded image loaded in decode section', 'success');
                };
                
                img.onerror = () => {
                    this.showToast('Failed to load embedded image', 'error');
                };
                
                img.src = 'data:image/png;base64,' + imageData;
                
            } catch (error) {
                this.showToast('Failed to load image for decoding', 'error');
            }
        }, 200);
    }
    
    dataURLtoBlob(dataURL) {
        const byteCharacters = atob(dataURL);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: 'image/png' });
    }

    showToast(message, type = 'info') {
        this.authManager.showToast(message, type);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.steganographyApp = new SteganographyApp();
});
