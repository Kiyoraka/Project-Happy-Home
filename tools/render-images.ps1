# ============================================================
# render-images.ps1 - Happy Home image set
# ============================================================
# Renders images with gpt-image-2 through the Invoke-AliceImageGen.ps1
# helper. PNG masters stay in tools/out/ (gitignored); web-ready JPGs
# land in assets/img/.
#
# Usage (from the repo root or anywhere):
#   powershell -File tools\render-images.ps1 -Concepts            # 3 landing-page design concepts
#   powershell -File tools\render-images.ps1 -Concepts -Only b    # one concept by name
#   powershell -File tools\render-images.ps1 -Concepts -Force     # re-render concepts
#   powershell -File tools\render-images.ps1 -Photos              # house + hero photo set (missing only)
#   powershell -File tools\render-images.ps1 -Photos -Only h3-living
#   powershell -File tools\render-images.ps1 -Photos -ConvertOnly # PNG -> JPG without calling the API
#
# Developer tool - not needed to run the site.
# ============================================================
param(
    [switch]$Concepts,
    [switch]$Photos,
    [switch]$ConvertOnly,
    [switch]$Force,
    [string]$Only = "",
    [int]$JpegQuality = 84
)

$ErrorActionPreference = "Stop"

$helper = "C:\Users\User\bin\Invoke-AliceImageGen.ps1"
$root   = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $PSScriptRoot "out"

# ---------------------------------------------------------------- Concepts
# Shared brief for every concept - same content, different visual direction.
$page = "A full-page website design mockup for 'Happy Home', a Malaysian house rental company that rents 5 furnished houses by the month. Show the page top to bottom as one tall desktop screenshot: a top navigation bar with the Happy Home logo and links Houses, Gallery, Track Booking, Login; a large hero section with a photo of a modern Malaysian landed house and the headline 'Find a home you will be happy in' with a search bar (Area, Bedrooms, Max rent); an 'Our Houses' section with house cards showing a photo, house name, monthly rent such as 'RM 1,200 / month', bedroom and bathroom counts and a View button; a photo gallery strip; a 'How it works' row with three steps Pick, Book, Move in; a 'Track your booking' panel with a phone number field and a Check button; and a footer. Crisp UI design, realistic web layout, legible English text, consistent spacing, no device frame, no watermark"

$conceptSet = @(
    @{ name = "concept-a"; prompt = "$page. Visual direction: warm modern Malaysian - cream and sand backgrounds, terracotta accent buttons, deep brown text, elegant serif headings with a clean sans-serif body, rounded corners, soft shadows, subtle batik-inspired line pattern in section dividers, warm golden-hour photography." },
    @{ name = "concept-b"; prompt = "$page. Visual direction: clean minimal - pure white background, deep forest green accent, charcoal text, modern geometric sans-serif typography, generous white space, a large edge-to-edge photo grid, thin hairline borders, small pill buttons, calm daylight photography." },
    @{ name = "concept-c"; prompt = "$page. Visual direction: bold contemporary - deep navy background sections alternating with light sections, coral and peach accent buttons, frosted glass cards with blur over photos, bold rounded sans-serif headings, gradient highlights, vibrant twilight photography." }
)

# ------------------------------------------------------------------ Photos
# Concept C photography (approved): twilight / blue-hour exteriors with warm
# window light, warm-lit modern Malaysian interiors. One style line so the set
# reads as one brand.
$style = "architectural real-estate photography, full-frame 24mm look, photorealistic, high detail, natural colours, Malaysian suburban setting, no people, no text, no watermark, no logos"
$dusk  = "photographed at blue hour just after sunset, deep indigo and peach sky, warm amber light glowing from every window, tidy porch, potted tropical plants"
$warm  = "warm evening lamp light mixed with soft daylight from large windows, clean and tidy, inviting, styled for a rental listing"

