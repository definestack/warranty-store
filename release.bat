@echo off
setlocal

call npm run version:bump
if errorlevel 1 exit /b %errorlevel%

cd android
call gradlew.bat bundleRelease
if errorlevel 1 exit /b %errorlevel%

cd ..
endlocal
