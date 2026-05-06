param(
  [string]$Remote = "origin",
  [string]$Message = ""
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

function Run-Command {
  param([string]$Command, [string[]]$Args)
  Write-Host "$Command $($Args -join ' ')" -ForegroundColor Cyan
  & $Command @Args
  if ($LASTEXITCODE -ne 0) {
    throw "$Command $($Args -join ' ') failed with exit code $LASTEXITCODE"
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

  if (Test-Path "tools/check_repo_hygiene.py") {
    Run-Command python @("tools/check_repo_hygiene.py")
  }

  $ignoredTracked = & git ls-files -c -i --exclude-standard
  if ($ignoredTracked) {
    Write-Host "Tracked files now match .gitignore and should be removed from Git:" -ForegroundColor Yellow
    $ignoredTracked | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    throw "Remove these files from Git tracking before pushing."
  }

  Run-Git add --renormalize .
  Run-Git add -A

  $staged = & git diff --cached --name-only
  if ($staged) {
    if (!$Message) {
      $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
      $Message = "chore: update repository files $stamp"
    }
    Run-Git commit -m $Message
  } else {
    Write-Host "No compliant local changes to commit." -ForegroundColor Yellow
  }

  Run-Git push -u $Remote $branch
  Run-Git lfs push $Remote $branch

  Write-Host ""
  Write-Host "Commit and push complete for $Remote/$branch." -ForegroundColor Green
} catch {
  Write-Host ""
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
} finally {
  Write-Host ""
  Read-Host "Press Enter to close"
}
