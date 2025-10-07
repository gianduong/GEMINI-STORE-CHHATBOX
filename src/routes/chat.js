import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';
import { getChatModel } from '../gemini.js';
import { buildSystemPrompt, searchSimilarChunks } from '../utils/text.js';
import { promisify } from 'util';

const router = express.Router();

// Promisify database methods
const promisifyDb = (db) => ({
  run: promisify(db.run.bind(db)),
  get: promisify(db.get.bind(db)),
  all: promisify(db.all.bind(db))
});

// Get or create session
function getOrCreateSession(req, res) {
  let sessionId = req.cookies?.sid;
  
  if (!sessionId) {
    sessionId = uuidv4();
    res.cookie('sid', sessionId, { 
      httpOnly: true, 
      sameSite: 'Lax', 
      maxAge: 30 * 24 * 3600 * 1000 // 30 days
    });
    
    const db = getDb();
    const pdb = promisifyDb(db);
    
    pdb.run(`
      INSERT OR IGNORE INTO sessions (id, created_at, last_activity) 
      VALUES (?, ?, ?)
    `, [sessionId, Date.now(), Date.now()]).catch(console.error);
  } else {
    // Update last activity
    const db = getDb();
    const pdb = promisifyDb(db);
    pdb.run('UPDATE sessions SET last_activity = ? WHERE id = ?', [Date.now(), sessionId]).catch(console.error);
  }
  
  return sessionId;
}

// Save message to database
async function saveMessage(sessionId, role, content) {
  const db = getDb();
  const pdb = promisifyDb(db);
  
  try {
    await pdb.run(`
      INSERT INTO messages (id, session_id, role, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [uuidv4(), sessionId, role, content, Date.now()]);
  } catch (error) {
    console.error('Error saving message:', error);
  }
}

// Get chat history
async function getChatHistory(sessionId, limit = 10) {
  const db = getDb();
  const pdb = promisifyDb(db);
  
  try {
    const messages = await pdb.all(`
      SELECT role, content, created_at 
      FROM messages 
      WHERE session_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `, [sessionId, limit]);
    
    return messages.reverse();
  } catch (error) {
    console.error('Error getting chat history:', error);
    return [];
  }
}

// SSE endpoint for streaming chat
router.post('/sse', async (req, res) => {
  try {
    const { message } = req.body || {};
    const sessionId = getOrCreateSession(req, res);

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Save user message
    await saveMessage(sessionId, 'user', message);

    // Get relevant context from documents
    const relevantChunks = await searchSimilarChunks(message, 5);
    const contextText = relevantChunks.length > 0 
      ? relevantChunks.map((chunk, i) => `# Tài liệu ${i + 1}\n${chunk.content}`).join('\n\n')
      : '';

    // Get recent chat history
    const history = await getChatHistory(sessionId, 6);
    const historyText = history.map(msg => 
      `${msg.role === 'user' ? 'Khách hàng' : 'Trợ lý'}: ${msg.content}`
    ).join('\n');

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    const model = getChatModel();
    const systemPrompt = buildSystemPrompt();
    
    const userPrompt = [
      contextText ? `Thông tin từ tài liệu:\n${contextText}\n` : '',
      historyText ? `Lịch sử hội thoại:\n${historyText}\n` : '',
      `Câu hỏi hiện tại: ${message}`,
      'Hãy trả lời một cách chuyên nghiệp, hữu ích và thân thiện. Nếu không chắc chắn về thông tin, hãy đề xuất khách hàng liên hệ trực tiếp với bộ phận hỗ trợ.'
    ].filter(Boolean).join('\n\n');

    const chatHistory = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'user', parts: [{ text: userPrompt }] }
    ];

    const streamResp = await model.generateContentStream(chatHistory);
    let assistantText = '';

    for await (const chunk of streamResp.stream) {
      const text = chunk?.text();
      if (text) {
        assistantText += text;
        res.write(`data: ${JSON.stringify({ token: text })}\n\n`);
      }
    }

    // Save assistant response
    if (assistantText.trim()) {
      await saveMessage(sessionId, 'assistant', assistantText);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Chat SSE error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Chat service temporarily unavailable' })}\n\n`);
    res.end();
  }
});

// Get chat history
router.get('/history', async (req, res) => {
  try {
    const sessionId = getOrCreateSession(req, res);
    const history = await getChatHistory(sessionId, 50);
    
    res.json({ 
      messages: history,
      sessionId 
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

// Clear chat history
router.delete('/history', async (req, res) => {
  try {
    const sessionId = getOrCreateSession(req, res);
    const db = getDb();
    const pdb = promisifyDb(db);
    
    await pdb.run('DELETE FROM messages WHERE session_id = ?', [sessionId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

export default router;