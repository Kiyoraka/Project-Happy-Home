# ============================================================
# render-images.ps1 - Happy Home image set
# ============================================================
# Renders images with gpt-image-2 through the Invoke-AliceImageGen.ps1
# helper. PNG masters stay in tools/out/ (gitignored).
#
# Usage (from the repo root or anywhere):
#   powershell -File tools\render-images.ps1 -Concepts            # 3 landing-page design concepts
#   powershell -File tools\render-images.ps1 -Concepts -Only b    # one concept by name
#   powershell -File tools\render-images.ps1 -Concepts -Force     # re-render concepts
#
# Developer tool - not needed to run the site.
# ============================================================
param(
    [switch]$Concepts,
    [switch]$Force,
    [string]$Only = ""
)

$ErrorActionPreference = "Stop"

$helper = "C:\Users\User\bin\Invoke-AliceImageGen.ps1"
$outDir = Join-Path $PSScriptRoot "out"

# Shared brief for every concept - same content, different visual direction.
$page = "A full-page website design mockup for 'Happy Home', a Malaysian house rental company that rents 5 furnished houses by the month. Show the page top to bottom as one tall desktop screenshot: a top navigation bar with the Happy Home logo and links Houses, Gallery, Track Booking, Login; a large hero section with a photo of a modern Malaysian landed house and the headline 'Find a home you will be happy in' with a search bar (Area, Bedrooms, Max rent); an 'Our Houses' section with house cards showing a photo, house name, monthly rent such as 'RM 1,200 / month', bedroom and bathroom counts and a View button; a photo gallery strip; a 'How it works' row with three steps Pick, Book, Move in; a 'Track your booking' panel with a phone number field and a Check button; and a footer. Crisp UI design, realistic web layout, legible English text, consistent spacing, no device frame, no watermark"

$conceptSet = @(
    @{ name = "concept-a"; prompt = "$page. Visual direction: warm modern Malaysian - cream and sand backgrounds, terracotta accent buttons, deep brown text, elegant serif headings with a clean sans-serif body, rounded corners, soft shadows, subtle batik-inspired line pattern in section dividers, warm golden-hour photography." },
    @{ name = "concept-b"; prompt = "$page. Visual direction: clean minimal - pure white background, deep forest green accent, charcoal text, modern geometric sans-serif typography, generous white space, a large edge-to-edge photo grid, thin hairline borders, small pill buttons, calm daylight photography." },
    @{ name = "concept-c"; prompt = "$page. Visual direction: bold contemporary - deep navy background sections alternating with light sections, coral and peach accent buttons, frosted glass cards with blur over photos, bold rounded sans-serif headings, gradient highlights, vibrant twilight photography." }
)

if (-not $Concepts) {
    Write-Host "Nothing to do. Use -Concepts to render the landing-page design concepts."
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
