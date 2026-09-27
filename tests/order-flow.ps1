# Replaced the retired ChatGPT pilot integration test.
node (Join-Path $PSScriptRoot 'mobile-api.mjs')
if($LASTEXITCODE -ne 0){throw 'Mobile API tests failed'}
