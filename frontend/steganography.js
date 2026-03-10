// Steganography implementation using LSB (Least Significant Bit) method
class Steganography {
    constructor() {
        this.delimiter = '|||END|||'; // File end delimiter
        this.fileInfoDelimiter = '|||FILEINFO|||'; // File info delimiter
    }

    /**
     * Simple XOR encryption/decryption
     */
    xorEncrypt(text, password) {
        if (!password) return text;
        
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(
                text.charCodeAt(i) ^ password.charCodeAt(i % password.length)
            );
        }
        return result;
    }

    xorDecrypt(text, password) {
        return this.xorEncrypt(text, password); // XOR is symmetric
    }

    /**
     * Convert string to binary
     */
    stringToBinary(str) {
        return str.split('').map(char => {
            return char.charCodeAt(0).toString(2).padStart(8, '0');
        }).join('');
    }

    /**
     * Convert binary to string
     */
    binaryToString(binary) {
        let result = '';
        for (let i = 0; i < binary.length; i += 8) {
            const byte = binary.substr(i, 8);
            if (byte.length === 8) {
                result += String.fromCharCode(parseInt(byte, 2));
            }
        }
        return result;
    }

    /**
     * Convert file to base64
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1]; // Remove data:type;base64, prefix
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Convert base64 to blob
     */
    base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    /**
     * Encode file into image
     */
    encode(imageData, file, password = '') {
        return new Promise((resolve, reject) => {
            this.fileToBase64(file).then(base64Data => {
                try {
                    // Create file info object
                    const fileInfo = {
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        data: base64Data
                    };
                    
                    const fileInfoString = JSON.stringify(fileInfo);
                    
                    // Encrypt file info if password provided
                    const encryptedData = this.xorEncrypt(fileInfoString, password);
                    const dataWithDelimiter = encryptedData + this.delimiter;
                    const binary = this.stringToBinary(dataWithDelimiter);
                
                    // Check if image can hold the file
                    const maxBits = Math.floor(imageData.data.length / 4) * 3; // RGB channels only
                    if (binary.length > maxBits) {
                        reject(new Error('File too large for this image. Try a larger image or smaller file.'));
                        return;
                    }

                    // Clone image data
                    const newImageData = new ImageData(
                        new Uint8ClampedArray(imageData.data),
                        imageData.width,
                        imageData.height
                    );

                    let binaryIndex = 0;

                    // Encode file bits into LSB of RGB channels
                    for (let i = 0; i < newImageData.data.length && binaryIndex < binary.length; i += 4) {
                        // Red channel
                        if (binaryIndex < binary.length) {
                            newImageData.data[i] = (newImageData.data[i] & 0xFE) | parseInt(binary[binaryIndex]);
                            binaryIndex++;
                        }
                    
                        // Green channel
                        if (binaryIndex < binary.length) {
                            newImageData.data[i + 1] = (newImageData.data[i + 1] & 0xFE) | parseInt(binary[binaryIndex]);
                            binaryIndex++;
                        }
                    
                        // Blue channel
                        if (binaryIndex < binary.length) {
                            newImageData.data[i + 2] = (newImageData.data[i + 2] & 0xFE) | parseInt(binary[binaryIndex]);
                            binaryIndex++;
                        }
                    
                        // Alpha channel remains unchanged
                    }

                    resolve(newImageData);
                } catch (error) {
                    reject(error);
                }
            }).catch(reject);
        });
    }

    /**
     * Decode file from image
     */
    decode(imageData, password = '') {
        return new Promise((resolve, reject) => {
            try {
                let binary = '';
                
                // Extract LSB from RGB channels
                for (let i = 0; i < imageData.data.length; i += 4) {
                    // Red channel
                    binary += (imageData.data[i] & 1).toString();
                    
                    // Green channel  
                    binary += (imageData.data[i + 1] & 1).toString();
                    
                    // Blue channel
                    binary += (imageData.data[i + 2] & 1).toString();
                }

                // Convert binary to string
                const text = this.binaryToString(binary);
                
                // Find delimiter
                const delimiterIndex = text.indexOf(this.delimiter);
                if (delimiterIndex === -1) {
                    reject(new Error('No hidden file found or wrong password.'));
                    return;
                }

                // Extract encrypted file data
                const encryptedData = text.substring(0, delimiterIndex);
                
                // Decrypt file data
                const decryptedData = this.xorDecrypt(encryptedData, password);
                
                try {
                    const fileInfo = JSON.parse(decryptedData);
                    resolve(fileInfo);
                } catch (parseError) {
                    reject(new Error('Invalid file data or wrong password.'));
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get image capacity in bytes
     */
    getImageCapacity(imageData) {
        const totalBits = Math.floor(imageData.data.length / 4) * 3; // RGB channels only
        const delimiterBits = this.stringToBinary(this.delimiter).length;
        const fileInfoOverhead = 200 * 8; // Approximate overhead for file info (200 chars * 8 bits)
        return Math.floor((totalBits - delimiterBits - fileInfoOverhead) / 8); // 8 bits per byte
    }

    /**
     * Validate image format and size
     */
    validateImage(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        const maxSize = 50 * 1024 * 1024; // 50MB for cover images

        if (!validTypes.includes(file.type)) {
            throw new Error('Invalid file type. Please use PNG, JPG, or JPEG.');
        }

        if (file.size > maxSize) {
            throw new Error('Cover image too large. Maximum size is 50MB.');
        }

        return true;
    }

    /**
     * Validate file to be hidden
     */
    validateHiddenFile(file) {
        const maxSize = 5 * 1024 * 1024; // 5MB for hidden files

        if (file.size > maxSize) {
            throw new Error('File to hide is too large. Maximum size is 5MB.');
        }

        return true;
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Load image file and get image data
     */
    loadImageData(file) {
        return new Promise((resolve, reject) => {
            try {
                this.validateImage(file);

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();

                img.onload = () => {
                    const imageData = this.createImageData(img);
                    resolve({
                        imageData,
                        canvas,
                        originalImage: img
                    });
                };

                img.onerror = () => {
                    reject(new Error('Failed to load image.'));
                };

                img.src = URL.createObjectURL(file);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Convert canvas to blob for download
     */
    canvasToBlob(canvas, format = 'image/png', quality = 0.9) {
        return new Promise((resolve) => {
            canvas.toBlob(resolve, format, quality);
        });
    }

    /**
     * Create ImageData from an Image element
     * Used for both uploaded images and embedded images from the inbox
     */
    createImageData(img) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
}

// Export for use in main app
window.Steganography = Steganography;