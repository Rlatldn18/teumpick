$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$lines = Get-Content -LiteralPath (Join-Path $here 'narration.txt') -Encoding UTF8 | Where-Object { $_.Trim() }
$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice.SelectVoice('Microsoft Heami Desktop')
$voice.Rate = 0
$voice.Volume = 100
$voice.SetOutputToWaveFile((Join-Path $here 'narration.wav'))
foreach ($line in $lines) { $voice.Speak($line) }
$voice.SetOutputToNull()
$voice.Dispose()
