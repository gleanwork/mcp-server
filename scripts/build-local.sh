#!/bin/bash
set -e

# Force immediate output
exec 1>&1

# This script provides a lightweight local development build pipeline
# for the Glean MCP Server monorepo. It performs all build steps from
# dependency installation through Docker image creation with minimal
# but clear status output.

# Parse command line arguments
VERBOSE=false
IMAGE_TAG="glean-mcp-server:local"
CLEAN=false
MULTI=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --verbose) VERBOSE=true ;;
        --tag) IMAGE_TAG="$2"; shift ;;
        --clean) CLEAN=true ;;
        --multi) MULTI=true ;;
        --help) 
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --verbose     Show all build output"
            echo "  --tag <tag>   Set Docker image tag (default: glean-mcp-server:local)"
            echo "  --clean       Clean existing images first"
            echo "  --multi       Build for multiple architectures (requires buildx)"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Create temp directory for logs
TEMP_DIR="/tmp/glean-mcp-build"
mkdir -p "$TEMP_DIR"

# Setup colored output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
            return 1
        fi
    fi
}

echo -e "${BLUE}Building Glean MCP Server${NC}"
echo "Target: $IMAGE_TAG"
echo ""

# Clean existing images if requested
if [ "$CLEAN" = true ]; then
    echo "→ Cleaning existing Docker images..."
    
    # Remove existing image if it exists
    if docker image inspect "$IMAGE_TAG" >/dev/null 2>&1; then
        if docker rmi "$IMAGE_TAG" >/dev/null 2>&1; then
            echo -e "${GREEN}${CHECK_MARK} Removed existing image${NC}"
        else
            echo -e "${YELLOW}${WARNING_MARK} Could not remove existing image${NC}"
        fi
    fi
    
    # Clean up dangling images
    if [ "$(docker images -f 'dangling=true' -q | wc -l)" -gt 0 ]; then
        if docker image prune -f >/dev/null 2>&1; then
            echo -e "${GREEN}${CHECK_MARK} Cleaned dangling images${NC}"
        else
            echo -e "${YELLOW}${WARNING_MARK} Could not clean dangling images${NC}"
        fi
    fi
fi

# Install dependencies using pnpm
run_step "Installing dependencies" "pnpm-install" "pnpm install --frozen-lockfile" || exit 1

# Run linting
run_step "Linting" "lint" "pnpm lint" || exit 1

# Build TypeScript for all packages
run_step "Building TypeScript packages" "build" "pnpm run build" || exit 1

# Run tests
run_step "Running tests" "test" "pnpm test" || exit 1

# Build Docker image
echo "→ Building Docker image..."

# Determine build approach
BUILD_ARGS=""
if [ ! -z "$DOCKER_HASH" ]; then
    BUILD_ARGS="--build-arg DOCKER_HASH=$DOCKER_HASH"
fi

if docker buildx version >/dev/null 2>&1 && [ "$MULTI" = true ]; then
    echo -e "${BLUE}  Using buildx for multi-architecture build${NC}"
    
    # Create builder if needed
    if ! docker buildx inspect multiarch-builder >/dev/null 2>&1; then
        docker buildx create --name multiarch-builder --use >/dev/null 2>&1
    else
        docker buildx use multiarch-builder >/dev/null 2>&1
    fi
    
    BUILD_CMD="docker buildx build --platform linux/amd64,linux/arm64 --tag '$IMAGE_TAG' $BUILD_ARGS --load ."
else
    if [ "$MULTI" = true ]; then
        echo -e "${YELLOW}${WARNING_MARK} Buildx not available, falling back to single architecture${NC}"
    fi
    BUILD_CMD="docker build --tag '$IMAGE_TAG' $BUILD_ARGS ."
fi

if [ "$VERBOSE" = true ]; then
    if eval "$BUILD_CMD"; then
        echo -e "${GREEN}${CHECK_MARK} Docker build successful${NC}"
    else
        echo -e "${RED}${X_MARK} Docker build failed${NC}"
        exit 1
    fi
else
    DOCKER_LOG="$TEMP_DIR/docker-build.log"
    if eval "$BUILD_CMD > '$DOCKER_LOG' 2>&1"; then
        echo -e "${GREEN}${CHECK_MARK} Docker build successful${NC} (log: $DOCKER_LOG)"
        check_log_size "$DOCKER_LOG"
    else
        echo -e "${RED}${X_MARK} Docker build failed${NC} (see details in $DOCKER_LOG)"
        check_log_size "$DOCKER_LOG"
        
        # Show last few lines of error for quick debugging
        if [ -f "$DOCKER_LOG" ]; then
            echo ""
            echo -e "${RED}Last 10 lines from build log:${NC}"
            tail -n 10 "$DOCKER_LOG" | sed 's/^/  /'
        fi
        exit 1
    fi
fi

# Show final status
echo ""
echo -e "${GREEN}Build complete!${NC} Image tagged as $IMAGE_TAG"

# Show image info
if docker image inspect "$IMAGE_TAG" >/dev/null 2>&1; then
    IMAGE_SIZE=$(docker image inspect "$IMAGE_TAG" --format='{{.Size}}' | awk '{printf "%.1f MB", $1/1024/1024}')
    echo "Image size: $IMAGE_SIZE"
fi

echo ""
echo "To run the MCP server:"
echo "  docker run -it $IMAGE_TAG"
echo ""
echo "To run with configuration tool:"
echo "  docker run -it $IMAGE_TAG configure-mcp-server"
echo ""
echo "For more options: $0 --help"