#!/bin/bash
# Tiktoken Visualizer Startup Script - Virtual Environment Version
# This script creates a virtual environment, installs dependencies, and launches the application

set -e  # Exit immediately on error

# Color settings
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No color

# Virtual environment directory
VENV_DIR="tiktoken_env"

# Required Python dependencies
DEPENDENCIES=("tiktoken" "flask" "flask-cors" "regex" "numpy" "scikit-learn")

echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}  Tiktoken Visualizer Setup Tool  ${NC}"
echo -e "${BLUE}==================================${NC}"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python3 not found. Please install Python 3.x${NC}"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}Virtual environment not found, creating...${NC}"
    python3 -m venv "$VENV_DIR"
    
    if [ ! -d "$VENV_DIR" ]; then
        echo -e "${RED}Unable to create virtual environment, please check your Python installation${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Virtual environment created successfully!${NC}"
else
    echo -e "${GREEN}Virtual environment found${NC}"
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source "$VENV_DIR/bin/activate"

# Check if successfully activated
if [[ "$VIRTUAL_ENV" != *"$VENV_DIR"* ]]; then
    echo -e "${RED}Unable to activate virtual environment, please check permissions${NC}"
    exit 1
fi

# Install dependencies
echo -e "${YELLOW}Installing required Python dependencies...${NC}"
pip install --upgrade pip
for dep in "${DEPENDENCIES[@]}"; do
    echo -e "Installing $dep..."
    pip install "$dep"
done

echo -e "${GREEN}All dependencies installed!${NC}"

# Handle import conflicts
if [ -d "tiktoken" ]; then
    echo -e "${YELLOW}Local tiktoken directory detected, may cause import conflicts${NC}"
    read -p "Temporarily rename to avoid conflicts? (y/n): " rename_choice
    
    if [[ $rename_choice == "y" || $rename_choice == "Y" ]]; then
        temp_name="tiktoken_temp_$(date +%s)"
        mv tiktoken "$temp_name"
        echo -e "${GREEN}Renamed tiktoken directory to $temp_name${NC}"
        
        # Setup to restore original name on exit
        function cleanup {
            if [ -d "$temp_name" ]; then
                if [ -d "tiktoken" ]; then
                    backup_name="tiktoken_backup_$(date +%s)"
                    echo -e "${YELLOW}tiktoken directory already exists, renaming it to $backup_name${NC}"
                    mv tiktoken "$backup_name"
                fi
                
                mv "$temp_name" tiktoken
                echo -e "${GREEN}Restored $temp_name to tiktoken${NC}"
            fi
        }
        
        trap cleanup EXIT
    else
        echo -e "${YELLOW}Warning: Import conflict not resolved, application may not start properly${NC}"
    fi
fi

# Check browser open tool
if command -v open &> /dev/null; then
    # macOS
    OPEN_CMD="open"
elif command -v xdg-open &> /dev/null; then
    # Linux
    OPEN_CMD="xdg-open"
else
    echo -e "${YELLOW}Warning: Cannot find command to open browser automatically, please visit http://localhost:8080 manually${NC}"
    OPEN_CMD=""
fi

# Start application
echo -e "${BLUE}Starting Tiktoken Visualizer...${NC}"
python app.py > app_output.log 2>&1 &
APP_PID=$!

# Wait for startup
echo -e "${YELLOW}Waiting for server to start...${NC}"
sleep 3

# Get server port
PORT=$(grep -o "Server started on port [0-9]*" app_output.log | awk '{print $5}')
if [ -z "$PORT" ]; then
    PORT=8080 # Default port
fi

# Open browser
if [ -n "$OPEN_CMD" ]; then
    echo -e "${GREEN}Opening application in browser...${NC}"
    $OPEN_CMD "http://localhost:$PORT"
fi

echo -e "${BLUE}--------------------------------------------------${NC}"
echo -e "${GREEN}Tiktoken Visualizer launched in virtual environment!${NC}"
echo -e "${YELLOW}Backend server address: http://localhost:$PORT${NC}"
echo -e "${YELLOW}Virtual environment: $VENV_DIR${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo -e "${BLUE}--------------------------------------------------${NC}"

# Wait for user interrupt
wait $APP_PID 