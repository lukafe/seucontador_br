param(
  [string]$Gp = "MarinaBay",
  [int]$NSim = 1000000,
  [int]$Seed = 20250927,
  [string]$Save = "out"
)

$ErrorActionPreference = "Stop"

$venvPy = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPy)) {
  Write-Host "Creating virtual environment..."
  py -3 -m venv .venv
}

Write-Host "Installing requirements..."
& $venvPy -m pip install --upgrade pip setuptools wheel
& $venvPy -m pip install -r (Join-Path $PSScriptRoot "requirements.txt")

Write-Host "Running simulation for GP '$Gp' with $NSim sims..."
& $venvPy (Join-Path $PSScriptRoot "main.py") --gp $Gp --n-sim $NSim --seed $Seed --save $Save --html-report report.html

Write-Host "Done. Outputs in" (Resolve-Path (Join-Path $PSScriptRoot $Save)) 