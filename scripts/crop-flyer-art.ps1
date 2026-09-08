<#
  Crop the artwork panel out of the KSF flyer and write it into public/.

  The flyer is a wide marketing piece; only its right-hand illustration
  (shield, lock, laptop, server racks) survives being rendered at ~432px
  in the homepage hero. Everything else on the flyer is body text that
  becomes unreadable at that size, or repeats what the page already says.

  Percentages, not pixels, so the same crop works whatever resolution the
  source is exported at. Defaults frame the right-hand panel; override on
  the command line to nudge.

  Usage:
    powershell -NoProfile -File scripts/crop-flyer-art.ps1 `
      -Source "public/ksf-flyer.png" `
      -Out    "public/ksf-hero-art.png"
#>
param(
  [Parameter(Mandatory = $true)][string]$Source,
  [string]$Out    = "public/ksf-hero-art.png",
  [double]$Left   = 0.625,   # start 62.5% across
  [double]$Top    = 0.00,
  [double]$Right  = 1.00,
  [double]$Bottom = 0.52,
  [switch]$Force16x9         # trim the crop to an exact 16:9 box
)

Add-Type -AssemblyName System.Drawing

$srcPath = (Resolve-Path $Source).Path
$img     = [System.Drawing.Image]::FromFile($srcPath)

try {
  $x = [int]($img.Width  * $Left)
  $y = [int]($img.Height * $Top)
  $w = [int]($img.Width  * ($Right  - $Left))
  $h = [int]($img.Height * ($Bottom - $Top))

  if ($Force16x9) {
    # Keep the width, pull the height to 16:9, clamped to the source.
    $target = [int]($w * 9 / 16)
    if ($target -le ($img.Height - $y)) { $h = $target }
    else { $h = $img.Height - $y; $w = [int]($h * 16 / 9) }
  }

  if ($w -le 0 -or $h -le 0) { throw "Crop is empty - check the percentages." }

  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g   = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode  = 'HighQualityBicubic'
  $g.PixelOffsetMode    = 'HighQuality'
  $g.DrawImage($img,
    (New-Object System.Drawing.Rectangle 0, 0, $w, $h),
    (New-Object System.Drawing.Rectangle $x, $y, $w, $h),
    [System.Drawing.GraphicsUnit]::Pixel)

  # Accept both an absolute path and one relative to the working
  # directory, and normalise the separators either way — System.Drawing
  # refuses a path that mixes "/" and "\", which is easy to hit when the
  # caller is a POSIX-style shell.
  $outPath = if ([System.IO.Path]::IsPathRooted($Out)) { $Out }
             else { Join-Path (Get-Location).Path $Out }
  $outPath = [System.IO.Path]::GetFullPath($outPath)

  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

  "source : {0}  ({1}x{2})" -f (Split-Path $srcPath -Leaf), $img.Width, $img.Height
  "crop   : x={0} y={1} w={2} h={3}  ratio={4:N2}" -f $x, $y, $w, $h, ($w / $h)
  "wrote  : {0}" -f $Out
}
finally {
  if ($g)   { $g.Dispose() }
  if ($bmp) { $bmp.Dispose() }
  $img.Dispose()
}
