# Genererer app-ikonerne ud fra stjernen i LoyalSum-logoet.
#
# Stjernen klippes ud af public/loyalsum-logo-dark.png (dens grønne pixels
# afgrænser udsnittet) og centreres på brandets råhvide flade (#f6f4ee) — samme
# farve som manifest.background_color, så ikonet flugter med splash-skærmen.
#
# Stjernens indre "hul" er opakt hvidt (#ffffff) i logofilen, men det er helt
# omsluttet af det grønne, så det står tydeligt uanset baggrundsfarve.
#
# Stjernen fylder 58% af fladen, så den holder sig inden for den centrale
# 80%-cirkel som Android beskærer maskable-ikoner til.
#
# Brug: powershell -File scripts/build-app-icons.ps1

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'public\loyalsum-logo-dark.png'
$bg = [System.Drawing.ColorTranslator]::FromHtml('#f6f4ee')
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

function New-StarBitmap([int]$size, [double]$ratio) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.SmoothingMode = 'AntiAlias'
  $g.PixelOffsetMode = 'HighQuality'
  $g.Clear($bg)

  # Skalér efter den længste side, så stjernens proportioner bevares.
  $scale = ($size * $ratio) / [Math]::Max($starW, $starH)
  $drawW = $starW * $scale
  $drawH = $starH * $scale
  $dest = New-Object System.Drawing.RectangleF(
    (($size - $drawW) / 2), (($size - $drawH) / 2), $drawW, $drawH)
  $src = New-Object System.Drawing.RectangleF($minX, $minY, $starW, $starH)

  $g.DrawImage($logo, $dest, $src, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  return $bmp
}

function New-Icon([int]$size, [string]$path) {
  $bmp = New-StarBitmap $size $starRatio
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "  $path ($size x $size)"
}

# Favicon: ICO-container med PNG-kodede billeder (understøttet af alle moderne
# browsere). Stjernen fylder mere her end i app-ikonet, fordi en favicon ikke
# beskæres til en cirkel — den skal bare være læsbar ved 16 px.
function New-Favicon([string]$path) {
  $sizes = @(16, 32, 48)
  $blobs = @()
  foreach ($s in $sizes) {
    $bmp = New-StarBitmap $s 0.82
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $blobs += ,$ms.ToArray()
    $ms.Dispose()
  }

  $out = New-Object System.IO.MemoryStream
  $w = New-Object System.IO.BinaryWriter($out)
  $w.Write([UInt16]0)               # reserved
  $w.Write([UInt16]1)               # type: icon
  $w.Write([UInt16]$sizes.Count)

  $offset = 6 + (16 * $sizes.Count)
  for ($i = 0; $i -lt $sizes.Count; $i++) {
    $w.Write([Byte]$sizes[$i])      # bredde (0 ville betyde 256)
    $w.Write([Byte]$sizes[$i])      # højde
    $w.Write([Byte]0)               # farver i paletten (0 = truecolor)
    $w.Write([Byte]0)               # reserved
    $w.Write([UInt16]1)             # planes
    $w.Write([UInt16]32)            # bits pr. pixel
    $w.Write([UInt32]$blobs[$i].Length)
    $w.Write([UInt32]$offset)
    $offset += $blobs[$i].Length
  }
  foreach ($b in $blobs) { $w.Write($b) }

  $w.Flush()
  [System.IO.File]::WriteAllBytes($path, $out.ToArray())
  $w.Dispose()
  $out.Dispose()
  Write-Output "  $path (16 + 32 + 48)"
}

New-Icon 192 (Join-Path $root 'public\icon-192.png')
New-Icon 512 (Join-Path $root 'public\icon-512.png')
New-Icon 180 (Join-Path $root 'src\app\apple-icon.png')
New-Favicon (Join-Path $root 'src\app\favicon.ico')

$logo.Dispose()
