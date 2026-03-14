# Fix Node_modules in GitHub Repos

## Option 1: Delete and Recreate (Easiest)

### Frontend Repo:
1. Go to https://github.com/Ramesh1234chaudhary/frontendGame
2. Click Settings → Delete this repository
3. Create new repo with same name
4. Run these commands:

```cmd
cd c:\Users\RAMESH CHAUDHARY\Desktop\game\client
rmdir /s /q .git
git init
git remote add origin https://github.com/Ramesh1234chaudhary/frontendGame.git
git add .
git commit -m "Add frontend code"
git push -u origin main
```

### Backend Repo:
1. Go to https://github.com/Ramesh1234chaudhary/BackendGame
2. Click Settings → Delete this repository
3. Create new repo with same name
4. Run these commands:

```cmd
cd c:\Users\RAMESH CHAUDHARY\Desktop\game\server
rmdir /s /q .git
git init
git remote add origin https://github.com/Ramesh1234chaudhary/BackendGame.git
git add .
git commit -m "Add backend code"
git push -u origin main
```

---

## Option 2: Fix Existing Repo (If you don't want to delete)

### For Frontend:
```cmd
cd c:\Users\RAMESH CHAUDHARY\Desktop\game\client

# Remove node_modules from git cache
git rm -r --cached node_modules
git rm -r --cached .env
git commit -m "Remove node_modules and .env from git"
git push origin main --force
```

### For Backend:
```cmd
cd c:\Users\RAMESH CHAUDHARY\Desktop\game\server

# Remove node_modules from git cache
git rm -r --cached node_modules
git rm -r --cached .env
git commit -m "Remove node_modules and .env from git"
git push origin main --force
```

---

## Important: Create .gitignore FIRST

Before running `git add .`, make sure these files exist:

### client/.gitignore
```
node_modules/
dist/
.env
.env.local
```

### server/.gitignore
```
node_modules/
.env
.env.local
*.log
```

Then when you run `git add .` it will automatically ignore node_modules!