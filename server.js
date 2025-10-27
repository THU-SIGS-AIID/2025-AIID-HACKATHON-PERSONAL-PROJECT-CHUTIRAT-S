const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all origins (you can restrict this in production)
// In production, we'll allow the specific Zeabur domain
const isProduction = process.env.NODE_ENV === 'production';
const corsOptions = {
  origin: isProduction ? ['https://misceltutorai-demo.zeabur.app'] : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
  credentials: true
};

app.use(cors(corsOptions));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the current directory
app.use(express.static(__dirname));

// Proxy middleware for DeepSeek API
const deepseekProxy = createProxyMiddleware({
  target: 'https://api.deepseek.com',
  changeOrigin: true,
  secure: false,
  timeout: 30000, // 30 seconds timeout
  proxyTimeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive'
  },
  onError: (err, req, res) => {
    console.error('Proxy Error:', err);
    res.status(500).json({ 
      error: 'Proxy error',
      message: err.message,
      code: err.code 
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('Proxying request to:', req.method, req.url);
    // Remove any existing origin headers that might cause issues
    proxyReq.removeHeader('origin');
    proxyReq.removeHeader('referer');
    proxyReq.removeHeader('host');
    
    // Add proper headers for DeepSeek API
    proxyReq.setHeader('Host', 'api.deepseek.com');
    proxyReq.setHeader('Origin', 'https://api.deepseek.com');
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('Received response from DeepSeek:', proxyRes.statusCode);
    // Add CORS headers to the response
    proxyRes.headers['access-control-allow-origin'] = '*';
    proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization, X-Requested-With';
  }
});

// Apply proxy to /api/chat path
app.use('/api/chat', deepseekProxy);

// Alternative direct API endpoint that handles the request server-side
app.post('/api/chat-direct', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Get API key from environment variable or request header
    const apiKey = req.headers['x-api-key'] || process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    console.log('Making direct API call to DeepSeek...');
    
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        stream: false,
        temperature: 0.7
      }),
      timeout: 30000
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'DeepSeek API error',
        status: response.status,
        message: errorText 
      });
    }

    const data = await response.json();
    console.log('Successfully received response from DeepSeek');
    res.json(data);
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

app.listen(PORT, () => {
  const baseUrl = isProduction ? 'https://misceltutorai-demo.zeabur.app' : `http://localhost:${PORT}`;
  console.log(`Server running on ${baseUrl}`);
  console.log(`Proxy endpoint: ${baseUrl}/api/chat`);
  console.log(`Direct API endpoint: ${baseUrl}/api/chat-direct`);
});

module.exports = app;