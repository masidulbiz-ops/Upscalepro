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
let modelLoaded = true; // Start with true for basic functionality

// Initialize event listeners
function init() {
    console.log('Initializing image upscaler...');
    
    // File input events
    fileInput.addEventListener('change', handleFolderUpload);
    singleFileInput.addEventListener('change', handleFileUpload);
    
    // Drag and drop events
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.style.borderColor = 'white';
        dropArea.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    });
    
    dropArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropArea.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        dropArea.style.backgroundColor = 'transparent';
    });
    
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
    
    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target === previewModal) {
            previewModal.style.display = 'none';
        }
    });
    
    console.log('Initialization complete. Ready to process images.');
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

// Handle drop event
function handleDrop(e) {
    e.preventDefault();
    dropArea.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    dropArea.style.backgroundColor = 'transparent';
    
    const items = e.dataTransfer.items;
    const newFiles = [];
    
    // Get all files from the drop
    for (let item of items) {
        if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file) {
                newFiles.push(file);
            }
        }
    }
    
    addFiles(newFiles);
}

// Add files to the list
function addFiles(newFiles) {
    // Filter for images only
    const imageFiles = newFiles.filter(file => {
        if (!file.type) {
            // Check by file extension if type is not available
            const extension = file.name.split('.').pop().toLowerCase();
            return ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'].includes(extension);
        }
        return file.type.startsWith('image/');
    });
    
    // Check file size (max 10MB)
    const validFiles = imageFiles.filter(file => file.size <= 10 * 1024 * 1024);
    
    // Check total file count
    const totalFiles = files.length + validFiles.length;
    if (totalFiles > 50) {
        alert('Maximum 50 images allowed. You can add ' + (50 - files.length) + ' more images.');
        return;
    }
    
    // Add warning for large files
    validFiles.forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
            console.log(`Large file detected: ${file.name} (${formatFileSize(file.size)})`);
        }
    });
    
    // Add to files array
    files.push(...validFiles);
    updateFileList();
    
    if (validFiles.length > 0) {
        alert(`Added ${validFiles.length} image(s) successfully!`);
    }
}

// Update file list UI
function updateFileList() {
    filesContainer.innerHTML = '';
    
    if (files.length === 0) {
        filesContainer.innerHTML = '<p class="empty-message">No files selected yet</p>';
        fileCount.textContent = '0';
        processBtn.disabled = true;
        return;
    }
    
    fileCount.textContent = files.length;
    processBtn.disabled = false;
    
    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.index = index;
        
        const size = formatFileSize(file.size);
        const extension = file.name.split('.').pop().toUpperCase();
        
        fileItem.innerHTML = `
            <i class="fas fa-file-image file-icon"></i>
            <div class="file-info">
                <div class="file-name" title="${file.name}">${truncateFileName(file.name, 30)}</div>
                <div class="file-size">${size} • ${extension}</div>
            </div>
            <i class="fas fa-times file-remove" title="Remove file"></i>
        `;
        
        // Add click event to remove button
        const removeBtn = fileItem.querySelector('.file-remove');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFile(index);
        });
        
        // Add click event to preview image
        fileItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('file-remove')) {
                previewFile(file);
            }
        });
        
        filesContainer.appendChild(fileItem);
    });
}

// Remove file from list
function removeFile(index) {
    if (confirm(`Remove "${files[index].name}" from the list?`)) {
        files.splice(index, 1);
        updateFileList();
    }
}

// Preview a single file
function previewFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('originalPreview').src = e.target.result;
        document.getElementById('upscaledPreview').src = e.target.result;
        document.getElementById('originalInfo').textContent = 
            `${file.name} (${formatFileSize(file.size)})`;
        document.getElementById('upscaledInfo').textContent = 
            'Preview only - not processed yet';
        previewModal.style.display = 'flex';
    };
    reader.readAsDataURL(file);
}

// Select all files
function selectAllFiles() {
    alert(`${files.length} files selected for processing.`);
}

