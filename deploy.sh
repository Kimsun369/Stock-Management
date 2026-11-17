#!/usr/bin/env bash
set -e

echo "🚀 [1/3] Staging and committing changes..."
git add -A
if ! git diff --cached --quiet; then
  COMMIT_MSG="${1:-Update and deploy to production}"
  git commit -m "$COMMIT_MSG"
  echo "✅ Committed with message: '$COMMIT_MSG'"
else
  echo "ℹ️  No new changes to commit."
fi

echo "📤 [2/3] Pushing to GitHub (Kimsun369/Stock-Management)..."
git push origin main || echo "⚠️  Git push skipped or failed (check internet connection), continuing with Vercel deploy..."

echo "⚡ [3/3] Deploying to Vercel Production..."
npx vercel --prod

echo ""
echo "🎉 SUCCESS! Your application is live at:"
echo "👉 https://neakmeassantepheap2.vercel.app"
