// DOM Elements
const fileInput = document.getElementById('fileInput');
const singleFileInput = document.getElementById('singleFileInput');
const dropArea = document.getElementById('dropArea');
const filesContainer = document.getElementById('filesContainer');
const fileCount = document.getElementById('fileCount');
const processBtn = document.getElementById('processBtn');
const resultsGrid = document.getElementById('resultsGrid');
const downloadAllBtn = document.getElementById('downloadAll');
const clearResultsBtn = document.getElementById('clearResults');
const selectAllBtn = document.getElementById('selectAll');
const clearAllBtn = document.getElementById('clearAll');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');
const previewModal = document.getElementById('previewModal');
const closeModal = document.querySelector('.close-modal');

// Control Elements
const upscaleFactor = document.getElementById('upscaleFactor');
const sharpnessControl = document.getElementById('sharpness');
const noiseReductionControl = document.getElementById('noiseReduction');
const upscaleValue = document.getElementById('upscaleValue');
const sharpnessValue = document.getElementById('sharpnessValue');
const noiseValue = document.getElementById('noiseValue');
const outputFormat = document.getElementById('outputFormat');
const scaleOptions = document.querySelectorAll('.scale-option');

// State
let files = [];
let processedFiles = [];
let upscaler = null;

// Initialize event listeners
function init() {
    // File input events
    fileInput.addEventListener('change', handleFolderUpload);
    singleFileInput.addEventListener('change', handleFileUpload);
    
    // Drag and drop events
    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('dragleave', handleDragLeave);
    dropArea.addEventListener('drop', handleDrop);
    
    // Control events
    upscaleFactor.addEventListener('input', updateUpscaleValue);
    sharpnessControl.addEventListener('input', updateSharpnessValue);
    noiseReductionControl.addEventListener('input', updateNoiseValue);
    
    // Scale option buttons
    scaleOptions.forEach(option => {
        option.addEventListener('click', () => {
            const value = parseInt(option.dataset.value);
            upscaleFactor.value = value;
            updateUpscaleValue();
            scaleOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
        });
    });
    
    // Button events
    processBtn.addEventListener('click', processImages);
    downloadAllBtn.addEventListener('click', downloadAll);
    clearResultsBtn.addEventListener('click', clearResults);
    selectAllBtn.addEventListener('click', selectAllFiles);
    clearAllBtn.addEventListener('click', clearAllFiles);
    closeModal.addEventListener('click', () => {
        previewModal.style.display = 'none';
    });
    
    // Initialize scale buttons
    updateUpscaleValue();
    updateSharpnessValue();
    updateNoiseValue();
    
    // Load Upscaler.js model
    loadUpscalerModel();
}

// Load AI model for upscaling
async function loadUpscalerModel() {
    try {
        progressText.textContent = 'Loading AI model...';
        upscaler = new Upscaler({
            model: 'esrgan-thick',
        });
        console.log('Upscaler model loaded successfully');
        progressText.textContent = 'Ready to process';
    } catch (error) {
        console.error('Failed to load upscaler model:', error);
        progressText.textContent = 'Error loading model';
    }
}

// Handle folder upload
function handleFolderUpload(e) {
    const newFiles = Array.from(e.target.files);
    addFiles(newFiles);
}

// Handle single file upload
function handleFileUpload(e) {
    const newFiles = Array.from(e.target.files);
    addFiles(newFiles);
}

// Handle drag over
function handleDragOver(e) {
    e.preventDefault();
    dropArea.style.borderColor = 'white';
    dropArea.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
}

// Handle drag leave
function handleDragLeave(e) {
    e.preventDefault();
    dropArea.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    dropArea.style.backgroundColor = 'transparent';
}

// Handle drop
function handleDrop(e) {
    e.preventDefault();
    handleDragLeave(e);
    
    const items = e.dataTransfer.items;
    const newFiles = [];
    
    for (let item of items) {
        if (item.kind === 'file') {
            const entry = item.webkitGetAsEntry();
            if (entry) {
                traverseFileTree(entry, newFiles);
            }
        }
    }
    
    // Process files after traversal
    setTimeout(() => addFiles(newFiles), 100);
}

