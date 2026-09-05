$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$env:JAVA_HOME=(Get-ChildItem -LiteralPath (Join-Path $root '.tooling/jdk') -Directory | Select-Object -First 1).FullName
$env:ANDROID_HOME=Join-Path $root '.tooling/android-sdk'
$env:GRADLE_USER_HOME=Join-Path $root '.tooling/gradle'
$env:PATH=(Join-Path $env:JAVA_HOME 'bin')+';'+$env:PATH
& (Join-Path $root 'android/gradlew.bat') -p (Join-Path $root 'android') assembleDebug bundleRelease --no-daemon --max-workers=2 '-Dorg.gradle.jvmargs=-Xmx1536m'
if($LASTEXITCODE -ne 0){throw 'Android build failed'}
New-Item -ItemType Directory -Force (Join-Path $root 'outputs/android') | Out-Null
Copy-Item -LiteralPath (Join-Path $root 'android/app/build/outputs/apk/debug/app-debug.apk') -Destination (Join-Path $root 'outputs/android/teumpick-0.3.0-debug.apk')
Copy-Item -LiteralPath (Join-Path $root 'android/app/build/outputs/bundle/release/app-release.aab') -Destination (Join-Path $root 'outputs/android/teumpick-0.3.0-unsigned.aab')
