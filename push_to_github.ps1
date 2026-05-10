param(
  [string]$RepositoryUrl = "https://github.com/bootestRook/POE2_CLEAN.git",
  [string]$Branch = ""
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

  Run-Git push $RepositoryUrl "HEAD:$Branch"

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
