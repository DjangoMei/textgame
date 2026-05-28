param(
  [string]$ProxyUrl = $env:ITCH_LLM_PROXY_URL
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$projectRootWithSlash = $projectRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$distDir = Join-Path $projectRoot "dist"
$zipPath = Join-Path $distDir "endless-story-lab-itch.zip"

function Assert-PathInsideProject($PathToCheck) {
  $fullPath = [System.IO.Path]::GetFullPath($PathToCheck)
  if ($fullPath -ne $projectRoot -and -not $fullPath.StartsWith($projectRootWithSlash, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to operate outside project root: $fullPath"
  }
}

function Add-ZipTextEntry($ZipArchive, $EntryName, $Content) {
  $entry = $ZipArchive.CreateEntry($EntryName)
  $stream = $entry.Open()
  $encoding = New-Object System.Text.UTF8Encoding $false
  $writer = New-Object System.IO.StreamWriter $stream, $encoding
  try {
    $writer.Write($Content)
  }
  finally {
    $writer.Dispose()
    $stream.Dispose()
  }
}

Assert-PathInsideProject $distDir
Assert-PathInsideProject $zipPath

New-Item -ItemType Directory -Force -Path $distDir | Out-Null

$normalizedProxyUrl = ([string]$ProxyUrl).Trim().TrimEnd("/")

if (Test-Path $zipPath) {
  $resolvedZipPath = (Resolve-Path $zipPath).Path
  Assert-PathInsideProject $resolvedZipPath
  Remove-Item -LiteralPath $resolvedZipPath -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  $filesToPackage = @(
    Join-Path $projectRoot "index.html"
  )

  $filesToPackage += Get-ChildItem -LiteralPath (Join-Path $projectRoot "src") -Recurse -File |
    Where-Object { $_.FullName -ne (Join-Path $projectRoot "src\config.js") } |
    ForEach-Object { $_.FullName }
  $filesToPackage += Get-ChildItem -LiteralPath (Join-Path $projectRoot "assets") -Recurse -File | ForEach-Object { $_.FullName }
  $filesToPackage += Get-ChildItem -LiteralPath (Join-Path $projectRoot "prompts") -Recurse -File | ForEach-Object { $_.FullName }
  $filesToPackage += Get-ChildItem -LiteralPath (Join-Path $projectRoot "config") -Recurse -File | ForEach-Object { $_.FullName }

  foreach ($filePath in $filesToPackage) {
    Assert-PathInsideProject $filePath
    $relativePath = [System.IO.Path]::GetFullPath($filePath).Substring($projectRootWithSlash.Length)
    $entryName = $relativePath.Replace([System.IO.Path]::DirectorySeparatorChar, "/")
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $filePath, $entryName) | Out-Null
  }

  $configJson = @{
    llmProxyUrl = $normalizedProxyUrl
  } | ConvertTo-Json -Compress
  Add-ZipTextEntry $zip "src/config.js" "window.ENDLESS_STORY_CONFIG = $configJson;"
}
finally {
  $zip.Dispose()
}

Write-Host "Created itch.io HTML5 zip:"
Write-Host $zipPath