$photoSet = @(
    @{ name = "hero-1";      quality = "high";   prompt = "Wide hero shot of a modern two-storey Malaysian landed house with grey roof tiles, white walls, timber accents and a gated porch, $dusk, a quiet tree-lined residential street. $style" },
    @{ name = "hero-2";      quality = "high";   prompt = "Wide hero shot of a row of modern Malaysian double-storey terrace houses on a calm street, $dusk, neat gardens and street lamps glowing. $style" },
    @{ name = "hero-3";      quality = "high";   prompt = "Wide interior hero shot of a spacious modern Malaysian living and dining room, $warm, sofa, dining table, pendant lights, glass doors to a small garden at dusk. $style" },

    @{ name = "h1-exterior"; quality = "medium"; prompt = "Front view of a single-storey Malaysian terrace house with a covered two-car porch, white gate, grey roof, $dusk. $style" },
    @{ name = "h1-living";   quality = "medium"; prompt = "Living and dining area of a single-storey Malaysian terrace house: beige 3-seater fabric sofa, coffee table, 43-inch TV on a low cabinet, six-seat timber dining table, ceiling fan, $warm. $style" },
    @{ name = "h1-bedroom";  quality = "medium"; prompt = "Master bedroom of a Malaysian terrace house: queen bed with white and grey linen, wardrobe, dressing table, wall-mounted air-conditioner, ceiling fan, $warm. $style" },

    @{ name = "h2-exterior"; quality = "medium"; prompt = "Front view of a double-storey Malaysian terrace house in Subang Jaya with a small front garden patio, balcony upstairs, $dusk. $style" },
    @{ name = "h2-living";   quality = "medium"; prompt = "Living hall of a double-storey Malaysian terrace house: grey L-shaped sofa, 50-inch TV on a console, patterned rug, air-conditioner, staircase in the background, $warm. $style" },
    @{ name = "h2-bedroom";  quality = "medium"; prompt = "Master bedroom of a Malaysian double-storey home: king bed with navy and white linen, built-in wardrobe, two bedside tables with lamps, air-conditioner, $warm. $style" },

    @{ name = "h3-exterior"; quality = "medium"; prompt = "Front view of a modern double-storey semi-detached house in Bangi with a side garden, three-car covered porch, high windows, $dusk. $style" },
    @{ name = "h3-living";   quality = "medium"; prompt = "Double-volume living room of a Malaysian semi-D house: tan leather sofa, two armchairs, 55-inch TV, tall windows, eight-seat dining table beyond, $warm. $style" },
    @{ name = "h3-bedroom";  quality = "medium"; prompt = "Master bedroom of a Malaysian semi-D house: king bed, walk-in wardrobe doorway, sofa chair, view into an en-suite bathroom with bathtub, $warm. $style" },

    @{ name = "h4-exterior"; quality = "medium"; prompt = "Ground-floor unit of a Malaysian townhouse block in Seri Kembangan with its own small gate and patio, simple modern facade, $dusk. $style" },
    @{ name = "h4-living";   quality = "medium"; prompt = "Simple partly furnished living room of a Malaysian townhouse: 3-seater sofa, coffee table, TV cabinet, ceiling fan, bare walls ready to personalise, $warm. $style" },
    @{ name = "h4-bedroom";  quality = "medium"; prompt = "Bright simple master bedroom of a Malaysian townhouse: queen bed with light linen, wardrobe, air-conditioner, curtain window, $warm. $style" },

    @{ name = "h5-exterior"; quality = "medium"; prompt = "Modern double-storey cluster house in a guarded Cyberjaya community, flat roof lines, large glass windows, smart lock door, lake park visible nearby, $dusk. $style" },
    @{ name = "h5-living";   quality = "medium"; prompt = "Open living and dining of a modern Cyberjaya cluster house: modular sofa, 65-inch TV, six-seat dining table, home office corner with two desks visible, $warm. $style" },
    @{ name = "h5-bedroom";  quality = "medium"; prompt = "Master bedroom of a modern Cyberjaya cluster house: king bed, vanity table, walk-in wardrobe, en-suite with rain shower visible through a glass door, $warm. $style" }
)

