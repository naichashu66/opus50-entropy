# One-click render of the whole film. ASCII only (Windows PowerShell 5.1 reads BOM-less scripts as ANSI).
#   powershell -ExecutionPolicy Bypass -File make-video.ps1                  -> Opus50_4K.mp4 (3840x2160)
#   powershell -ExecutionPolicy Bypass -File make-video.ps1 -W 1920          -> Opus50_1080p.mp4
# Steps: start local server -> synthesize soundtrack (out/audio.wav) -> AAC (out/audio.aac) -> render MP4 -> stop server.
param([int]$W = 3840, [string]$Out = '', [int]$Port = 8766)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$tools = Join-Path $root 'tools'
if (-not $Out) { $Out = if ($W -ge 3840) { 'Opus50_4K.mp4' } elseif ($W -ge 1920) { 'Opus50_1080p.mp4' } else { "Opus50_${W}.mp4" } }
$br = if ($W -ge 3840) { 56000000 } elseif ($W -ge 2560) { 32000000 } else { 20000000 }

function Test-Server { try { (Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/index.html" -TimeoutSec 3).StatusCode -eq 200 } catch { $false } }

$server = $null
if (-not (Test-Server)) {
    'Starting local server on port ' + $Port + ' ...'
    $server = Start-Process powershell -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$tools\server.ps1`"", '-Port', $Port -WindowStyle Hidden -PassThru
    for ($i = 0; $i -lt 40 -and -not (Test-Server); $i++) { Start-Sleep -Milliseconds 500 }
    if (-not (Test-Server)) { 'Server did not start (is port ' + $Port + ' in use?)'; exit 1 }
}
try {
    '[1/3] Synthesizing soundtrack ...'
    & powershell -NoProfile -ExecutionPolicy Bypass -File "$tools\run-page.ps1" -Path 'index.html?audio=1' -Done 'AUDIO DONE' -TimeoutSec 600 -Port $Port | Select-Object -Last 1
    if (-not (Test-Path (Join-Path $root 'out\audio.wav'))) { 'Soundtrack failed'; exit 1 }
    '[2/3] Encoding AAC ...'
    & powershell -NoProfile -ExecutionPolicy Bypass -File "$tools\make-aac.ps1" | Select-Object -Last 1
    '[3/3] Rendering ' + $W + ' px video (a few minutes) ...'
    & powershell -NoProfile -ExecutionPolicy Bypass -File "$tools\render.ps1" -W $W -Br $br -Out $Out -TimeoutSec 7200 -Port $Port | Select-Object -Last 2
} finally {
    if ($server) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
}
