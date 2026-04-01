$ErrorActionPreference = 'Stop'

Write-Host "== PurrPat Release (GitHub) ==" -ForegroundColor Cyan

if (-not $env:GH_TOKEN) {
  Write-Error "GH_TOKEN nao encontrado. Defina com: `$env:GH_TOKEN='SEU_TOKEN'"
}

if (-not $env:GH_OWNER) {
  Write-Error "GH_OWNER nao encontrado. Defina com: `$env:GH_OWNER='seu_usuario_ou_org'"
}

if (-not $env:GH_REPO) {
  Write-Error "GH_REPO nao encontrado. Defina com: `$env:GH_REPO='nome_do_repositorio'"
}

Write-Host "Instalando dependencias..." -ForegroundColor Yellow
npm install

Write-Host "Gerando release e publicando no GitHub Releases..." -ForegroundColor Yellow
npx electron-builder --win nsis --publish always

Write-Host "Release finalizada. Verifique a aba Releases no GitHub." -ForegroundColor Green