// Traverse directory tree
function traverseFileTree(item, fileList, path = '') {
    if (item.isFile) {
        item.file(file => {
            file.relativePath = path + file.name;
            fileList.push(file);
        });
    } else if (item.isDirectory) {
        const dirReader = item.createReader();
        dirReader.readEntries(entries => {
            for (let entry of entries) {
                traverseFileTree(entry, fileList, path + item.name + '/');
            }
        });
    }
}

// Add files to the list
function addFiles(newFiles) {
    // Filter for images only
    const imageFiles = newFiles.filter(file => 
        file.type.startsWith('image/') && 
        ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'].includes(file.type)
    );
    
    // Check file size (max 10MB)
    const validFiles = imageFiles.filter(file => file.size <= 10 * 1024 * 1024);
    
    // Check total file count
    const totalFiles = files.length + validFiles.length;
    if (totalFiles > 50) {
        alert('Maximum 50 images allowed');
        return;
    }
    
    // Add to files array
    files.push(...validFiles);
    updateFileList();
}

// Update file list UI
function updateFileList() {
    filesContainer.innerHTML = '';
    
    if (files.length === 0) {
        filesContainer.innerHTML = '<p class="empty-message">No files selected yet</p>';
        fileCount.textContent = '0';
        return;
    }
    
    fileCount.textContent = files.length;
    
    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.index = index;
        
        const size = formatFileSize(file.size);
        
        fileItem.innerHTML = `
            <i class="fas fa-file-image file-icon"></i>
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${size}</div>
            </div>
            <i class="fas fa-times file-remove" onclick="removeFile(${index})"></i>
        `;
        
        filesContainer.appendChild(fileItem);
    });
}

// Remove file from list
function removeFile(index) {
    files.splice(index, 1);
    updateFileList();
}

// Select all files
function selectAllFiles() {
    // In a real implementation, this would toggle selection state
    alert('All files selected');
}

// Clear all files
function clearAllFiles() {
    if (files.length > 0) {
        if (confirm('Clear all selected files?')) {
            files = [];
            updateFileList();
        }
    }
}

// Update control values
function updateUpscaleValue() {
    const value = upscaleFactor.value;
    upscaleValue.textContent = `${value}x`;
    
    // Update active scale button
    scaleOptions.forEach(option => {
        option.classList.toggle('active', option.dataset.value === value);
    });
}

function updateSharpnessValue() {
    sharpnessValue.textContent = sharpnessControl.value;
}

function updateNoiseValue() {
    noiseValue.textContent = noiseReductionControl.value;
}

// Process images
async function processImages() {
    if (files.length === 0) {
        alert('Please select images to process');
        return;
    }
    
    if (!upscaler) {
        alert('AI model is still loading. Please wait...');
        return;
    }
    
    // Disable process button
    processBtn.disabled = true;
    processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    // Clear previous results
    resultsGrid.innerHTML = '';
    processedFiles = [];
    
    // Get settings
    const scale = parseInt(upscaleFactor.value);
    const sharpness = parseInt(sharpnessControl.value) / 100;
    const noiseReduction = parseInt(noiseReductionControl.value) / 100;
    const format = outputFormat.value;
    
    // Process each file
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Update progress
        const progress = Math.round((i / files.length) * 100);
        updateProgress(progress, `Processing ${i + 1} of ${files.length}: ${file.name}`);
        
        try {
            // Process image
            const result = await processImage(file, scale, sharpness, noiseReduction, format);
            processedFiles.push(result);
            
            // Add to results grid
            addResultToGrid(result, i);
            
        } catch (error) {
            console.error(`Failed to process ${file.name}:`, error);
            updateProgress(progress, `Error processing: ${file.name}`);
        }
    }
    
    // Complete progress
    updateProgress(100, 'Processing complete!');
    
    // Re-enable process button
    processBtn.disabled = false;
    processBtn.innerHTML = '<i class="fas fa-bolt"></i> Start Upscaling';
    
    // Enable download all button
    if (processedFiles.length > 0) {
        downloadAllBtn.disabled = false;
    }
}

