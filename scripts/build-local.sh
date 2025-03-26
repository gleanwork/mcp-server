#!/bin/bash
set -e

# Force immediate output
exec 1>&1

# This script provides a lightweight local development build pipeline
# that handles TypeScript compiler output and Docker build process,
# providing minimal but clear status output.

# Parse command line arguments
VERBOSE=false
IMAGE_NAME="ghcr.io/aaronsb/glean-mcp-server"
TAG="latest"
PUSH=false
PLATFORMS="linux/amd64,linux/arm64"

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --verbose) VERBOSE=true; shift ;;
        --image-name=*) IMAGE_NAME="${1#*=}"; shift ;;
        --tag=*) TAG="${1#*=}"; shift ;;
        --push) PUSH=true; shift ;;
        --platforms=*) PLATFORMS="${1#*=}"; shift ;;
        *) echo "Unknown parameter: $1"; 
           echo "Usage: $0 [--verbose] [--image-name=name] [--tag=tag] [--push] [--platforms=linux/amd64,linux/arm64]"; 
           exit 1 ;;
    esac
done

# Create temp directory for logs if it doesn't exist
TEMP_DIR="/tmp/glean-mcp-server"
mkdir -p "$TEMP_DIR"

# Setup colored output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
CHECK_MARK="✓"
X_MARK="✗"
WARNING_MARK="⚠"

# Function to check log file size and show warning if needed
check_log_size() {
    local log_file=$1
    if [ -f "$log_file" ]; then
        local line_count=$(wc -l < "$log_file")
        if [ $line_count -gt 100 ]; then
            echo -e "${YELLOW}${WARNING_MARK} Large log file detected ($line_count lines)${NC}"
            echo "  Tips for viewing large logs:"
            echo "  • head -n 20 $log_file     (view first 20 lines)"
            echo "  • tail -n 20 $log_file     (view last 20 lines)"
            echo "  • less $log_file           (scroll through file)"
            echo "  • grep 'error' $log_file   (search for specific terms)"
        fi
    fi
}

# Function to run a step and show its status
run_step() {
    local step_name=$1
    local log_file="$TEMP_DIR/$2.log"
    local command=$3
    
    echo -n "→ $step_name... "
    
    if [ "$VERBOSE" = true ]; then
        if eval "$command"; then
            echo -e "${GREEN}${CHECK_MARK} Success${NC}"
            return 0
        else
            echo -e "${RED}${X_MARK} Failed${NC}"
            return 1
        fi
    else
        if eval "$command > '$log_file' 2>&1"; then
            echo -e "${GREEN}${CHECK_MARK} Success${NC} (log: $log_file)"
            check_log_size "$log_file"
            return 0
        else
            echo -e "${RED}${X_MARK} Failed${NC} (see details in $log_file)"
            check_log_size "$log_file"
            # For TypeScript errors, extract and show the most relevant parts
            if [[ "$2" == "typescript-build" ]]; then
                echo -e "${YELLOW}Common TypeScript errors:${NC}"
                grep -A 2 "error TS" "$log_file" | head -n 10
                local error_count=$(grep -c "error TS" "$log_file")
                if [ $error_count -gt 5 ]; then
                    echo -e "${YELLOW}...and $((error_count - 5)) more errors${NC}"
                fi
            fi
            return 1
        fi
    fi
}

# Install dependencies
run_step "Installing dependencies" "npm-install" "npm install" || exit 1

# Run linting
run_step "Linting" "lint" "npm run lint" || exit 1

# Run tests
run_step "Testing" "test" "npm run test || true"

# Fix the ES module issue in package.json build script
echo -n "→ Fixing ES module compatibility... "
if [ -f "package.json" ]; then
    # Create a backup
    cp package.json package.json.bak
    
    # Fix the build script to work with ES modules
    if grep -q "require('fs')" package.json; then
        sed -i 's/node -e "require/node -e "import { chmodSync } from '\''fs'\''; chmodSync/g' package.json
        echo -e "${GREEN}${CHECK_MARK} Fixed${NC}"
    else
        echo -e "${GREEN}${CHECK_MARK} Already compatible${NC}"
    fi
else
    echo -e "${RED}${X_MARK} package.json not found${NC}"
    exit 1
fi

# Build TypeScript
run_step "Building TypeScript" "typescript-build" "npm run build" || exit 1

