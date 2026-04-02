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

Write-Host "Publicando drafts no GitHub..." -ForegroundColor Yellow
$headers = @{
  Authorization  = "Bearer $env:GH_TOKEN"
  Accept         = "application/vnd.github+json"
  "Content-Type" = "application/json"
}
$releases = Invoke-RestMethod -Uri "https://api.github.com/repos/$env:GH_OWNER/$env:GH_REPO/releases" -Headers $headers
$drafts = $releases | Where-Object { $_.draft -eq $true }

if ($drafts.Count -eq 0) {
  Write-Host "Nenhum draft encontrado (ja publicado)." -ForegroundColor Gray
} else {
  foreach ($rel in $drafts) {
    $body = '{"draft":false}'
    $updated = Invoke-RestMethod -Method Patch -Uri "https://api.github.com/repos/$env:GH_OWNER/$env:GH_REPO/releases/$($rel.id)" -Headers $headers -Body $body
    Write-Host "Publicado: $($updated.tag_name)" -ForegroundColor Green
  }
}

Write-Host "Release finalizada. Verifique a aba Releases no GitHub." -ForegroundColor Green
