# Genererer app-ikonerne ud fra stjernen i LoyalBox-logoet.
#
# Stjernen klippes ud af public/reviewstand-logo-dark.png (dens grønne pixels
# afgrænser udsnittet) og centreres på en navy flade. Navy er valgt, fordi
# stjernens indre "hul" er opakt hvidt — på en lys baggrund forsvinder det, og
# stjernen mister den detalje der gør den genkendelig fra logoet.
#
# Stjernen fylder 58% af fladen, så den holder sig inden for den centrale
# 80%-cirkel som Android beskærer maskable-ikoner til.
#
# Brug: powershell -File scripts/build-app-icons.ps1

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'public\reviewstand-logo-dark.png'
$navy = [System.Drawing.ColorTranslator]::FromHtml('#19375c')
$starRatio = 0.58

$logo = New-Object System.Drawing.Bitmap($source)

# Find stjernens afgrænsning ud fra de grønne pixels, så udsnittet følger
# logoet og ikke et hardkodet område der kan skride ved en logo-opdatering.
$minX = $logo.Width; $maxX = 0; $minY = $logo.Height; $maxY = 0
for ($y = 0; $y -lt $logo.Height; $y++) {
  for ($x = 0; $x -lt $logo.Width; $x++) {
    $p = $logo.GetPixel($x, $y)
    if ($p.A -gt 40 -and $p.G -gt ($p.R + 25) -and $p.G -gt ($p.B + 15) -and $p.G -gt 70) {
      if ($x -lt $minX) { $minX = $x }; if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }; if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
$starW = $maxX - $minX + 1
$starH = $maxY - $minY + 1
Write-Output "Stjerne fundet: ${starW}x${starH} ved ($minX,$minY)"

function New-Icon([int]$size, [string]$path) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.SmoothingMode = 'AntiAlias'
  $g.PixelOffsetMode = 'HighQuality'
  $g.Clear($navy)

  # Skalér efter den længste side, så stjernens proportioner bevares.
  $scale = ($size * $starRatio) / [Math]::Max($starW, $starH)
  $drawW = $starW * $scale
  $drawH = $starH * $scale
  $dest = New-Object System.Drawing.RectangleF(
    (($size - $drawW) / 2), (($size - $drawH) / 2), $drawW, $drawH)
  $src = New-Object System.Drawing.RectangleF($minX, $minY, $starW, $starH)

  $g.DrawImage($logo, $dest, $src, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "  $path ($size x $size)"
}

New-Icon 192 (Join-Path $root 'public\icon-192.png')
New-Icon 512 (Join-Path $root 'public\icon-512.png')
New-Icon 180 (Join-Path $root 'src\app\apple-icon.png')

$logo.Dispose()
