#!/bin/bash
# Build script for Portal TOIT Backend

set -e

echo "🏗️  Building Portal TOIT Backend..."

# Install dependencies
npm ci

# Build TypeScript
npm run build

echo "✅ Build completed successfully!"