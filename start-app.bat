@echo off
setlocal DisableDelayedExpansion

set "DATABASE_URL=jdbc:postgresql://localhost:5432/salary_management"
set "DATABASE_USER=salary_app"
if exist "%~dp0.local\database.bat" call "%~dp0.local\database.bat"
if not defined DATABASE_PASSWORD (
    echo Set DATABASE_PASSWORD or add it to .local\database.bat.
    goto :failed
)

set "SALARY_FRONTEND_URL=http://127.0.0.1:4200/employees"
set "SALARY_BACKEND_PORT=8080"
if defined PORT set "SALARY_BACKEND_PORT=%PORT%"

call :start_database
if errorlevel 1 goto :failed

curl.exe -fs --max-time 2 "http://127.0.0.1:%SALARY_BACKEND_PORT%/api/employees?size=1" >nul 2>&1
if errorlevel 1 (
    call :start_backend
    if errorlevel 1 (
        echo Could not open the backend window.
        goto :failed
    )
) else (
    echo Backend is already running on port %SALARY_BACKEND_PORT%.
)

curl.exe -fs --max-time 2 "%SALARY_FRONTEND_URL%" | findstr.exe /L /C:"<salary-app>" >nul
if errorlevel 1 (
    rem START can leave the previous command's exit code unchanged.
    ver >nul
    start "Salary Frontend" /D "%~dp0frontend" "%ComSpec%" /d /k "npm.cmd start -- --port 4200"
    if errorlevel 1 (
        echo Could not open the frontend window.
        goto :failed
    )
) else (
    echo Frontend is already running on port 4200.
)

echo Waiting for Angular and Spring Boot to respond...
curl.exe -fs --max-time 3 --retry 45 --retry-delay 2 --retry-max-time 90 --retry-all-errors -o nul -w "%%{response_code} %%{content_type}" "http://127.0.0.1:4200/api/employees?size=1" | findstr.exe /i /b /l /c:"200 application/json" >nul
if errorlevel 1 (
    echo Angular could not reach the backend API. Check the Salary Frontend and Salary Backend windows.
    goto :failed
)

echo Frontend and backend are ready. Open %SALARY_FRONTEND_URL%
exit /b 0

:failed
pause
exit /b 1

:start_database
pg_isready.exe -q -h localhost -p 5432
if not errorlevel 1 (
    echo PostgreSQL is already running on port 5432.
    exit /b 0
)

echo Starting the PostgreSQL Windows service.
sc.exe start postgresql-x64-17 >nul 2>&1
if "%errorlevel%"=="5" (
    echo Approve the Windows prompt to start PostgreSQL.
    powershell.exe -NoProfile -Command "$start = Start-Process -FilePath ($env:SystemRoot + '\System32\sc.exe') -ArgumentList 'start','postgresql-x64-17' -Verb RunAs -WindowStyle Hidden -Wait -PassThru -ErrorAction Stop; exit $start.ExitCode"
)
if errorlevel 1 if not "%errorlevel%"=="1056" (
    echo Windows could not start the PostgreSQL service. Exit code %errorlevel%.
    exit /b 1
)

powershell.exe -NoProfile -Command "for ($attempt = 0; $attempt -lt 30; $attempt++) { pg_isready.exe -q -h localhost -p 5432 -t 1; if ($LASTEXITCODE -eq 0) { exit 0 }; Start-Sleep -Seconds 1 }; exit 1"
if errorlevel 1 (
    echo PostgreSQL did not become ready on port 5432. Check the postgresql-x64-17 service.
    exit /b 1
)
exit /b 0

:start_backend
if not defined JAVA_HOME if exist "%ProgramFiles%\Java\jdk-21\bin\java.exe" set "JAVA_HOME=%ProgramFiles%\Java\jdk-21"
ver >nul
start "Salary Backend" /D "%~dp0backend" "%ComSpec%" /d /k "mvn.cmd spring-boot:run"
exit /b %errorlevel%
