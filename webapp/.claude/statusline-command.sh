#!/bin/bash

# Read JSON input from stdin
input=$(cat)

# Extract values from JSON
current_dir=$(echo "$input" | jq -r '.workspace.current_dir // .cwd')
model_name=$(echo "$input" | jq -r '.model.display_name')

# Get just the directory name (not full path)
dir_name=$(basename "$current_dir")

# Get git branch and status
if git rev-parse --git-dir > /dev/null 2>&1; then
    branch=$(git branch --show-current 2>/dev/null || echo "detached")
    
    # Check git status for modifications
    if git diff-index --quiet HEAD -- 2>/dev/null; then
        git_status=""
    else
        git_status=" *"
    fi
    
    git_info="$branch$git_status"
else
    git_info="no-git"
fi

# Format and output the status line
printf "%s | %s | %s" "$dir_name" "$git_info" "$model_name"