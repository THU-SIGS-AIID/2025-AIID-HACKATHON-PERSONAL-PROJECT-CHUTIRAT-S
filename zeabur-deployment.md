# Zeabur Deployment Configuration

## Environment Variables
Make sure to set these environment variables in your Zeabur project:

1. `NODE_ENV` - Set to `production`
2. `PORT` - Set to `3001` (or leave empty for default)
3. `DEEPSEEK_API_KEY` - Your DeepSeek API key (required for the direct API endpoint)

## Deployment Steps

1. Connect your repository to Zeabur
2. Set the environment variables mentioned above
3. Deploy the application
4. The application will be available at `https://misceltutorai-demo.zeabur.app`

## Notes

- The application is configured to use HTTPS in production
- CORS is properly configured for the Zeabur domain
- The server will automatically detect the production environment
- Both proxy and direct API endpoints are available

## API Endpoints

- Direct API: `https://misceltutorai-demo.zeabur.app/api/chat-direct`
- Proxy API: `https://misceltutorai-demo.zeabur.app/api/chat`
- Health Check: `https://misceltutorai-demo.zeabur.app/api/health`