@echo off
title PurrPat
cd /d "%~dp0"

echo Verificando dependencias...
if not exist node_modules (
    echo Instalando dependencias... Aguarde...
    npm install
)

echo Iniciando PurrPat...
.\node_modules\.bin\electron .
