# Arranca el servidor de la web (si no esta ya encendido) y, en cuanto responde,
# abre la portada en el navegador. No lo ejecutes a mano: usa "Abrir la web.bat",
# que esta un nivel por encima de esta carpeta.

$ErrorActionPreference = 'SilentlyContinue'
$port = 4321
$url  = "http://localhost:$port/"

function Test-Port {
    [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

if (-not (Test-Port)) {
    # La comprobacion de si faltan dependencias se hace aqui, en PowerShell: meterla
    # como un "if" dentro de la linea de cmd.exe es fragil y a veces se come el resto.
    if (Test-Path (Join-Path $PSScriptRoot 'node_modules')) {
        $comando = 'title Antiqua Noctes - servidor & npm run dev'
    } else {
        $comando = 'title Antiqua Noctes - servidor & npm install & npm run dev'
    }

    # Ventana visible: si algo falla, ahi se ve por que.
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', $comando -WorkingDirectory $PSScriptRoot

    $maxWait = 90
    $waited = 0
    while (-not (Test-Port) -and $waited -lt $maxWait) {
        Start-Sleep -Seconds 1
        $waited++
    }

    if (-not (Test-Port)) {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show(
            "El servidor no ha arrancado a tiempo. Revise la ventana negra que se ha abierto: ahi se ve que ha pasado.",
            'Antiqua Noctes'
        ) | Out-Null
        exit 1
    }
}

Start-Process $url
