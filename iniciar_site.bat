@echo off
title Unoteismo - Servidor Local
cd /d "%~dp0"
cls
echo ========================================================
echo       PORTAL DO UNOTEISMO - INICIANDO SERVIDOR
echo ========================================================
echo.
echo 1. Abrindo navegador em http://localhost:8085/ ...
start "" "http://localhost:8085/biblia"
echo.
echo 2. Servidor ativo na porta 8085.
echo    (Mantenha esta janela aberta enquanto utiliza o site)
echo    Para testar o Worker de verdade (paginas por capitulo, API, banco local): wrangler dev
echo.
python dev_server.py 8085
pause
