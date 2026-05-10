param(
  [string]$Message = "",
  [string[]]$Pathspec = @("."),
  [switch]$All,
  [switch]$Yes,
  [switch]$NoPause
)

$ErrorActionPreference = "Stop"
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

function Run-Git {
  param([Parameter(Position = 0, ValueFromRemainingArguments = $true)][string[]]$GitArgs)
  $displayArgs = $GitArgs | ForEach-Object {
    if ($_ -match '\s|["'']') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
  }
  Write-Host "git $($displayArgs -join ' ')" -ForegroundColor Cyan
  & git @GitArgs
  if ($LASTEXITCODE -ne 0) {
    throw "git $($GitArgs -join ' ') failed with exit code $LASTEXITCODE"
  }
}

function Git-Output {
  param([Parameter(Position = 0, ValueFromRemainingArguments = $true)][string[]]$GitArgs)
  $output = & git @GitArgs
  if ($LASTEXITCODE -ne 0) {
    throw "git $($GitArgs -join ' ') failed with exit code $LASTEXITCODE"
  }
  return $output
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

try {
  $insideWorkTree = (Git-Output rev-parse --is-inside-work-tree).Trim()
  if ($insideWorkTree -ne "true") {
    throw "This script must be run from inside a Git worktree."
  }

  $branch = (Git-Output branch --show-current).Trim()
  if (!$branch) {
    throw "No current branch is checked out."
  }

  if (!$Message) {
    $Message = "chore: commit local changes $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
  }

  $paths = if ($All -or !$Pathspec -or $Pathspec.Count -eq 0) { @(".") } else { $Pathspec }

  Write-Host "Branch: $branch" -ForegroundColor Gray
  Write-Host "Message: $Message" -ForegroundColor Gray
  Write-Host "Pathspec: $($paths -join ', ')" -ForegroundColor Gray
  Write-Host ""

  $statusArgs = @("status", "--short", "--") + $paths
  $pendingChanges = Git-Output @statusArgs
  if (!$pendingChanges) {
    Write-Host "No non-ignored changes found for the selected pathspec." -ForegroundColor Yellow
    return
  }

  Write-Host "Changes that will be staged:" -ForegroundColor Yellow
  $pendingChanges | ForEach-Object { Write-Host "  $_" }
  Write-Host ""

  if (!$Yes) {
    $answer = Read-Host "Stage and commit these changes? Type y to continue"
    if ($answer -notin @("y", "Y", "yes", "YES", "Yes")) {
      Write-Host "Commit cancelled." -ForegroundColor Yellow
      return
    }
  }

  $addArgs = @("add", "-A", "--") + $paths
  Run-Git @addArgs

  $stagedChanges = (& git diff --cached --name-only)
  if (!$stagedChanges) {
    Write-Host "No non-ignored changes to commit." -ForegroundColor Yellow
    return
  }

  Run-Git commit -m $Message

  Write-Host ""
  Write-Host "Commit complete." -ForegroundColor Green
} catch {
  Write-Host ""
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
} finally {
  if (!$NoPause) {
    Write-Host ""
    Read-Host "Press Enter to close"
  }
}
