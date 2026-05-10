param(
  [string]$RepositoryUrl = "https://github.com/bootestRook/POE2_CLEAN.git",
  [string]$Branch = "",
  [int]$RetryDelaySeconds = 10
)

$ErrorActionPreference = "Stop"
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

function Run-Git {
  param([Parameter(Position = 0, ValueFromRemainingArguments = $true)][string[]]$GitArgs)
  Write-Host "git $($GitArgs -join ' ')" -ForegroundColor Cyan
  & git @GitArgs
  if ($LASTEXITCODE -ne 0) {
    throw "git $($GitArgs -join ' ') failed with exit code $LASTEXITCODE"
  }
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

try {
  Run-Git lfs install --local

  if (!$Branch) {
    $Branch = (& git branch --show-current).Trim()
  }
  if (!$Branch) {
    throw "No current branch is checked out."
  }

  $attempt = 1
  while ($true) {
    try {
      Write-Host ""
      Write-Host "Push attempt $attempt..." -ForegroundColor Yellow
      Run-Git push $RepositoryUrl "HEAD:$Branch"
      break
    } catch {
      Write-Host ""
      Write-Host $_.Exception.Message -ForegroundColor Red
      Write-Host "Push failed. Retrying in $RetryDelaySeconds seconds. Press Ctrl+C to stop." -ForegroundColor Yellow
      Start-Sleep -Seconds $RetryDelaySeconds
      $attempt += 1
    }
  }

  Write-Host ""
  Write-Host "Push complete to $RepositoryUrl on branch $Branch." -ForegroundColor Green
} catch {
  Write-Host ""
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
} finally {
  Write-Host ""
  Read-Host "Press Enter to close"
}
