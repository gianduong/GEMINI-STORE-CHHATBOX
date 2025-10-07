import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getDb } from '../db.js';
import { chunkText } from '../utils/text.js';
import { promisify } from 'util';

const router = express.Router();

// Create upload directory
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(file.originalname);
    cb(null, `${timestamp}-${randomString}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/msword'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported. Only PDF, DOCX, and TXT files are allowed.'));
    }
  }
});

// Promisify database methods
const promisifyDb = (db) => ({
  run: promisify(db.run.bind(db)),
  get: promisify(db.get.bind(db)),
  all: promisify(db.all.bind(db))
});

// Admin authentication middleware
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid or missing admin token'
    });
  }
  next();
}

// Extract text from different file types
async function extractText(filePath, mimeType) {
  try {
    if (mimeType.includes('pdf')) {
      const data = await pdfParse(fs.readFileSync(filePath));
      return data.text || '';
    }
    
    if (mimeType.includes('word') || mimeType.includes('document') || filePath.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value || '';
    }
    
    // Plain text files
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error('Text extraction error:', error);
    throw new Error('Failed to extract text from file');
  }
}

// Generate content hash
function generateContentHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Upload document endpoint
router.post('/', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ 
        error: 'No file uploaded',
        message: 'Please select a file to upload'
      });
    }

    // Extract text content
    const textContent = await extractText(file.path, file.mimetype);
    
    if (!textContent.trim()) {
      // Clean up uploaded file
      fs.unlinkSync(file.path);
      return res.status(400).json({ 
        error: 'Empty content',
        message: 'The uploaded file contains no readable text'
      });
    }

    // Generate content hash
    const contentHash = generateContentHash(textContent);
    
    // Check if document with same content already exists
    const db = getDb();
    const pdb = promisifyDb(db);
    
    const existingDoc = await pdb.get(`
      SELECT id FROM documents WHERE content_hash = ?
    `, [contentHash]);
    
    if (existingDoc) {
      // Clean up uploaded file
      fs.unlinkSync(file.path);
      return res.status(409).json({ 
        error: 'Duplicate content',
        message: 'A document with the same content already exists'
      });
    }

    // Create document record
    const docId = uuidv4();
    await pdb.run(`
      INSERT INTO documents (id, filename, original_filename, mime_type, file_path, file_size, content_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      docId,
      file.filename,
      file.originalname,
      file.mimetype,
      file.path,
      file.size,
      contentHash,
      Date.now(),
      Date.now()
    ]);

    // Chunk the text content
    const chunks = chunkText(textContent, { maxTokens: 500, overlap: 50 });
    
    // Insert chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunkId = uuidv4();
      const chunkHash = generateContentHash(chunks[i]);
      
      await pdb.run(`
        INSERT INTO document_chunks (id, document_id, chunk_index, content, content_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [chunkId, docId, i, chunks[i], chunkHash, Date.now()]);
    }

    res.json({ 
      success: true,
      documentId: docId,
      filename: file.originalname,
      chunks: chunks.length,
      message: 'Document uploaded and processed successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      error: 'Upload failed',
      message: error.message || 'Failed to process uploaded file'
    });
  }
});

// Get documents list
router.get('/list', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const pdb = promisifyDb(db);
    
    const documents = await pdb.all(`
      SELECT 
        d.id,
        d.original_filename,
        d.mime_type,
        d.file_size,
        d.created_at,
        COUNT(dc.id) as chunk_count
      FROM documents d
      LEFT JOIN document_chunks dc ON d.id = dc.document_id
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `);
    
    res.json({ 
      documents: documents.map(doc => ({
        id: doc.id,
        filename: doc.original_filename,
        mimeType: doc.mime_type,
        size: doc.file_size,
        chunkCount: doc.chunk_count,
        createdAt: doc.created_at
      }))
    });
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({ 
      error: 'Failed to get documents list',
      message: error.message
    });
  }
});

// Delete document
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const docId = req.params.id;
    const db = getDb();
    const pdb = promisifyDb(db);
    
    // Get document info
    const doc = await pdb.get('SELECT file_path FROM documents WHERE id = ?', [docId]);
    
    if (!doc) {
      return res.status(404).json({ 
        error: 'Document not found',
        message: 'The specified document does not exist'
      });
    }
    
    // Delete from database (chunks will be deleted by foreign key constraint)
    await pdb.run('DELETE FROM documents WHERE id = ?', [docId]);
    
    // Delete physical file
    try {
      if (fs.existsSync(doc.file_path)) {
        fs.unlinkSync(doc.file_path);
      }
    } catch (fileError) {
      console.error('File deletion error:', fileError);
      // Continue even if file deletion fails
    }
    
    res.json({ 
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ 
      error: 'Failed to delete document',
      message: error.message
    });
  }
});

// Get document details
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const docId = req.params.id;
    const db = getDb();
    const pdb = promisifyDb(db);
    
    const doc = await pdb.get(`
      SELECT 
        d.*,
        COUNT(dc.id) as chunk_count
      FROM documents d
      LEFT JOIN document_chunks dc ON d.id = dc.document_id
      WHERE d.id = ?
      GROUP BY d.id
    `, [docId]);
    
    if (!doc) {
      return res.status(404).json({ 
        error: 'Document not found',
        message: 'The specified document does not exist'
      });
    }
    
    res.json({
      id: doc.id,
      filename: doc.original_filename,
      mimeType: doc.mime_type,
      size: doc.file_size,
      chunkCount: doc.chunk_count,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ 
      error: 'Failed to get document details',
      message: error.message
    });
  }
});

export default router;