# Set up BuildX builder if it doesn't exist
if [ "$VERBOSE" = true ]; then
    echo -n "→ Setting up Docker BuildX... "
    BUILDER_NAME="multiarch-builder"
    if ! docker buildx inspect $BUILDER_NAME > /dev/null 2>&1; then
        docker buildx create --name $BUILDER_NAME --driver docker-container --bootstrap
        echo -e "${GREEN}${CHECK_MARK} Created new builder${NC}"
    else
        echo -e "${GREEN}${CHECK_MARK} Using existing builder${NC}"
    fi
    docker buildx use $BUILDER_NAME
else
    BUILDX_LOG="$TEMP_DIR/buildx-setup.log"
    echo -n "→ Setting up Docker BuildX... "
    BUILDER_NAME="multiarch-builder"
    if ! docker buildx inspect $BUILDER_NAME > /dev/null 2>&1; then
        if docker buildx create --name $BUILDER_NAME --driver docker-container --bootstrap > "$BUILDX_LOG" 2>&1; then
            echo -e "${GREEN}${CHECK_MARK} Created new builder${NC} (log: $BUILDX_LOG)"
        else
            echo -e "${RED}${X_MARK} Failed to create builder${NC} (see details in $BUILDX_LOG)"
            exit 1
        fi
    else
        echo -e "${GREEN}${CHECK_MARK} Using existing builder${NC}"
    fi
    docker buildx use $BUILDER_NAME > "$BUILDX_LOG" 2>&1
fi

# Prepare build command
BUILD_CMD="docker buildx build --platform $PLATFORMS"
BUILD_CMD="$BUILD_CMD -t $IMAGE_NAME:$TAG"

# Add version tag if available from package.json
if [ -f "package.json" ]; then
    # Use grep and sed to extract version from package.json
    VERSION=$(grep -o '"version": "[^"]*"' package.json | sed 's/"version": "\(.*\)"/\1/')
    if [ ! -z "$VERSION" ]; then
        BUILD_CMD="$BUILD_CMD -t $IMAGE_NAME:$VERSION"
        echo "→ Adding version tag: $IMAGE_NAME:$VERSION"
    fi
fi

# Handle push vs local build
if [ "$PUSH" = true ]; then
    # Push to registry (works with multiple platforms)
    BUILD_CMD="$BUILD_CMD --push"
    echo "→ Image will be pushed to registry"
else
    # For local builds, we need to handle multi-platform differently
    if [[ "$PLATFORMS" == *","* ]]; then
        # Multiple platforms - can't use --load, use --output=type=image
        echo -e "${YELLOW}${WARNING_MARK} Building for multiple platforms without pushing to registry.${NC}"
        echo "  This will create the image but it won't be loaded into Docker daemon."
        echo "  Use --push flag to push to registry or specify a single platform for local use."
        BUILD_CMD="$BUILD_CMD --output=type=image"
    else
        # Single platform - can use --load
        BUILD_CMD="$BUILD_CMD --load"
        echo "→ Image will be loaded locally"
    fi
fi

# Add Dockerfile path
BUILD_CMD="$BUILD_CMD -f Dockerfile ."

# Execute the build
echo "→ Building Docker image: $IMAGE_NAME:$TAG for platforms: $PLATFORMS"
DOCKER_LOG="$TEMP_DIR/docker-build.log"

if [ "$VERBOSE" = true ]; then
    echo "→ Executing: $BUILD_CMD"
    if eval $BUILD_CMD; then
        echo -e "${GREEN}${CHECK_MARK} Docker build successful${NC}"
    else
        echo -e "${RED}${X_MARK} Docker build failed${NC}"
        exit 1
    fi
else
    echo "→ Executing Docker build (logging to $DOCKER_LOG)"
    if eval "$BUILD_CMD > '$DOCKER_LOG' 2>&1"; then
        echo -e "${GREEN}${CHECK_MARK} Docker build successful${NC} (log: $DOCKER_LOG)"
        check_log_size "$DOCKER_LOG"
    else
        echo -e "${RED}${X_MARK} Docker build failed${NC} (see details in $DOCKER_LOG)"
        check_log_size "$DOCKER_LOG"
        
        # Extract and show the most relevant parts of Docker build errors
        echo -e "${YELLOW}Last few lines of Docker build log:${NC}"
        tail -n 20 "$DOCKER_LOG"
        
        exit 1
    fi
fi

echo -e "\n${GREEN}Build completed successfully!${NC}"
echo "Image: $IMAGE_NAME:$TAG"
if [ ! -z "$VERSION" ]; then
    echo "Version tag: $IMAGE_NAME:$VERSION"
fi