// Process single image
async function processImage(file, scale, sharpness, noiseReduction, format) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                // Create image element
                const img = new Image();
                img.onload = async function() {
                    try {
                        // Create canvas for original image
                        const originalCanvas = document.createElement('canvas');
                        const originalCtx = originalCanvas.getContext('2d');
                        originalCanvas.width = img.width;
                        originalCanvas.height = img.height;
                        originalCtx.drawImage(img, 0, 0);
                        
                        // Apply upscaling with Upscaler.js
                        const upscaledImage = await upscaler.upscale(img);
                        
                        // Create canvas for upscaled image
                        const upscaledCanvas = document.createElement('canvas');
                        const upscaledCtx = upscaledCanvas.getContext('2d');
                        
                        // Calculate new dimensions
                        const newWidth = img.width * scale;
                        const newHeight = img.height * scale;
                        
                        // Set canvas size
                        upscaledCanvas.width = newWidth;
                        upscaledCanvas.height = newHeight;
                        
                        // Draw upscaled image
                        const upscaledImg = new Image();
                        upscaledImg.src = upscaledImage.src;
                        
                        await new Promise(resolve => {
                            upscaledImg.onload = () => {
                                upscaledCtx.drawImage(upscaledImg, 0, 0, newWidth, newHeight);
                                
                                // Apply sharpness (simulated)
                                if (sharpness > 0.5) {
                                    applySharpness(upscaledCtx, upscaledCanvas, sharpness);
                                }
                                
                                // Apply noise reduction (simulated)
                                if (noiseReduction > 0) {
                                    applyNoiseReduction(upscaledCtx, upscaledCanvas, noiseReduction);
                                }
                                
                                // Convert to desired format
                                let mimeType = 'image/png';
                                let extension = 'png';
                                
                                switch(format) {
                                    case 'jpg':
                                        mimeType = 'image/jpeg';
                                        extension = 'jpg';
                                        break;
                                    case 'webp':
                                        mimeType = 'image/webp';
                                        extension = 'webp';
                                        break;
                                }
                                
                                // Get data URL
                                const dataUrl = upscaledCanvas.toDataURL(mimeType, 0.95);
                                
                                // Create result object
                                const result = {
                                    original: file,
                                    originalUrl: e.target.result,
                                    processedUrl: dataUrl,
                                    processedBlob: dataURLToBlob(dataUrl),
                                    fileName: file.name.replace(/\.[^/.]+$/, "") + `_upscaled_${scale}x.${extension}`,
                                    format: format,
                                    originalSize: file.size,
                                    processedSize: dataUrl.length * 0.75, // Approximate
                                    dimensions: `${img.width}x${img.height} → ${newWidth}x${newHeight}`,
                                    scale: scale
                                };
                                
                                resolve(result);
                            };
                        });
                        
                        const result = await new Promise(resolve => {
                            upscaledImg.onload = () => {
                                const result = {
                                    original: file,
                                    originalUrl: e.target.result,
                                    processedUrl: upscaledCanvas.toDataURL(),
                                    fileName: file.name.replace(/\.[^/.]+$/, "") + `_upscaled_${scale}x.png`,
                                    format: 'png',
                                    originalSize: file.size,
                                    processedSize: upscaledCanvas.toDataURL().length * 0.75,
                                    dimensions: `${img.width}x${img.height} → ${newWidth}x${newHeight}`,
                                    scale: scale
                                };
                                resolve(result);
                            };
                        });
                        
                        resolve(result);
                        
                    } catch (error) {
                        reject(error);
                    }
                };
                
                img.src = e.target.result;
                
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Apply sharpness effect (simplified)
function applySharpness(ctx, canvas, amount) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const strength = Math.min(amount * 2, 1.5);
    
    // Simple sharpening convolution kernel
    for (let i = 4; i < data.length - 4; i += 4) {
        // Simple edge enhancement
        data[i] = Math.min(255, data[i] * (1 + strength * 0.5));
        data[i + 1] = Math.min(255, data[i + 1] * (1 + strength * 0.5));
        data[i + 2] = Math.min(255, data[i + 2] * (1 + strength * 0.5));
    }
    
    ctx.putImageData(imageData, 0, 0);
}

