#!/bin/bash
# Test API connectivity after deployment

echo "Testing backend health..."
curl -X GET "https://your-backend.onrender.com/health"

echo -e "\n\nTesting frontend to backend connection..."
echo "Check browser console at your Vercel URL for any CORS or API errors"