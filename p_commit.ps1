param(
  [string]$Message = ""
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
  if (!$Message) {
    $Message = "chore: commit local changes $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
  }

  Run-Git add -A -- .

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
  Write-Host ""
  Read-Host "Press Enter to close"
}
