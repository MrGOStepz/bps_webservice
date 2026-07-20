<#
PowerShell helper to run Spring Boot backend and Angular frontend for this project.

Usage:
  .\run.ps1                # start dev servers for backend and frontend (default)
  .\run.ps1 -Mode prod     # build angular, copy to Spring resources, build backend, and run
  .\run.ps1 -NoInstall     # skip `npm install` when starting frontend
  .\run.ps1 -FrontendOnly  # only run Angular
  .\run.ps1 -BackendOnly   # only run Spring Boot
  .\run.ps1 -OpenWindows:$false  # run in the same console instead of opening new windows

Access Points (Dev Mode):
  Local:     http://localhost:4200           (Angular dev server)
             http://localhost:8080           (Spring Boot backend)
  Remote:    http://mrgostepz.thddns.net:5851 (port mapping: 5852 → 4200)

Notes:
- Designed for Windows PowerShell (powershell.exe) and to be run from repository root.
- Requires Java (matching Gradle toolchain) and Node/npm installed for Angular.
- Angular dev server listens on all network interfaces (0.0.0.0:4200) for remote access.
- In `prod` mode the Angular dist (dist/angular) is copied into Spring Boot's
  `src/main/resources/static` so Spring serves the built frontend.
- Port mapping configured: external port 5852 → internal port 4200 (Angular).
#>

param(
    [ValidateSet('dev','prod')]
    [string]$Mode = 'dev',

    [switch]$NoInstall,
    [switch]$FrontendOnly,
    [switch]$BackendOnly,

    [bool]$OpenWindows = $true
)

# Resolve repository root (script location)
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not (Test-Path $RepoRoot)) { $RepoRoot = Get-Location }
$BackendPath = $RepoRoot
$AngularPath = Join-Path $RepoRoot 'angular'
$SpringStatic = Join-Path $RepoRoot 'src\main\resources\static'

# Pull latest 'main' from origin first (safe update without forcing a checkout)
if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Host "Fetching latest 'main' from origin..."
    Push-Location $RepoRoot
    try {
        $current = (& git rev-parse --abbrev-ref HEAD) -replace "`r|`n",''
        & git fetch origin main --quiet
        if ($current -eq 'main') {
            Write-Host "On 'main' branch; pulling latest changes..."
            & git pull origin main
        }
        else {
            # Update (or create) local 'main' to match origin/main without checking it out
            & git rev-parse --verify main > $null 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Updating local 'main' branch to origin/main..."
                & git branch -f main origin/main
            }
            else {
                Write-Host "Creating local 'main' branch from origin/main..."
                & git branch main origin/main
            }
        }
    } catch {
        Write-Warning "Git operation failed: $_"
    }
    Pop-Location
}
else {
    Write-Warning "git not found in PATH; skipping pull of 'main'."
}

function Check-Prereq {
    param($Name, $Cmd)
    $found = Get-Command $Cmd -ErrorAction SilentlyContinue
    if (-not $found) {
        Write-Warning "$Name not found in PATH. Some operations may fail."
        return $false
    }
    return $true
}

# Basic checks
Check-Prereq -Name 'Java (java)' -Cmd 'java' | Out-Null
Check-Prereq -Name 'Node (node)' -Cmd 'node' | Out-Null
Check-Prereq -Name 'npm' -Cmd 'npm' | Out-Null

if ($FrontendOnly -and $BackendOnly) {
    Write-Error "Cannot use -FrontendOnly and -BackendOnly together."; exit 1
}

if ($Mode -eq 'dev') {
    if (-not $BackendOnly) {
        Write-Host "Starting Spring Boot (bootRun) in dev mode..."
        Write-Host "Backend available at: http://localhost:8080"
        $backendCommand = "Set-Location -LiteralPath '$BackendPath'; & '.\gradlew.bat' bootRun"
        if ($OpenWindows) {
            Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit', '-Command', $backendCommand -WorkingDirectory $BackendPath
        }
        else {
            Write-Host "-- Running backend in current console --"; Invoke-Expression $backendCommand
        }
    }

    if (-not $FrontendOnly) {
        Write-Host "Starting Angular dev server (npm start)..."
        Write-Host "Angular available at:"
        Write-Host "  Local:  http://localhost:4200"
        Write-Host "  Remote: http://mrgostepz.thddns.net:5851 (DDNS with port mapping 5851→4200)"
        if (-not $NoInstall) {
            if (-not (Test-Path (Join-Path $AngularPath 'node_modules'))) {
                Write-Host "node_modules not found, running npm install in $AngularPath..."
                if ($OpenWindows) {
                    $installCmd = "Set-Location -LiteralPath '$AngularPath'; npm install"
                    Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit', '-Command', $installCmd -WorkingDirectory $AngularPath
                    Start-Sleep -Seconds 1
                    Write-Host "Opened a window to run 'npm install'. After install completes, re-run script to start dev server or open another window to run it now."
                }
                else {
                    Push-Location $AngularPath; npm install; Pop-Location
                }
            }
            else {
                Write-Host "node_modules exists; skipping npm install."
            }
        }

        $frontendCommand = "Set-Location -LiteralPath '$AngularPath'; npm start"
        if ($OpenWindows) {
            Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit', '-Command', $frontendCommand -WorkingDirectory $AngularPath
        }
        else {
            Write-Host "-- Running frontend in current console --"; Invoke-Expression $frontendCommand
        }
    }
}
else {
    # Production: build angular, copy into spring static, build backend and run
    if (-not $FrontendOnly) {
        Write-Host "Building Angular for production..."
        Push-Location $AngularPath
        if (-not $NoInstall) {
            Write-Host "Running npm ci (or npm install if ci fails)..."
            $rc = & npm ci 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "npm ci failed; trying npm install..."
                & npm install | Out-Null
            }
        }

        # run ng build production explicitly
        Write-Host "Running ng build --configuration production..."
        # Use npm run build to pick up script wrapper
        & npm run build -- --configuration production
        if ($LASTEXITCODE -ne 0) { Write-Error "Angular build failed."; Pop-Location; exit 1 }
        Pop-Location

        $DistDir = Join-Path $AngularPath 'dist\angular'
        if (-not (Test-Path $DistDir)) { Write-Error "Expected dist folder not found: $DistDir"; exit 1 }

        Write-Host "Copying built Angular files to Spring Boot static resources ($SpringStatic)..."
        if (Test-Path $SpringStatic) {
            Remove-Item -LiteralPath $SpringStatic -Recurse -Force -ErrorAction SilentlyContinue
        }
        New-Item -ItemType Directory -Path $SpringStatic -Force | Out-Null
        Copy-Item -Path (Join-Path $DistDir '*') -Destination $SpringStatic -Recurse -Force
        Write-Host "Copy complete."
    }

    if (-not $FrontendOnly -and -not $BackendOnly) {
        Write-Host "Building Spring Boot jar (bootJar)..."
        Push-Location $BackendPath
        & .\gradlew.bat bootJar
        if ($LASTEXITCODE -ne 0) { Write-Error "Gradle build failed."; Pop-Location; exit 1 }
        Pop-Location

        # Optionally run the application
        Write-Host "Starting Spring Boot application (bootRun)..."
        $backendCommand = "Set-Location -LiteralPath '$BackendPath'; & '.\gradlew.bat' bootRun"
        if ($OpenWindows) {
            Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit', '-Command', $backendCommand -WorkingDirectory $BackendPath
        }
        else {
            Invoke-Expression $backendCommand
        }
    }
}

Write-Host "Run script completed (mode: $Mode)."

