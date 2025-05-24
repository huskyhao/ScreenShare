#!/bin/bash

# ScreenShare Release Push Script
# This script pushes the current release to GitHub

set -e

echo "🚀 Pushing ScreenShare v0.8.0 to GitHub..."

# Push commits
echo "📤 Pushing commits to origin/master..."
git push origin master

# Push tags
echo "🏷️  Pushing tags..."
git push origin --tags

echo "✅ Successfully pushed release v0.8.0!"
echo ""
echo "🎉 Release Summary:"
echo "   - Version: v0.8.0"
echo "   - Commits: 4 new commits ahead of origin"
echo "   - Tag: v0.8.0 created"
echo "   - Features: CI/CD Pipeline, Docker Support, Automated Deployment"
echo ""
echo "📋 Next Steps:"
echo "   1. Check GitHub Actions workflows are running"
echo "   2. Verify Docker images are building"
echo "   3. Test automated deployment (if configured)"
echo "   4. Update GitHub release notes"
echo ""
echo "🔗 GitHub Repository: https://github.com/huskyhao/ScreenShare"
