@echo off
setlocal enabledelayedexpansion

set GP=%1
if "%GP%"=="" set GP=MarinaBay
set NSIM=%2
if "%NSIM%"=="" set NSIM=1000000
set SEED=%3
if "%SEED%"=="" set SEED=20250927
set SAVE=%4
if "%SAVE%"=="" set SAVE=out

set VENV_PY=.venv\Scripts\python.exe
if not exist %VENV_PY% (
  echo Creating virtual environment...
  py -3 -m venv .venv
)

echo Installing requirements...
%VENV_PY% -m pip install --upgrade pip setuptools wheel
%VENV_PY% -m pip install -r requirements.txt

echo Running simulation for GP %GP% with %NSIM% sims...
%VENV_PY% main.py --gp %GP% --n-sim %NSIM% --seed %SEED% --save %SAVE% --html-report report.html

echo Done. Outputs in %CD%\%SAVE%
endlocal 