#!/bin/bash

# Function to find and kill Next.js development server processes
kill_next_servers() {
  echo "Looking for existing Next.js development servers..."
  
  # Find processes running on the default Next.js port 3000 and common alternatives
  for port in $(seq 3000 3010); do
    pid=$(lsof -i :$port -t 2>/dev/null)
    if [ ! -z "$pid" ]; then
      echo "Found Next.js server running on port $port (PID: $pid). Stopping it..."
      kill -9 $pid 2>/dev/null
    fi
  done
  
  # Also look for Node processes that might be running Next.js
  node_pids=$(ps aux | grep 'node' | grep 'next' | grep -v grep | awk '{print $2}')
  if [ ! -z "$node_pids" ]; then
    echo "Found additional Next.js processes. Stopping them..."
    for pid in $node_pids; do
      echo "Stopping Next.js process (PID: $pid)..."
      kill -9 $pid 2>/dev/null
    done
  fi
  
  echo "All existing Next.js servers stopped."
}

# Kill any existing Next.js servers
kill_next_servers

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the development server
echo "Starting development server..."
npm run dev