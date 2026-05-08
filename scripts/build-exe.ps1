param(
  [string]$AppName = "",
  [string]$Version = "V1.1",
  [string]$Runtime = "win-x64",
  [string]$OutputRoot = "artifacts/package",
  [switch]$NoZip,
  [switch]$SkipWebBuild,
  [switch]$KeepIntermediate
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($AppName)) {
  $AppName = -join ([char[]](25968, 29420, 21047, 23453))
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$hostProject = Join-Path $repoRoot "tools/desktop_host/DesktopHost.csproj"
$packageRoot = Join-Path $repoRoot $OutputRoot
$releaseName = "$AppName-$Version-$Runtime"
$webBuildDir = Join-Path $packageRoot "_webapp-build"
$hostPublishDir = Join-Path $packageRoot "_host-publish"
$releaseDir = Join-Path $packageRoot $releaseName
$wwwroot = Join-Path $releaseDir "wwwroot"
$zipPath = Join-Path $packageRoot "$releaseName.zip"

if (!(Test-Path $hostProject)) {
  throw "Desktop host project missing: $hostProject"
}

function Stop-ExistingReleaseProcesses {
  $userDataMarker = "SudokuLoot\WebView2"
  $exeName = "$AppName.exe"
  $processes = @(Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -and (
      $_.Name -eq $exeName -or
      ($_.Name -eq "msedgewebview2.exe" -and $_.CommandLine -like "*$userDataMarker*")
    )
  })
  foreach ($process in $processes) {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
  }
  if ($processes.Count -gt 0) {
    Start-Sleep -Seconds 2
  }
}

Stop-ExistingReleaseProcesses

if (!$SkipWebBuild -and !$KeepIntermediate -and (Test-Path $packageRoot)) {
  Get-ChildItem -LiteralPath $packageRoot -Force | Remove-Item -Recurse -Force
}
New-Item -ItemType Directory -Force $packageRoot | Out-Null

if (!$SkipWebBuild) {
  if (Test-Path $webBuildDir) {
    Remove-Item -LiteralPath $webBuildDir -Recurse -Force
  }
  $previousOutDir = $env:VITE_OUT_DIR
  $previousReleaseDebugTools = $env:VITE_RELEASE_DEBUG_TOOLS
  try {
    $env:VITE_OUT_DIR = $webBuildDir
    $env:VITE_RELEASE_DEBUG_TOOLS = "0"
    Push-Location $repoRoot
    npm run build
  } finally {
    Pop-Location
    $env:VITE_OUT_DIR = $previousOutDir
    $env:VITE_RELEASE_DEBUG_TOOLS = $previousReleaseDebugTools
  }
}

if (!(Test-Path (Join-Path $webBuildDir "index.html"))) {
  throw "Web build missing: $webBuildDir"
}

if (Test-Path $hostPublishDir) {
  Remove-Item -LiteralPath $hostPublishDir -Recurse -Force
}

dotnet publish $hostProject `
  -c Release `
  -r $Runtime `
  --self-contained true `
  -o $hostPublishDir `
  -p:PublishSingleFile=true `
  -p:IncludeNativeLibrariesForSelfExtract=true `
  -p:PublishReadyToRun=false `
  -p:DebugType=none `
  -p:DebugSymbols=false `
  -p:AssemblyName=$AppName `
  -p:ProductName=$AppName `
  -p:InformationalVersion=$Version `
  -p:IncludeSourceRevisionInInformationalVersion=false

if (Test-Path $releaseDir) {
  Remove-Item -LiteralPath $releaseDir -Recurse -Force
}
New-Item -ItemType Directory -Force $wwwroot | Out-Null

$hostExe = Get-ChildItem -LiteralPath $hostPublishDir -Filter "*.exe" | Select-Object -First 1
if (!$hostExe) {
  throw "Host exe was not produced."
}

Copy-Item -LiteralPath $hostExe.FullName -Destination (Join-Path $releaseDir "$AppName.exe") -Force
Copy-Item -Path (Join-Path $webBuildDir "*") -Destination $wwwroot -Recurse -Force

if (!(Test-Path (Join-Path $releaseDir "$AppName.exe"))) {
  throw "Release exe missing: $releaseDir"
}
if (!(Test-Path (Join-Path $wwwroot "index.html"))) {
  throw "Release web assets missing: $wwwroot"
}

if (!$NoZip) {
  if (Test-Path $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
  }
  $compressed = $false
  for ($attempt = 1; $attempt -le 3 -and !$compressed; $attempt++) {
    try {
      Compress-Archive -Path (Join-Path $releaseDir "*") -DestinationPath $zipPath -Force
      $compressed = $true
    } catch {
      if ($attempt -eq 3) {
        throw
      }
      Start-Sleep -Seconds 2
    }
  }
}

if (!$KeepIntermediate) {
  if (Test-Path $hostPublishDir) {
    Remove-Item -LiteralPath $hostPublishDir -Recurse -Force
  }
  if (!$SkipWebBuild -and (Test-Path $webBuildDir)) {
    Remove-Item -LiteralPath $webBuildDir -Recurse -Force
  }
}

Write-Host "Release folder: $releaseDir"
if (!$NoZip) {
  Write-Host "Release zip: $zipPath"
}