// Clear all files
function clearAllFiles() {
    if (files.length > 0) {
        if (confirm(`Clear all ${files.length} selected files?`)) {
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

// Main processing function
async function processImages() {
    if (files.length === 0) {
        alert('Please select images to process first.');
        return;
    }
    
    // Get settings
    const scale = parseInt(upscaleFactor.value);
    const sharpness = parseInt(sharpnessControl.value);
    const noiseReduction = parseInt(noiseReductionControl.value);
    const format = outputFormat.value;
    const preserveDetails = document.getElementById('preserveDetails').checked;
    
    // Disable process button
    processBtn.disabled = true;
    processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    // Clear previous results
    resultsGrid.innerHTML = '';
    processedFiles = [];
    
    // Process each file
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Update progress
        const progress = Math.round((i / files.length) * 100);
        updateProgress(progress, `Processing ${i + 1} of ${files.length}: ${truncateFileName(file.name, 20)}`);
        
        try {
            // Process image
            const result = await processImage(file, scale, sharpness, noiseReduction, format, preserveDetails);
            processedFiles.push(result);
            
            // Add to results grid
            addResultToGrid(result, i);
            
        } catch (error) {
            console.error(`Failed to process ${file.name}:`, error);
            updateProgress(progress, `Error processing: ${file.name}`);
            
            // Show error in results
            addErrorToGrid(file.name, error.message);
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
        alert(`Successfully processed ${processedFiles.length} image(s)!`);
    }
}

// Process single image (using Canvas API - no AI dependency)
async function processImage(file, scale, sharpness, noiseReduction, format, preserveDetails) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = new Image();
            
            img.onload = function() {
                try {
                    // Calculate new dimensions
                    const newWidth = img.width * scale;
                    const newHeight = img.height * scale;
                    
                    // Create canvas for processing
                    const canvas = document.createElement('canvas');
                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    const ctx = canvas.getContext('2d');
                    
                    // Draw image to canvas (upscale)
                    ctx.imageSmoothingEnabled = preserveDetails;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, newWidth, newHeight);
                    
                    // Apply sharpness if enabled
                    if (sharpness > 50) {
                        applySharpnessEffect(ctx, canvas, sharpness);
                    }
                    
                    // Apply noise reduction if enabled
                    if (noiseReduction > 30) {
                        applyNoiseReductionEffect(ctx, canvas, noiseReduction);
                    }
                    
                    // Get processed image data
                    let mimeType = 'image/png';
                    let quality = 0.95;
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
                        default:
                            mimeType = 'image/png';
                            extension = 'png';
                    }
                    
                    // Convert to data URL
                    const dataUrl = canvas.toDataURL(mimeType, quality);
                    
                    // Create result object
                    const result = {
                        original: file,
                        originalUrl: e.target.result,
                        processedUrl: dataUrl,
                        fileName: file.name.replace(/\.[^/.]+$/, "") + `_${scale}x.${extension}`,
                        format: format,
                        originalSize: file.size,
                        processedSize: Math.round(dataUrl.length * 0.75), // Approximate
                        dimensions: `${img.width}x${img.height} → ${newWidth}x${newHeight}`,
                        scale: scale,
                        sharpness: sharpness,
                        noiseReduction: noiseReduction
                    };
                    
                    resolve(result);
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = function() {
                reject(new Error('Failed to load image'));
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = function() {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsDataURL(file);
    });
}

// Apply sharpness effect using convolution
function applySharpnessEffect(ctx, canvas, sharpness) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    // Create a copy of the image data
    const originalData = new Uint8ClampedArray(data);
    
    // Simple sharpening kernel
    const strength = (sharpness - 50) / 100; // Normalize to -0.5 to 0.5
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            
            // Get surrounding pixels
            const top = ((y - 1) * width + x) * 4;
            const bottom = ((y + 1) * width + x) * 4;
            const left = (y * width + (x - 1)) * 4;
            const right = (y * width + (x + 1)) * 4;
            
            // Apply simple sharpening (center pixel * (1+strength) - neighbors * strength/4)
            for (let c = 0; c < 3; c++) { // R, G, B channels
                const neighborAvg = (
                    originalData[top + c] +
                    originalData[bottom + c] +
                    originalData[left + c] +
                    originalData[right + c]
                ) / 4;
                
                data[idx + c] = Math.min(255, Math.max(0,
                    originalData[idx + c] * (1 + strength) - neighborAvg * strength
                ));
            }
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

// Apply noise reduction effect
function applyNoiseReductionEffect(ctx, canvas, noiseReduction) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    // Create a copy
    const tempData = new Uint8ClampedArray(data);
    
    // Determine kernel size based on noise reduction level
    const kernelSize = Math.floor(noiseReduction / 30); // 1, 2, or 3
    const radius = kernelSize;
    
    // Simple box blur for noise reduction
    for (let y = radius; y < height - radius; y++) {
        for (let x = radius; x < width - radius; x++) {
            let r = 0, g = 0, b = 0, count = 0;
            
            // Average pixels in kernel
            for (let ky = -radius; ky <= radius; ky++) {
                for (let kx = -radius; kx <= radius; kx++) {
                    const idx = ((y + ky) * width + (x + kx)) * 4;
                    r += tempData[idx];
                    g += tempData[idx + 1];
                    b += tempData[idx + 2];
                    count++;
                }
            }
            
            const idx = (y * width + x) * 4;
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
        <img src="${result.processedUrl}" alt="${result.fileName}" class="result-preview" loading="lazy">
        <div class="result-info">
            <div class="result-name" title="${result.fileName}">${truncateFileName(result.fileName, 25)}</div>
            <div class="result-stats">
                <span>${result.dimensions}</span>
                <span>${formatFileSize(result.processedSize)}</span>
            </div>
            <div class="result-stats">
                <span>Scale: ${result.scale}x</span>
                <span>${result.format.toUpperCase()}</span>
            </div>
            <div class="result-actions">
                <button class="btn-view" data-index="${index}">
                    <i class="fas fa-search"></i> Compare
                </button>
                <button class="btn-download-single" data-index="${index}">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners
    const viewBtn = resultItem.querySelector('.btn-view');
    const downloadBtn = resultItem.querySelector('.btn-download-single');
    
    viewBtn.addEventListener('click', () => previewProcessedImage(index));
    downloadBtn.addEventListener('click', () => downloadSingle(index));
    
    resultsGrid.appendChild(resultItem);
}

// Add error to grid
function addErrorToGrid(fileName, error) {
    const errorItem = document.createElement('div');
    errorItem.className = 'result-item error';
    errorItem.style.borderLeft = '4px solid var(--danger)';
    
    errorItem.innerHTML = `
        <div class="result-info">
            <div class="result-name" style="color: var(--danger)">${fileName}</div>
            <div class="result-stats">
                <span><i class="fas fa-exclamation-triangle"></i> Processing Failed</span>
            </div>
            <div class="result-stats">
                <span style="color: var(--gray); font-size: 0.9em;">${error}</span>
            </div>
        </div>
    `;
    
    resultsGrid.appendChild(errorItem);
}

// Preview processed image
function previewProcessedImage(index) {
    const result = processedFiles[index];
    
    if (!result) {
        alert('Image not found');
        return;
    }
    
    document.getElementById('originalPreview').src = result.originalUrl;
    document.getElementById('upscaledPreview').src = result.processedUrl;
    
    document.getElementById('originalInfo').textContent = 
        `${result.original.name} (${formatFileSize(result.originalSize)})`;
    
    document.getElementById('upscaledInfo').textContent = 
        `${result.fileName} (${formatFileSize(result.processedSize)}) • ${result.dimensions}`;
    
    previewModal.style.display = 'flex';
}

// Download single image
function downloadSingle(index) {
    const result = processedFiles[index];
    
    if (!result) {
        alert('Image not found');
        return;
    }
    
    const link = document.createElement('a');
    link.href = result.processedUrl;
    link.download = result.fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show download confirmation
    alert(`Downloading: ${result.fileName}`);
}

// Download all processed images
function downloadAll() {
    if (processedFiles.length === 0) {
        alert('No images to download');
        return;
    }
    
    if (confirm(`Download all ${processedFiles.length} processed images?`)) {
        // Download each file with a delay to avoid browser blocking
        processedFiles.forEach((result, index) => {
            setTimeout(() => {
                const link = document.createElement('a');
                link.href = result.processedUrl;
                link.download = result.fileName;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, index * 300);
        });
        
        alert(`Started downloading ${processedFiles.length} images...`);
    }
}

// Clear results
function clearResults() {
    if (processedFiles.length === 0) {
        alert('No results to clear');
        return;
    }
    
    if (confirm(`Clear all ${processedFiles.length} results?`)) {
        resultsGrid.innerHTML = `
            <div class="empty-results">
                <i class="fas fa-image"></i>
                <p>Processed images will appear here</p>
            </div>
        `;
        processedFiles = [];
        downloadAllBtn.disabled = true;
        alert('Results cleared successfully!');
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

function truncateFileName(name, maxLength) {
    if (name.length <= maxLength) return name;
    const extension = name.split('.').pop();
    const nameWithoutExt = name.substring(0, name.length - extension.length - 1);
    const truncated = nameWithoutExt.substring(0, maxLength - extension.length - 3);
    return truncated + '...' + extension;
}

// Simulate AI model loading (for demonstration)
function simulateModelLoading() {
    progressText.textContent = 'Loading image processor...';
    let progress = 0;
    
    const interval = setInterval(() => {
        progress += 10;
        progressBar.style.width = `${progress}%`;
        progressPercent.textContent = `${progress}%`;
        
        if (progress >= 100) {
            clearInterval(interval);
            progressText.textContent = 'Ready to process images';
            progressPercent.textContent = '100%';
            modelLoaded = true;
            
            // Enable process button
            setTimeout(() => {
                if (files.length > 0) {
                    processBtn.disabled = false;
                }
            }, 500);
        }
    }, 200);
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    init();
    simulateModelLoading();
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + O to open file selector
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        singleFileInput.click();
    }
    
    // Escape to close modal
    if (e.key === 'Escape' && previewModal.style.display === 'flex') {
        previewModal.style.display = 'none';
    }
});

// Add service worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(error => {
            console.log('ServiceWorker registration failed:', error);
        });
    });
}
