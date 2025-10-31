#!/bin/bash
# This script creates placeholder icons
# Replace these with your real icons using https://realfavicongenerator.net

# Create a simple SVG icon (you can replace this with your logo)
cat > icon.svg << 'SVGEOF'
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#000"/>
  <circle cx="256" cy="256" r="180" fill="#fff"/>
  <text x="256" y="320" font-size="200" font-family="Arial" font-weight="bold" fill="#000" text-anchor="middle">AI</text>
</svg>
SVGEOF

echo "Placeholder icons created!"
echo "To create real icons:"
echo "1. Design your logo (512x512px)"
echo "2. Go to https://realfavicongenerator.net"
echo "3. Upload your logo"
echo "4. Download all sizes"
echo "5. Replace the files in public/ folder"
