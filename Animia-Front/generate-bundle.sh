#!/bin/bash
# Script to generate Android App Bundle (AAB) for Google Play Store
# This creates a production release bundle signed with your release keystore

echo "Building Android App Bundle (AAB) for Anaemia Shield..."

# Navigate to android directory
cd android

# Clean previous builds
echo "Cleaning previous builds..."
./gradlew clean

# Generate the release bundle
echo "Generating release bundle..."
./gradlew bundleRelease

# Check if bundle was created successfully
BUNDLE_PATH="app/build/outputs/bundle/release/app-release.aab"
if [ -f "$BUNDLE_PATH" ]; then
    echo ""
    echo "✅ Bundle created successfully!"
    echo "Location: $(pwd)/$BUNDLE_PATH"
    echo ""
    echo "You can now upload this AAB file to Google Play Console"
else
    echo ""
    echo "❌ Bundle generation failed. Please check the error messages above."
    exit 1
fi

# Return to project root
cd ..