// Apply noise reduction (simplified)
function applyNoiseReduction(ctx, canvas, amount) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const radius = Math.floor(amount * 0.5);
    
    // Simple averaging filter for noise reduction
    for (let y = radius; y < canvas.height - radius; y++) {
        for (let x = radius; x < canvas.width - radius; x++) {
            const idx = (y * canvas.width + x) * 4;
            
            let r = 0, g = 0, b = 0, count = 0;
            
            // Average neighboring pixels
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nIdx = ((y + dy) * canvas.width + (x + dx)) * 4;
                    r += data[nIdx];
                    g += data[nIdx + 1];
                    b += data[nIdx + 2];
                    count++;
                }
            }
            
            data[idx] = r / count;
            data[idx + 1] = g / count;
            data[idx + 2] = b / count;
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

// Add result to grid
function addResultToGrid(result, index) {
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    
    resultItem.innerHTML = `
        <img src="${result.processedUrl}" alt="${result.fileName}" class="result-preview">
        <div class="result-info">
            <div class="result-name">${result.fileName}</div>
            <div class="result-stats">
                <span>${result.dimensions}</span>
                <span>${formatFileSize(result.processedSize)}</span>
            </div>
            <div class="result-actions">
                <button class="btn-view" onclick="previewImage(${index})">
                    <i class="fas fa-search"></i> Compare
                </button>
                <button class="btn-download-single" onclick="downloadSingle(${index})">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        </div>
    `;
    
    resultsGrid.appendChild(resultItem);
}

// Preview image comparison
function previewImage(index) {
    const result = processedFiles[index];
    
    document.getElementById('originalPreview').src = result.originalUrl;
    document.getElementById('upscaledPreview').src = result.processedUrl;
    
    document.getElementById('originalInfo').textContent = 
        `${result.original.name} (${formatFileSize(result.originalSize)})`;
    
    document.getElementById('upscaledInfo').textContent = 
        `${result.fileName} (${formatFileSize(result.processedSize)})`;
    
    previewModal.style.display = 'flex';
}

// Download single image
function downloadSingle(index) {
    const result = processedFiles[index];
    const link = document.createElement('a');
    link.href = result.processedUrl;
    link.download = result.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Download all processed images
function downloadAll() {
    if (processedFiles.length === 0) return;
    
    if (processedFiles.length === 1) {
        downloadSingle(0);
        return;
    }
    
    // For multiple files, create a ZIP (in a real app, you'd use JSZip)
    alert(`Downloading ${processedFiles.length} files...\n\nIn a full implementation, this would create a ZIP file with all images.`);
    
    // Fallback: download each file individually
    processedFiles.forEach((result, index) => {
        setTimeout(() => downloadSingle(index), index * 100);
    });
}

// Clear results
function clearResults() {
    if (confirm('Clear all results?')) {
        resultsGrid.innerHTML = `
            <div class="empty-results">
                <i class="fas fa-image"></i>
                <p>Processed images will appear here</p>
            </div>
        `;
        processedFiles = [];
        downloadAllBtn.disabled = true;
    }
}

// Update progress bar
function updateProgress(percent, text) {
    progressBar.style.width = `${percent}%`;
    progressPercent.textContent = `${percent}%`;
    progressText.textContent = text;
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function dataURLToBlob(dataURL) {
    const parts = dataURL.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const b64 = atob(parts[1]);
    let n = b64.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = b64.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', init);