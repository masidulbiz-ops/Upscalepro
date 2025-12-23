const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.static('public'));

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|webp|bmp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    }
});

// API endpoint for image processing
app.post('/api/upscale', upload.array('images', 50), async (req, res) => {
    try {
        const { scale = 2, sharpness = 50, noise = 30, format = 'png' } = req.body;
        const scaleFactor = parseFloat(scale);
        const sharpnessValue = parseFloat(sharpness) / 100;
        const noiseValue = parseFloat(noise) / 100;
        
        const processedImages = [];
        
        for (const file of req.files) {
            let image = sharp(file.path);
            
            // Get image metadata
            const metadata = await image.metadata();
            
            // Calculate new dimensions
            const newWidth = Math.round(metadata.width * scaleFactor);
            const newHeight = Math.round(metadata.height * scaleFactor);
            
            // Resize image
            image = image.resize(newWidth, newHeight, {
                kernel: sharp.kernel.lanczos3
            });
            
            // Apply sharpness
            if (sharpnessValue > 0.5) {
                image = image.sharp(sharpnessValue * 2);
            }
            
            // Apply noise reduction (simulated with blur)
            if (noiseValue > 0) {
                const sigma = noiseValue * 0.5;
                image = image.blur(sigma);
            }
            
            // Set output format
            let outputOptions = {};
            switch(format) {
                case 'jpg':
                    image = image.jpeg({ quality: 95 });
                    break;
                case 'webp':
                    image = image.webp({ quality: 90 });
                    break;
                default:
                    image = image.png({ compressionLevel: 9 });
            }
            
            // Process image
            const outputBuffer = await image.toBuffer();
            
            processedImages.push({
                originalName: file.originalname,
                processedName: `upscaled_${scaleFactor}x_${file.originalname}`,
                data: outputBuffer.toString('base64'),
                format: format,
                size: outputBuffer.length,
                dimensions: `${newWidth}x${newHeight}`
            });
            
            // Clean up uploaded file
            fs.unlinkSync(file.path);
        }
        
        res.json({
            success: true,
            images: processedImages,
            message: `Successfully processed ${processedImages.length} images`
        });
        
    } catch (error) {
        console.error('Processing error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
