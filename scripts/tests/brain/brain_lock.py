#!/usr/bin/env python3
"""BrainV2 single-host dispatcher lock (T5 MVP authority boundary).

macOS lacks flock(1) (util-linux only), so we use a portable, kernel-backed
advisory lock via fcntl.flock. The lock is held for the lifetime of the holding
process and released automatically on process death (kernel-managed), which is
safer than a PID-file (shlock) that can go stale.

Usage:
  brain_lock.py acquire <lockfile>   # exits 0 if acquired (holds while running
                                     # until stdin closes / signal), 1 if held.
  brain_lock.py try <lockfile>       # exits 0 if lock is free-and-acquired then
                                     # immediately released, 1 if currently held.
This helper is intentionally tiny so oc-dispatch can wrap it.
"""
import fcntl
import os
import sys
import time


def _open(lockfile):
    fd = os.open(lockfile, os.O_CREAT | os.O_RDWR, 0o644)
    return fd


def acquire(lockfile, hold=True):
    fd = _open(lockfile)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        return 1  # already held by another process
    os.write(fd, str(os.getpid()).encode())
    if not hold:
        fcntl.flock(fd, fcntl.LOCK_UN)
        os.close(fd)
        return 0
    # Hold until this process is asked to stop (stdin EOF) or killed.
    try:
        sys.stdout.write("LOCK_ACQUIRED\n")
        sys.stdout.flush()
        while True:
            line = sys.stdin.readline()
            if not line:
                break
            time.sleep(0.05)
    finally:
        fcntl.flock(fd, fcntl.LOCK_UN)
        os.close(fd)
    return 0


def main():
    if len(sys.argv) < 3:
        sys.stderr.write("usage: brain_lock.py <acquire|try> <lockfile>\n")
        return 2
    cmd, lockfile = sys.argv[1], sys.argv[2]
    if cmd == "acquire":
        return acquire(lockfile, hold=True)
    if cmd == "try":
        return acquire(lockfile, hold=False)
    sys.stderr.write("unknown command\n")
    return 2


if __name__ == "__main__":
    sys.exit(main())
