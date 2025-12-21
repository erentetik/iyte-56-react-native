# Navigate to project directory
cd /Users/erentetik/Desktop/iyte-56

# Remove node_modules and lock files
rm -rf node_modules
rm -rf package-lock.json

# Remove iOS Pods
cd ios
rm -rf Pods
rm -rf Podfile.lock
cd ..

# Clean npm cache (optional but recommended)
npm cache clean --force

# Reinstall Node modules
npm install

# Reinstall iOS Pods
cd ios
pod deintegrate
pod install
cd ..

# For Expo projects, you may also want to clear Expo cache
npx expo start --clear

# To build iOS app
npx expo run:ios

# Or to build Android app
npx expo run:android