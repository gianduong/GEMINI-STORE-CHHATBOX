import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.warn('⚠️  GOOGLE_API_KEY is not set. Please configure your .env file');
}

const genAI = new GoogleGenerativeAI(apiKey);

export function getChatModel() {
  if (!apiKey) {
    throw new Error('Google API key is not configured');
  }
  
  // Using Gemini 1.5 Flash for better performance and cost efficiency
  return genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    }
  });
}

export function getEmbeddingModel() {
  if (!apiKey) {
    throw new Error('Google API key is not configured');
  }
  
  return genAI.getGenerativeModel({ model: 'embedding-001' });
}

export async function generateEmbedding(text) {
  try {
    const model = getEmbeddingModel();
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}