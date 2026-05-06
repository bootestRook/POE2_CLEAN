param(
  [string]$AppName = "WangYangAdventure",
  [string]$Version = "v1.0",
  [string]$Runtime = "win-x64",
  [string]$OutputRoot = "artifacts/package",
  [switch]$NoZip,
  [switch]$SkipWebBuild,
  [switch]$KeepIntermediate
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$hostProject = Join-Path $repoRoot "tools/release_host/ReleaseHost.csproj"
$packageRoot = Join-Path $repoRoot $OutputRoot
$webBuildDir = Join-Path $packageRoot "_webapp-build"
$hostPublishDir = Join-Path $packageRoot "_host-publish"
$releaseName = "$AppName-$Version-$Runtime"
$releaseDir = Join-Path $packageRoot $releaseName
$wwwroot = Join-Path $releaseDir "wwwroot"
$zipPath = Join-Path $packageRoot "$releaseName.zip"

New-Item -ItemType Directory -Force $packageRoot | Out-Null

if (!$SkipWebBuild) {
  if (Test-Path $webBuildDir) {
    Remove-Item -LiteralPath $webBuildDir -Recurse -Force
  }
  $previousOutDir = $env:VITE_OUT_DIR
  try {
    $env:VITE_OUT_DIR = $webBuildDir
    Push-Location $repoRoot
    npm run build
  } finally {
    Pop-Location
    $env:VITE_OUT_DIR = $previousOutDir
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
  -p:DebugSymbols=false

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
