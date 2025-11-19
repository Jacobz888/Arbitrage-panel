#!/bin/bash

# CI Test Script
# Runs all tests in the correct order for CI environments

set -e  # Exit on error

echo "=== Running CI Test Suite ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print step
print_step() {
  echo -e "${BLUE}==>${NC} $1"
}

# Function to print success
print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
print_error() {
  echo -e "${RED}✗${NC} $1"
}

# Check if we're in the project root
if [ ! -f "package.json" ]; then
  print_error "Please run this script from the project root"
  exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  print_step "Installing dependencies..."
  pnpm install
  print_success "Dependencies installed"
fi

# Generate Prisma client
print_step "Generating Prisma client..."
pnpm backend:db:generate
print_success "Prisma client generated"

# Run unit tests
print_step "Running unit tests..."
if pnpm test:unit; then
  print_success "Unit tests passed"
else
  print_error "Unit tests failed"
  exit 1
fi

# Check if Redis is available for integration tests
if command -v redis-cli &> /dev/null; then
  if redis-cli ping &> /dev/null; then
    print_step "Running integration tests..."
    if pnpm test:integration; then
      print_success "Integration tests passed"
    else
      print_error "Integration tests failed"
      exit 1
    fi
  else
    echo "⚠️  Skipping integration tests (Redis not available)"
  fi
else
  echo "⚠️  Skipping integration tests (Redis not available)"
fi

# E2E tests require services to be running
if [ "$RUN_E2E" = "true" ]; then
  print_step "Running E2E tests..."
  
  # Check if services are running
  if curl -s http://localhost:3000 > /dev/null; then
    if pnpm test:e2e; then
      print_success "E2E tests passed"
    else
      print_error "E2E tests failed"
      exit 1
    fi
  else
    echo "⚠️  Skipping E2E tests (services not running)"
    echo "    Set RUN_E2E=true and ensure services are started"
  fi
else
  echo "⚠️  Skipping E2E tests (set RUN_E2E=true to run)"
fi

echo ""
print_success "All tests passed!"
echo ""

# Generate coverage report if requested
if [ "$COVERAGE" = "true" ]; then
  print_step "Generating coverage reports..."
  pnpm test:coverage
  print_success "Coverage reports generated"
fi

exit 0
