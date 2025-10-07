import { generateEmbedding } from '../gemini.js';

// Text chunking utility
export function chunkText(input, options = {}) {
  const maxTokens = options.maxTokens || 500;
  const overlap = options.overlap || 50;
  
  // Simple word-based chunking
  const words = input.split(/\s+/).filter(word => word.length > 0);
  const chunks = [];
  
  for (let i = 0; i < words.length; i += (maxTokens - overlap)) {
    const chunk = words.slice(i, i + maxTokens).join(' ');
    if (chunk.trim()) {
      chunks.push(chunk.trim());
    }
  }
  
  return chunks;
}

// Build system prompt for the AI
export function buildSystemPrompt() {
  return `Bạn là một trợ lý AI chuyên nghiệp cho cửa hàng trực tuyến. Nhiệm vụ của bạn là:

🎯 MỤC TIÊU:
- Trả lời các câu hỏi về sản phẩm, dịch vụ, chính sách của cửa hàng
- Hỗ trợ khách hàng với thông tin chính xác và hữu ích
- Cung cấp thông tin pháp lý ở mức độ tham khảo (không phải tư vấn pháp lý chuyên nghiệp)

📋 NGUYÊN TẮC:
- Luôn lịch sự, thân thiện và chuyên nghiệp
- Trả lời ngắn gọn, súc tích và dễ hiểu
- Nếu không chắc chắn về thông tin, hãy thành thật và đề xuất liên hệ trực tiếp
- Ưu tiên sử dụng thông tin từ tài liệu nội bộ khi có
- Sử dụng bullet points khi cần thiết để dễ đọc
- Đối với thông tin pháp lý, chỉ cung cấp thông tin tham khảo và khuyến khích khách hàng tìm hiểu thêm

💬 PHONG CÁCH:
- Sử dụng ngôn ngữ thân thiện, gần gũi
- Tránh thuật ngữ kỹ thuật phức tạp
- Luôn kết thúc bằng lời đề nghị hỗ trợ thêm nếu cần`;
}

// Search for similar chunks using simple text matching
export async function searchSimilarChunks(query, limit = 5) {
  try {
    const { getDb } = await import('../db.js');
    const db = getDb();
    
    // Simple text search using LIKE
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    
    if (searchTerms.length === 0) {
      return [];
    }
    
    // Build search pattern for multiple terms
    const searchPattern = searchTerms.map(term => `%${term}%`).join(' ');
    
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          dc.content,
          dc.chunk_index,
          d.original_filename,
          (
            SELECT COUNT(*) 
            FROM document_chunks dc2 
            WHERE dc2.document_id = dc.document_id
          ) as total_chunks
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE LOWER(dc.content) LIKE ?
        ORDER BY dc.chunk_index ASC
        LIMIT ?
      `, [`%${query.toLowerCase()}%`, limit], (err, rows) => {
        if (err) {
          console.error('Search chunks error:', err);
          resolve([]);
        } else {
          resolve(rows.map(chunk => ({
            content: chunk.content,
            chunkIndex: chunk.chunk_index,
            filename: chunk.original_filename,
            totalChunks: chunk.total_chunks
          })));
        }
      });
    });
    
  } catch (error) {
    console.error('Search chunks error:', error);
    return [];
  }
}

// Format file size
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format date
export function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Validate file type
export function isValidFileType(mimeType) {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/msword'
  ];
  
  return allowedTypes.includes(mimeType);
}

// Get file extension from mime type
export function getFileExtension(mimeType) {
  const extensions = {
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/msword': '.doc',
    'text/plain': '.txt'
  };
  
  return extensions[mimeType] || '';
}