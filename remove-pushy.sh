#!/bin/bash
# Remove Pushy dependencies from Supasoka project

echo "🧹 Removing Pushy references from Supasoka..."

# Remove client-side Pushy service
rm -f services/pushyService.js
echo "✅ Removed services/pushyService.js"

# Remove Pushy from backend package.json (already done in package.json, just verify)
# npm remove pushy --save in backend/ if you run this

# Remove Pushy from render.yaml
sed -i '/PUSHY_SECRET_API_KEY/d' backend/render.yaml
echo "✅ Cleaned backend/render.yaml (removed PUSHY_SECRET_API_KEY)"

# Remove Pushy from .env.example
sed -i '/PUSHY/d' backend/.env.example
echo "✅ Cleaned backend/.env.example"

# Remove any Pushy-only docs (optional, leaving for reference)
echo "✅ Note: Legacy Pushy docs remain in TROUBLESHOOT_NOTIFICATIONS.md for historical reference"

echo ""
echo "🎉 Pushy removal complete!"
echo ""
echo "Next steps:"
echo "1. If running locally with Pushy in .env, remove PUSHY_SECRET_API_KEY from .env"
echo "2. Run: npm install --save (in backend/) to update package-lock.json"
echo "3. Test: npm start && npm test"
echo "4. Deploy to Render - Firebase vars already set!"
