$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$tooling=Join-Path $root '.tooling'
New-Item -ItemType Directory -Force $tooling | Out-Null
$jdkMeta=Invoke-RestMethod 'https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=x64&image_type=jdk&os=windows&vendor=eclipse'
$package=$jdkMeta[0].binary.package
$jdkZip=Join-Path $tooling 'jdk21.zip'
if(!(Test-Path $jdkZip)){Invoke-WebRequest $package.link -OutFile $jdkZip}
if((Get-FileHash $jdkZip -Algorithm SHA256).Hash.ToLower() -ne $package.checksum){throw 'JDK checksum mismatch'}
if(!(Test-Path (Join-Path $tooling 'jdk'))){Expand-Archive -LiteralPath $jdkZip -DestinationPath (Join-Path $tooling 'jdk')}
$jdkDir=Get-ChildItem (Join-Path $tooling 'jdk') -Directory | Select-Object -First 1
$env:JAVA_HOME=$jdkDir.FullName
$env:PATH=(Join-Path $env:JAVA_HOME 'bin')+';'+$env:PATH
$sdkZip=Join-Path $tooling 'android-tools.zip'
if(!(Test-Path $sdkZip)){Invoke-WebRequest 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip' -OutFile $sdkZip}
if((Get-FileHash $sdkZip -Algorithm SHA256).Hash.ToLower() -ne '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a'){throw 'Android tools checksum mismatch'}
$sdk=Join-Path $tooling 'android-sdk'
New-Item -ItemType Directory -Force (Join-Path $sdk 'cmdline-tools/latest') | Out-Null
if(!(Test-Path (Join-Path $sdk 'cmdline-tools/latest/bin/sdkmanager.bat'))){Expand-Archive -LiteralPath $sdkZip -DestinationPath (Join-Path $tooling 'android-unpacked');Copy-Item -Path (Join-Path $tooling 'android-unpacked/cmdline-tools/*') -Destination (Join-Path $sdk 'cmdline-tools/latest') -Recurse}
$manager=Join-Path $sdk 'cmdline-tools/latest/bin/sdkmanager.bat'
# Run only with explicit approval to accept Google's Android SDK license.
1..10 | ForEach-Object {'y'} | & $manager "--sdk_root=$sdk" --licenses
if($LASTEXITCODE -ne 0){throw 'License acceptance failed'}
& $manager "--sdk_root=$sdk" 'platforms;android-36' 'build-tools;36.0.0' 'platform-tools'
if($LASTEXITCODE -ne 0){throw 'Android SDK installation failed'}
"sdk.dir=$($sdk.Replace('\','/'))" | Set-Content -Encoding ascii (Join-Path $root 'android/local.properties')
Write-Output 'Android build tools installed and verified.'
