$ErrorActionPreference = "Stop"

$bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$nodePath = if (Test-Path $bundledNode) { $bundledNode } else { "node" }

& $nodePath (Join-Path $PSScriptRoot "server.mjs")
