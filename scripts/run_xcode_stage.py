#!/usr/bin/env python3
"""Fuehrt Xcode-Schritte mit sichtbarem Log, Heartbeats und sauberem Timeout aus.

Beispiel:
  python3 scripts/run_xcode_stage.py resolve 360 xcodebuild -resolvePackageDependencies ...
"""
from __future__ import annotations

import datetime
import os
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path


def main() -> int:
    if len(sys.argv) < 5:
        print("Usage: run_xcode_stage.py <stage> <timeout_seconds> <command> [args ...]", file=sys.stderr)
        return 2

    stage, seconds_str, *command = sys.argv[1:]
    try:
        max_seconds = int(seconds_str)
    except ValueError:
        print("timeout_seconds must be an integer", file=sys.stderr)
        return 2

    log_dir = Path(os.environ.get("RUNNER_TEMP", "/tmp"))
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / ("stepgo-ios-" + stage + ".log")
    started = time.monotonic()
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    header = f"StepGo City | phase={stage} | UTC={now} | timeout={max_seconds}s | cmd={command!r}\n"
    print(header, flush=True)

    with open(log_file, "w", encoding="utf-8", errors="replace") as log:
        log.write(header)
        log.flush()

        process = subprocess.Popen(
            command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, errors="replace", bufsize=1, start_new_session=True
        )
        output_lines = [0]

        def read_output() -> None:
            assert process.stdout is not None
            for line in process.stdout:
                log.write(line)
                log.flush()
                print(line, end="", flush=True)
                output_lines[0] += 1

        reader = threading.Thread(target=read_output, daemon=True)
        reader.start()
        timed_out = False
        while process.poll() is None:
            elapsed = time.monotonic() - started
            if elapsed > max_seconds:
                timed_out = True
                message = f"\nERROR: {stage} exceeded {max_seconds} seconds. Stopping Xcode.\n"
                print(message, flush=True)
                log.write(message)
                log.flush()
                try:
                    os.killpg(process.pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
                try:
                    process.wait(timeout=8)
                except subprocess.TimeoutExpired:
                    try:
                        os.killpg(process.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                break
            print(f"::notice::StepGo {stage}: {int(elapsed)}s, {output_lines[0]} log lines", flush=True)
            time.sleep(min(20, max(1, max_seconds - elapsed)))

        try:
            return_code = process.wait(timeout=12)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()
            return_code = 124

        reader.join(timeout=8)
        duration = int(time.monotonic() - started)
        summary = (
            f"\nStepGo stage={stage} finished after {duration}s, "
            f"code={return_code}, timeout={timed_out}, lines={output_lines[0]}\n"
        )
        print(summary, flush=True)
        log.write(summary)
        if timed_out:
            return 124
        return return_code


if __name__ == "__main__":
    raise SystemExit(main())
