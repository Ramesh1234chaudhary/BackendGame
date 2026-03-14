#!/bin/bash

# ============================================
# PUSH FRONTEND TO GITHUB
# ============================================

# Go to client folder
cd client

# Initialize git if not already initialized
git init

# Add your frontend GitHub repo
git remote add origin https://github.com/Ramesh1234chaudhary/frontendGame.git

# Add all files
git add .

# Create initial commit
git commit -m "Add frontend with Vercel deployment config"

# Push to GitHub (force to overwrite existing repo)
git push -u origin main --force

# Go back to parent
cd ..

# ============================================
# PUSH BACKEND TO GITHUB
# ============================================

# Go to server folder
cd server

# Initialize git if not already initialized
git init

# Add your backend GitHub repo
git remote add origin https://github.com/Ramesh1234chaudhary/BackendGame.git

# Add all files (including render.yaml)
git add .

# Create initial commit
git commit -m "Add backend with Render deployment config"

# Push to GitHub (force to overwrite existing repo)
git push -u origin main --force

echo "Done! Both repos have been pushed."
