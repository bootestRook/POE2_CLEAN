param(
  [string]$Remote = "origin"
)

$ErrorActionPreference = "Stop"

function Run-Git {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  Write-Host "git $($Args -join ' ')" -ForegroundColor Cyan
  & git @Args
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Args -join ' ') failed with exit code $LASTEXITCODE"
  }
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

try {
  Run-Git lfs install --local

  $branch = (& git branch --show-current).Trim()
  if (!$branch) {
    throw "No current branch is checked out."
  }

  Run-Git fetch --prune $Remote
  Run-Git pull --ff-only $Remote $branch
  Run-Git lfs pull $Remote

  Write-Host ""
  Write-Host "Pull complete for $Remote/$branch." -ForegroundColor Green
} catch {
  Write-Host ""
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
} finally {
  Write-Host ""
  Read-Host "Press Enter to close"
}
