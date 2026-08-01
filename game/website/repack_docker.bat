@echo off

:: Rebuild Docker images (no cache) and restart containers

echo Rebuilding Docker images...
docker-compose build --no-cache
if errorlevel 1 (
    echo Build failed. Exiting.
    exit /b 1
)

echo Starting containers in detached mode...
docker-compose up -d

echo Docker environment re-packed successfully.
pause
