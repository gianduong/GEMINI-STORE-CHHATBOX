import express from 'express';

const router = express.Router();

// Admin login endpoint
router.post('/login', (req, res) => {
  try {
    const { token } = req.body || {};
    
    if (!token) {
      return res.status(400).json({ 
        error: 'Token required',
        message: 'Please provide admin token'
      });
    }
    
    if (token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'The provided token is not valid'
      });
    }
    
    res.json({ 
      success: true,
      message: 'Authentication successful'
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      message: 'Internal server error'
    });
  }
});

// Verify admin token
router.get('/verify', (req, res) => {
  try {
    const token = req.headers['x-admin-token'] || req.query.token;
    
    if (!token || token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'The provided token is not valid'
      });
    }
    
    res.json({ 
      success: true,
      message: 'Token is valid'
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ 
      error: 'Verification failed',
      message: 'Internal server error'
    });
  }
});

export default router;