Add-Type -AssemblyName System.Drawing

function Convert-PngToJpg {
    param([string]$PngPath, [string]$JpgPath, [int]$Quality, [int]$MaxWidth = 1600)
    $img = [System.Drawing.Image]::FromFile($PngPath)
    try {
        $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
        $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
        $w = [Math]::Min($img.Width, $MaxWidth)
        $h = [int]($img.Height * $w / $img.Width)
        $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.Clear([System.Drawing.Color]::White)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($img, 0, 0, $w, $h)
        $bmp.Save($JpgPath, $codec, $params)
        $g.Dispose(); $bmp.Dispose()
    } finally {
        $img.Dispose()
    }
}

# ------------------------------------------------------------- Photos run
if ($Photos) {
    $pngDir   = Join-Path $outDir "photos"
    $imgDir   = Join-Path $root "assets\img"
    $houseDir = Join-Path $imgDir "houses"
    New-Item -ItemType Directory -Path $pngDir, $houseDir -Force | Out-Null

    $set = $photoSet
    if ($Only) {
        $set = $photoSet | Where-Object { $_.name -eq $Only }
        if (-not $set) { throw "No photo named '$Only'." }
    }

    foreach ($p in $set) {
        $png = Join-Path $pngDir ($p.name + ".png")
        $jpgDir = if ($p.name -like "h?-*") { $houseDir } else { $imgDir }
        $jpg = Join-Path $jpgDir ($p.name + ".jpg")
        if (-not $ConvertOnly -and ($Force -or -not (Test-Path $png))) {
            Write-Host ("[render] {0} ({1}, 1536x1024)" -f $p.name, $p.quality)
            $sw = [System.Diagnostics.Stopwatch]::StartNew()
            try {
                & $helper -Prompt $p.prompt -OutFile $png -Size "1536x1024" -Quality $p.quality -Model "gpt-image-2" | Out-Null
            } catch {
                Write-Host ("[fail]   {0}: {1}" -f $p.name, $_.Exception.Message)
                continue
            }
            $sw.Stop()
            Write-Host ("         done in {0:n0}s" -f $sw.Elapsed.TotalSeconds)
        }
        if (-not (Test-Path $png)) { Write-Host ("[skip]   {0} - no PNG master" -f $p.name); continue }
        Convert-PngToJpg -PngPath $png -JpgPath $jpg -Quality $JpegQuality
        Write-Host ("[jpg]    {0}.jpg {1} KB" -f $p.name, [math]::Round((Get-Item $jpg).Length / 1KB))
    }
    exit 0
}

# ----------------------------------------------------------- Concepts run
if (-not $Concepts) {
    Write-Host "Nothing to do. Use -Concepts (landing design concepts) or -Photos (house + hero photos)."
    exit 0
}

$dir = Join-Path $outDir "concepts"
New-Item -ItemType Directory -Path $dir -Force | Out-Null

$set = $conceptSet
if ($Only) {
    $set = $conceptSet | Where-Object { $_.name -eq "concept-$Only" -or $_.name -eq $Only }
    if (-not $set) { throw "No concept named '$Only'. Names: a, b, c" }
}

foreach ($c in $set) {
    $png = Join-Path $dir ($c.name + ".png")
    if (-not $Force -and (Test-Path $png)) {
        Write-Host ("[skip]   {0} - already rendered (use -Force)" -f $c.name)
        continue
    }
    Write-Host ("[render] {0} (high, 1024x1536)" -f $c.name)
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    & $helper -Prompt $c.prompt -OutFile $png -Size "1024x1536" -Quality "high" -Model "gpt-image-2" | Out-Null
    $sw.Stop()
    Write-Host ("         done in {0:n0}s -> {1}" -f $sw.Elapsed.TotalSeconds, $png)
}
