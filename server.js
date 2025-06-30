const express = require('express');
const cors = require('cors');
const multer = require('multer');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
    }
});

// Stirling PDF API URL
const STIRLING_API_URL = 'http://localhost:8080/api/v1/misc/compress-pdf';

// Function to find PDF files recursively
function findPDFsRecursively(dir, baseDir = null) {
    const results = [];
    const actualBaseDir = baseDir || dir;
    
    try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            
            try {
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    // Recursively search subdirectories
                    results.push(...findPDFsRecursively(fullPath, actualBaseDir));
                } else if (stat.isFile() && item.toLowerCase().endsWith('.pdf')) {
                    // Add PDF file with relative path from base directory
                    const relativePath = path.relative(actualBaseDir, fullPath);
                    results.push({
                        relativePath: relativePath,
                        fullPath: fullPath,
                        fileName: item,
                        directory: path.dirname(fullPath)
                    });
                }
            } catch (statError) {
                // Skip files/directories that can't be accessed
                console.warn(`⚠️ Cannot access: ${fullPath} - ${statError.message}`);
            }
        }
    } catch (error) {
        console.error(`❌ Error reading directory: ${dir} - ${error.message}`);
    }
    
    return results;
}


// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'PDF Compressor Proxy Server is running' });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Proxy endpoint for PDF compression
app.post('/api/compress-pdf', upload.single('fileInput'), async (req, res) => {
    try {
        console.log(`📄 Processing PDF: ${req.file ? req.file.originalname : 'unknown'}`);
        console.log(`📏 File size: ${req.file ? (req.file.size / 1024 / 1024).toFixed(2) : 0}MB`);
        console.log(`⚙️ Optimization level: ${req.body.optimizeLevel || 3}`);
        console.log(`📁 Destination path: ${req.body.destinationPath || 'not specified'}`);
        console.log(`🔍 ALL REQUEST BODY:`, req.body);
        console.log(`🔍 FILE INFO:`, {
            originalname: req.file?.originalname,
            mimetype: req.file?.mimetype,
            size: req.file?.size
        });

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Create form data for Stirling PDF API
        const formData = new FormData();
        formData.append('fileInput', req.file.buffer, {
            filename: req.file.originalname,
            contentType: 'application/pdf'
        });
        formData.append('optimizeLevel', req.body.optimizeLevel || '3');

        console.log('🔄 Forwarding request to Stirling PDF API...');

        // Make request to Stirling PDF API
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(STIRLING_API_URL, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Stirling API error: ${response.status} - ${errorText}`);
            return res.status(response.status).json({ 
                error: `Stirling API error: ${response.status}`,
                details: errorText
            });
        }

        // Get the compressed PDF
        const compressedBuffer = await response.buffer();
        const originalSize = req.file.size;
        const compressedSize = compressedBuffer.length;
        const savings = Math.round(((originalSize - compressedSize) / originalSize) * 100);

        console.log(`✅ Compression complete!`);
        console.log(`📊 Original: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);
        console.log(`📊 Compressed: ${(compressedSize / 1024 / 1024).toFixed(2)}MB`);
        console.log(`📊 Savings: ${savings}%`);

        // Save file to user-specified destination path
        const destinationPath = req.body.destinationPath;
        let savedFilePath = null;

        try {
            let saveDir;
            
            if (destinationPath && destinationPath.trim()) {
                // Clean the path by removing leading/trailing quotes
                saveDir = destinationPath.trim().replace(/^['"]+|['"]+$/g, '');
                console.log(`📁 Using user-specified path: ${saveDir}`);
                
                // Validate that the path exists
                if (!fs.existsSync(saveDir)) {
                    return res.status(400).json({ 
                        error: 'Destination path does not exist',
                        path: saveDir 
                    });
                }
                
                // Validate that it's a directory
                if (!fs.statSync(saveDir).isDirectory()) {
                    return res.status(400).json({ 
                        error: 'Destination path is not a directory',
                        path: saveDir 
                    });
                }
            } else {
                // Fallback to Downloads if no destination specified
                const homeDir = require('os').homedir();
                saveDir = path.join(homeDir, 'Downloads', 'pdf-compressor');
                console.warn('⚠️ No destination path specified, using Downloads fallback');
            }
            
            console.log(`📁 Save directory determined: ${saveDir}`);
            console.log(`🔍 BEFORE SAVE - Directory exists: ${fs.existsSync(saveDir)}`);

            // Ensure directory exists
            if (!fs.existsSync(saveDir)) {
                console.log(`📁 Creating directory: ${saveDir}`);
                fs.mkdirSync(saveDir, { recursive: true });
            }

            // Create the output filename
            const outputFilename = req.file.originalname.replace('.pdf', '_red.pdf');
            savedFilePath = path.join(saveDir, outputFilename);
            
            console.log(`🔍 SAVING FILE:`);
            console.log(`   - Output filename: ${outputFilename}`);
            console.log(`   - Full save path: ${savedFilePath}`);
            console.log(`   - Buffer size: ${compressedBuffer.length} bytes`);

            // Write the compressed file
            fs.writeFileSync(savedFilePath, compressedBuffer);
            console.log(`💾 File saved to: ${savedFilePath}`);
            console.log(`🔍 AFTER SAVE - File exists: ${fs.existsSync(savedFilePath)}`);

            // Send response with file path instead of file content
            res.json({
                success: true,
                message: 'File compressed and saved successfully',
                originalSize,
                compressedSize,
                savings,
                savedPath: savedFilePath,
                filename: outputFilename
            });
            
        } catch (saveError) {
            console.error('❌ Error saving file:', saveError);
            // Fallback to sending the file as download
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${req.file.originalname.replace('.pdf', '_red.pdf')}"`,
                'Content-Length': compressedSize,
                'X-Original-Size': originalSize,
                'X-Compressed-Size': compressedSize,
                'X-Savings-Percent': savings
            });
            res.send(compressedBuffer);
        }

    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

// Endpoint to open folder in finder/explorer
app.post('/api/open-folder', (req, res) => {
    try {
        const { folderPath } = req.body;
        
        // Clean the path by removing leading/trailing quotes
        const cleanFolderPath = folderPath ? folderPath.trim().replace(/^['"]+|['"]+$/g, '') : null;
        
        if (!cleanFolderPath || !fs.existsSync(cleanFolderPath)) {
            return res.status(400).json({ error: 'Invalid folder path' });
        }

        const { exec } = require('child_process');
        let command;

        // Determine the command based on the operating system
        switch (process.platform) {
            case 'darwin': // macOS
                command = `open "${cleanFolderPath}"`;
                break;
            case 'win32': // Windows
                command = `explorer "${cleanFolderPath}"`;
                break;
            case 'linux': // Linux
                command = `xdg-open "${cleanFolderPath}"`;
                break;
            default:
                return res.status(500).json({ error: 'Unsupported operating system' });
        }

        exec(command, (error) => {
            if (error) {
                console.error('❌ Error opening folder:', error);
                res.status(500).json({ error: 'Failed to open folder' });
            } else {
                console.log(`📁 Opened folder: ${cleanFolderPath}`);
                res.json({ success: true, message: 'Folder opened successfully' });
            }
        });

    } catch (error) {
        console.error('❌ Error in open-folder endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Endpoint to list PDF files in a directory
app.post('/api/list-pdfs', (req, res) => {
    try {
        const { sourcePath } = req.body;
        
        if (!sourcePath || !sourcePath.trim()) {
            return res.status(400).json({ error: 'Source path is required' });
        }
        
        // Clean the path by removing leading/trailing quotes
        const dir = sourcePath.trim().replace(/^['"]+|['"]+$/g, '');
        
        // Validate that the path exists
        if (!fs.existsSync(dir)) {
            return res.status(400).json({ error: `Directory does not exist: ${dir}` });
        }
        
        // Validate that it's a directory
        if (!fs.statSync(dir).isDirectory()) {
            return res.status(400).json({ error: `Path is not a directory: ${dir}` });
        }
        
        // Get recursive parameter (default to true for better UX)
        const recursive = req.body.recursive !== false;
        
        // Find PDF files (recursively or not)
        let pdfFiles;
        try {
            if (recursive) {
                pdfFiles = findPDFsRecursively(dir);
            } else {
                const files = fs.readdirSync(dir);
                pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'))
                    .map(file => ({ relativePath: file, fullPath: path.join(dir, file) }));
            }
        } catch (readError) {
            console.error(`❌ Error reading directory: ${dir}`, readError);
            return res.status(400).json({ 
                error: `Cannot read directory: ${readError.message}`,
                path: dir 
            });
        }
        
        console.log(`📁 Listed ${pdfFiles.length} PDF files in: ${dir} (recursive: ${recursive})`);
        
        res.json({
            success: true,
            directory: dir,
            recursive: recursive,
            files: pdfFiles
        });
        
    } catch (error) {
        console.error('❌ Error listing PDFs:', error);
        res.status(500).json({ 
            error: error.message || 'Internal server error',
            details: 'Error occurred while processing directory listing'
        });
    }
});

// Endpoint to compress PDF from file path
app.post('/api/compress-pdf-from-path', async (req, res) => {
    try {
        const { sourcePath, fileName, optimizeLevel, destinationPath, deleteOriginal } = req.body;
        
        console.log(`📄 Processing PDF from path: ${fileName}`);
        console.log(`📁 Source: ${sourcePath}`);
        console.log(`📁 Destination: ${destinationPath}`);
        console.log(`⚙️ Optimization level: ${optimizeLevel || 3}`);
        console.log(`🗑️ Delete original: ${deleteOriginal ? 'YES' : 'NO'}`);
        
        if (!sourcePath || !fileName || !destinationPath) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        
        const filePath = path.join(sourcePath, fileName);
        
        // Validate source file exists
        if (!fs.existsSync(filePath)) {
            return res.status(400).json({ error: `File does not exist: ${filePath}` });
        }
        
        // Clean the destination path by removing leading/trailing quotes
        const cleanDestinationPath = destinationPath.trim().replace(/^['"]+|['"]+$/g, '');
        
        // Validate destination directory exists
        if (!fs.existsSync(cleanDestinationPath)) {
            return res.status(400).json({ error: `Destination directory does not exist: ${cleanDestinationPath}` });
        }
        
        // Read the PDF file
        const fileBuffer = fs.readFileSync(filePath);
        const fileStats = fs.statSync(filePath);
        const originalSize = fileStats.size;
        
        // Create form data for Stirling PDF API
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('fileInput', fileBuffer, {
            filename: fileName,
            contentType: 'application/pdf'
        });
        formData.append('optimizeLevel', optimizeLevel || '3');
        
        console.log('🔄 Forwarding request to Stirling PDF API...');
        
        // Make request to Stirling PDF API
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(STIRLING_API_URL, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Stirling API error: ${response.status} - ${errorText}`);
            return res.status(response.status).json({ 
                error: `Stirling API error: ${response.status}`,
                details: errorText
            });
        }
        
        // Get the compressed PDF
        const compressedBuffer = await response.buffer();
        const compressedSize = compressedBuffer.length;
        const savings = Math.round(((originalSize - compressedSize) / originalSize) * 100);
        
        console.log(`✅ Compression complete!`);
        console.log(`📊 Original: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);
        console.log(`📊 Compressed: ${(compressedSize / 1024 / 1024).toFixed(2)}MB`);
        console.log(`📊 Savings: ${savings}%`);
        
        // Save the compressed file
        const outputFilename = fileName.replace('.pdf', '_red.pdf');
        const savedFilePath = path.join(cleanDestinationPath, outputFilename);
        
        fs.writeFileSync(savedFilePath, compressedBuffer);
        console.log(`💾 File saved to: ${savedFilePath}`);
        
        // Delete original file if requested and compression was successful
        let originalDeleted = false;
        if (deleteOriginal) {
            try {
                // Double-check that compressed file exists and has content
                if (fs.existsSync(savedFilePath) && fs.statSync(savedFilePath).size > 0) {
                    // Verify it's a PDF file to avoid deleting wrong files
                    if (filePath.toLowerCase().endsWith('.pdf') && fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        originalDeleted = true;
                        console.log(`🗑️ Original file deleted: ${filePath}`);
                    } else {
                        console.warn(`⚠️ Skipped deletion - invalid file: ${filePath}`);
                    }
                } else {
                    console.error(`❌ Skipped deletion - compressed file validation failed: ${savedFilePath}`);
                }
            } catch (deleteError) {
                console.error(`❌ Error deleting original file: ${deleteError.message}`);
                // Don't fail the entire operation if deletion fails
            }
        }
        
        res.json({
            success: true,
            message: originalDeleted ? 'File compressed and original deleted' : 'File compressed and saved successfully',
            originalSize,
            compressedSize,
            savings,
            savedPath: savedFilePath,
            filename: outputFilename,
            originalDeleted
        });
        
    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

// Endpoint to compress PDF from full file path
app.post('/api/compress-pdf-from-full-path', async (req, res) => {
    try {
        const { fullPath, fileName, optimizeLevel, deleteOriginal } = req.body;
        
        // 🔍 DEBUG TEMPORÁRIO - TODOS os parâmetros recebidos
        console.log('🔍 DEBUG - TODOS os parâmetros recebidos:', JSON.stringify(req.body, null, 2));
        console.log('🔍 DEBUG - deleteOriginal value:', deleteOriginal);
        console.log('🔍 DEBUG - deleteOriginal type:', typeof deleteOriginal);
        
        console.log(`📄 Processing PDF from full path: ${fullPath}`);
        console.log(`⚙️ Optimization level: ${optimizeLevel || 3}`);
        console.log(`🗑️ Delete original: ${deleteOriginal ? 'YES' : 'NO'}`);
        
        if (!fullPath || !fileName) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        
        // Validate source file exists
        if (!fs.existsSync(fullPath)) {
            return res.status(400).json({ error: `File does not exist: ${fullPath}` });
        }
        
        // Extract original directory to save compressed file in same location
        const originalDirectory = path.dirname(fullPath);
        console.log(`📁 Will save to same directory as original: ${originalDirectory}`);
        
        // Read the PDF file
        const fileBuffer = fs.readFileSync(fullPath);
        const fileStats = fs.statSync(fullPath);
        const originalSize = fileStats.size;
        
        // Create form data for Stirling PDF API
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('fileInput', fileBuffer, {
            filename: fileName,
            contentType: 'application/pdf'
        });
        formData.append('optimizeLevel', optimizeLevel || '3');
        
        console.log('🔄 Forwarding request to Stirling PDF API...');
        
        // Make request to Stirling PDF API
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(STIRLING_API_URL, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Stirling API error: ${response.status} - ${errorText}`);
            return res.status(response.status).json({ 
                error: `Stirling API error: ${response.status}`,
                details: errorText
            });
        }
        
        // Get the compressed PDF
        const compressedBuffer = await response.buffer();
        const compressedSize = compressedBuffer.length;
        const savings = Math.round(((originalSize - compressedSize) / originalSize) * 100);
        
        console.log(`✅ Compression complete!`);
        console.log(`📊 Original: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);
        console.log(`📊 Compressed: ${(compressedSize / 1024 / 1024).toFixed(2)}MB`);
        console.log(`📊 Savings: ${savings}%`);
        
        // Save the compressed file in the same directory as the original
        const outputFilename = fileName.replace('.pdf', '_red.pdf');
        const savedFilePath = path.join(originalDirectory, outputFilename);
        
        fs.writeFileSync(savedFilePath, compressedBuffer);
        console.log(`💾 File saved to: ${savedFilePath}`);
        
        // Delete original file if requested and compression was successful
        let originalDeleted = false;
        if (deleteOriginal) {
            try {
                // Double-check that compressed file exists and has content
                if (fs.existsSync(savedFilePath) && fs.statSync(savedFilePath).size > 0) {
                    // Verify it's a PDF file to avoid deleting wrong files
                    if (fullPath.toLowerCase().endsWith('.pdf') && fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                        originalDeleted = true;
                        console.log(`🗑️ Original file deleted: ${fullPath}`);
                    } else {
                        console.warn(`⚠️ Skipped deletion - invalid file: ${fullPath}`);
                    }
                } else {
                    console.error(`❌ Skipped deletion - compressed file validation failed: ${savedFilePath}`);
                }
            } catch (deleteError) {
                console.error(`❌ Error deleting original file: ${deleteError.message}`);
                // Don't fail the entire operation if deletion fails
            }
        }
        
        res.json({
            success: true,
            message: originalDeleted ? 'File compressed and original deleted' : 'File compressed and saved successfully',
            originalSize,
            compressedSize,
            savings,
            savedPath: savedFilePath,
            filename: outputFilename,
            originalDeleted
        });
        
    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

// Test endpoint to validate file saving without compression
app.post('/api/test-save', upload.single('fileInput'), (req, res) => {
    try {
        console.log(`🧪 TEST SAVE ENDPOINT`);
        console.log(`📁 Destination path: ${req.body.destinationPath || 'not specified'}`);
        console.log(`📄 File: ${req.file?.originalname || 'no file'}`);
        
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const destinationPath = req.body.destinationPath;
        if (!destinationPath || !destinationPath.trim()) {
            return res.status(400).json({ error: 'No destination path specified' });
        }
        
        // Clean the path by removing leading/trailing quotes
        const saveDir = destinationPath.trim().replace(/^['"]+|['"]+$/g, '');
        
        // Validate path
        if (!fs.existsSync(saveDir)) {
            return res.status(400).json({ error: `Path does not exist: ${saveDir}` });
        }
        
        if (!fs.statSync(saveDir).isDirectory()) {
            return res.status(400).json({ error: `Path is not a directory: ${saveDir}` });
        }
        
        // Save original file (no compression)
        const testFilename = `test_${Date.now()}_${req.file.originalname}`;
        const testFilePath = path.join(saveDir, testFilename);
        
        fs.writeFileSync(testFilePath, req.file.buffer);
        
        console.log(`🧪 Test file saved to: ${testFilePath}`);
        console.log(`🧪 File exists after save: ${fs.existsSync(testFilePath)}`);
        
        res.json({
            success: true,
            message: 'Test file saved successfully',
            savedPath: testFilePath,
            filename: testFilename
        });
        
    } catch (error) {
        console.error('🧪 Test save error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint for file deletion capability
app.post('/api/test-delete', (req, res) => {
    try {
        console.log('🧪 Testing file deletion capability...');
        
        // Create a temporary test file
        const testFile = '/tmp/test_delete.txt';
        fs.writeFileSync(testFile, 'teste de deleção');
        console.log(`✅ Test file created: ${testFile}`);
        
        // Verify it exists
        if (fs.existsSync(testFile)) {
            console.log(`✅ Test file exists and can be accessed`);
            
            // Delete it
            fs.unlinkSync(testFile);
            console.log(`🗑️ Test file deleted successfully`);
            
            // Verify it's gone
            if (!fs.existsSync(testFile)) {
                console.log(`✅ Deletion confirmed - file no longer exists`);
                res.json({ 
                    success: true, 
                    message: 'File deletion test passed! Node.js can delete files normally.' 
                });
            } else {
                res.json({ 
                    success: false, 
                    message: 'File deletion failed - file still exists after unlinkSync' 
                });
            }
        } else {
            res.json({ 
                success: false, 
                message: 'Could not create test file' 
            });
        }
    } catch (error) {
        console.error('🧪 File deletion test error:', error);
        res.status(500).json({ 
            success: false, 
            message: `File deletion test failed: ${error.message}` 
        });
    }
});

// Test endpoint to check if Stirling PDF API is accessible
app.get('/api/test-stirling', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('http://localhost:8080/api/v1/info/status', {
            method: 'GET'
        });
        
        if (response.ok) {
            const data = await response.text();
            res.json({ 
                status: 'OK', 
                message: 'Stirling PDF API is accessible',
                stirlingResponse: data
            });
        } else {
            res.status(response.status).json({ 
                status: 'ERROR', 
                message: `Stirling PDF API returned status: ${response.status}`
            });
        }
    } catch (error) {
        res.status(500).json({ 
            status: 'ERROR', 
            message: 'Cannot connect to Stirling PDF API',
            error: error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
    });
});

// Start server
app.listen(PORT, () => {
    console.log('\n🚀 PDF Compressor Proxy Server Started!');
    console.log('=====================================');
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`🌐 Web interface: http://localhost:${PORT}`);
    console.log(`🔧 API endpoint: http://localhost:${PORT}/api/compress-pdf`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`🧪 Test Stirling: http://localhost:${PORT}/api/test-stirling`);
    console.log('=====================================\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});