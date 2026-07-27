#!/bin/bash
echo "🚀 SmartTable Deploy Script"
echo "==========================="

# Check if .env.local has been configured
if grep -q "YOUR_ANON_KEY_HERE" .env.local; then
  echo "⚠️  פתח את .env.local ומלא את הפרטים האמיתיים לפני deploy"
  exit 1
fi

echo "📦 מתקין חבילות..."
npm install

echo "🏗️  בונה את הפרויקט..."
npm run build

echo "✅ גמור! הרץ: npm start"
