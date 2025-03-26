#!/bin/bash
set -e

# Default values
IMAGE_NAME="gleanwork/mcp-server"
TAG="latest"
PUSH=false
PLATFORMS="linux/amd64,linux/arm64"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --image-name=*)
      IMAGE_NAME="${1#*=}"
      shift
      ;;
    --tag=*)
      TAG="${1#*=}"
      shift
      ;;
    --push)
      PUSH=true
      shift
      ;;
    --platforms=*)
      PLATFORMS="${1#*=}"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--image-name=name] [--tag=tag] [--push] [--platforms=linux/amd64,linux/arm64]"
      exit 1
      ;;
  esac
done

# Set up BuildX builder if it doesn't exist
BUILDER_NAME="multiarch-builder"
if ! docker buildx inspect $BUILDER_NAME > /dev/null 2>&1; then
  echo "Creating BuildX builder: $BUILDER_NAME"
  docker buildx create --name $BUILDER_NAME --driver docker-container --bootstrap
fi

# Use the BuildX builder
docker buildx use $BUILDER_NAME

# Build the image
echo "Building multi-architecture image: $IMAGE_NAME:$TAG for platforms: $PLATFORMS"

# Prepare build command
BUILD_CMD="docker buildx build --platform $PLATFORMS"
BUILD_CMD="$BUILD_CMD -t $IMAGE_NAME:$TAG"

# Add version tag if available from package.json
if [ -f "package.json" ]; then
  VERSION=$(node -p "require('./package.json').version")
  if [ ! -z "$VERSION" ]; then
    BUILD_CMD="$BUILD_CMD -t $IMAGE_NAME:$VERSION"
    echo "Adding version tag: $IMAGE_NAME:$VERSION"
  fi
fi

# Handle push vs local build
if [ "$PUSH" = true ]; then
  # Push to registry (works with multiple platforms)
  BUILD_CMD="$BUILD_CMD --push"
  echo "Image will be pushed to registry"
else
  # For local builds, we need to handle multi-platform differently
  if [[ "$PLATFORMS" == *","* ]]; then
    # Multiple platforms - can't use --load, use --output=type=image
    echo "WARNING: Building for multiple platforms without pushing to registry."
    echo "This will create the image but it won't be loaded into Docker daemon."
    echo "Use --push flag to push to registry or specify a single platform for local use."
    BUILD_CMD="$BUILD_CMD --output=type=image"
  else
    # Single platform - can use --load
    BUILD_CMD="$BUILD_CMD --load"
    echo "Image will be loaded locally"
  fi
fi

# Add Dockerfile path
BUILD_CMD="$BUILD_CMD -f Dockerfile ."

# Execute the build
echo "Executing: $BUILD_CMD"
eval $BUILD_CMD

echo "Build completed successfully!"
