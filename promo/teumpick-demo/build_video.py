"""Build the 30-second 9:16 MP4 from scene plates and local narration."""

from __future__ import annotations

import math
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
SCENES = ROOT / "scenes"
CLIPS = ROOT / "clips"
CLIPS.mkdir(exist_ok=True)
FFMPEG = ROOT / ".deps" / "imageio_ffmpeg" / "binaries" / "ffmpeg-win-x86_64-v7.1.exe"
DURATIONS = [3.5, 4.5, 4.0, 4.0, 5.0, 3.0, 3.0, 3.0]
FPS = 24


def run(*args):
    print("Running:", " ".join(str(x) for x in args[:7]), "...", flush=True)
    subprocess.run([str(x) for x in args], check=True)


def make_music():
    sr = 44100
    duration = 30.0
    n = round(sr * duration)
    audio = np.zeros(n, dtype=np.float32)
    chords = [
        (261.63, 329.63, 392.00),
        (220.00, 261.63, 329.63),
        (174.61, 220.00, 349.23),
        (196.00, 246.94, 392.00),
    ]
    for start in np.arange(0, duration, 4.0):
        chord = chords[int(start // 4) % 4]
        length = min(4.5, duration - start)
        count = round(sr * length)
        t = np.arange(count, dtype=np.float32) / sr
        fade_in = np.minimum(1.0, t / 0.5)
        fade_out = np.minimum(1.0, np.maximum(0, length - t) / 0.6)
        pad = np.zeros(count, dtype=np.float32)
        for freq in chord:
            pad += 0.022 * np.sin(2 * np.pi * freq * t)
            pad += 0.006 * np.sin(2 * np.pi * freq * 2 * t)
        begin = round(start * sr)
        audio[begin:begin + count] += pad * fade_in * fade_out
    # Gentle marimba-like pulse at a steady 100 BPM.
    for start in np.arange(0, duration, 0.6):
        freq = (392.0, 329.63, 261.63, 329.63)[int(round(start / 0.6)) % 4]
        count = min(round(sr * 0.31), n - round(start * sr))
        t = np.arange(count, dtype=np.float32) / sr
        pulse = 0.045 * np.exp(-13 * t) * np.sin(2 * np.pi * freq * t)
        begin = round(start * sr)
        audio[begin:begin + count] += pulse
    # The single approved-code cue; a short positive two-note chime.
    for start, freq in ((23.85, 659.25), (24.03, 783.99)):
        count = min(round(sr * 0.45), n - round(start * sr))
        t = np.arange(count, dtype=np.float32) / sr
        cue = 0.075 * np.exp(-8 * t) * np.sin(2 * np.pi * freq * t)
        begin = round(start * sr)
        audio[begin:begin + count] += cue
    edge = round(0.55 * sr)
    audio[:edge] *= np.linspace(0, 1, edge, dtype=np.float32)
    audio[-edge:] *= np.linspace(1, 0, edge, dtype=np.float32)
    audio = np.clip(audio, -0.8, 0.8)
    path = ROOT / "music.wav"
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sr)
        wav.writeframes((audio * 32767).astype("<i2").tobytes())
    return path


def main():
    if not FFMPEG.exists():
        raise FileNotFoundError(f"FFmpeg is missing: {FFMPEG}")
    if not (ROOT / "narration.wav").exists():
        raise FileNotFoundError("Run narration.ps1 before building the video")
    music = make_music()
    paths = []
    for i, seconds in enumerate(DURATIONS, 1):
        source = SCENES / f"{i:02d}.png"
        target = CLIPS / f"{i:02d}.mp4"
        if not source.exists():
            raise FileNotFoundError(source)
        frames = round(seconds * FPS)
        # Tiny camera push across each independently AI-produced or app-art shot.
        run(
            FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
            "-loop", "1", "-framerate", str(FPS), "-i", source,
            "-vf", "zoompan=z='min(zoom+0.00025,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=24,format=yuv420p",
            "-frames:v", str(frames), "-an", "-c:v", "libx264",
            "-preset", "veryfast", "-crf", "22", "-movflags", "+faststart", target,
        )
        paths.append(target)
    manifest = CLIPS / "concat.txt"
    manifest.write_text("".join(f"file '{p.as_posix()}'\n" for p in paths), encoding="utf-8")
    silent = ROOT / "silent.mp4"
    run(FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", manifest, "-c", "copy", silent)
    output = ROOT / "teumpick-demo-30s.mp4"
    run(
        FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
        "-i", silent, "-i", ROOT / "narration.wav", "-i", music,
        "-filter_complex", "[1:a]adelay=300,volume=1.55[v];[2:a]volume=0.65[m];[v][m]amix=inputs=2:duration=longest:dropout_transition=0,alimiter=limit=0.95[a]",
        "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        "-t", "30", "-movflags", "+faststart", output,
    )
    silent.unlink(missing_ok=True)
    print(f"Built {output}")


if __name__ == "__main__":
    main()
