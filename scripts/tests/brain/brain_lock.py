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
import signal
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


def hold(lockfile):
    """Hold lock until signalled; useful for dispatcher lifetime supervision."""
    fd = _open(lockfile)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        os.close(fd)
        return 75
    sys.stdout.write("LOCK_ACQUIRED\n")
    sys.stdout.flush()
    try:
        while True:
            signal.pause()
    finally:
        fcntl.flock(fd, fcntl.LOCK_UN)
        os.close(fd)


def run_locked(lockfile, argv):
    """Run argv while owning the dispatcher lock; refuse concurrent launch."""
    if not argv:
        sys.stderr.write("brain_lock.py run requires a command\n")
        return 2
    fd = _open(lockfile)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        os.close(fd)
        sys.stderr.write("DISPATCH_LOCK_DENIED: another dispatcher holds the single-host lock\n")
        return 75
    try:
        sys.stdout.write("DISPATCH_LOCK_ACQUIRED\n")
        sys.stdout.flush()
        os.set_inheritable(fd, True)
        env = os.environ.copy()
        env["OC_DISPATCH_LOCK_FD"] = str(fd)
        # Replace this process so dispatcher PID and lock-owner PID are one.
        # SIGKILL then cannot strand a child still mutating without authority.
        os.execvpe(argv[0], argv, env)
        return 127  # unreachable unless exec semantics are violated
    finally:
        fcntl.flock(fd, fcntl.LOCK_UN)
        os.close(fd)


def verify_inherited(lockfile, fd_text):
    """Verify child owns the locked descriptor for this exact lock path."""
    try:
        fd = int(fd_text)
        inherited = os.fstat(fd)
        expected = os.stat(lockfile)
        if (inherited.st_dev, inherited.st_ino) != (expected.st_dev, expected.st_ino):
            raise OSError("inherited descriptor does not match lock path")
        # Same open-file description as parent. This preserves/acquires the
        # exclusive lock on that description for the child's whole lifetime.
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        return 0
    except (OSError, ValueError):
        sys.stderr.write("DISPATCH_LOCK_DENIED: inherited dispatcher lock is invalid\n")
        return 75


def main():
    if len(sys.argv) < 3:
        sys.stderr.write("usage: brain_lock.py <acquire|try|hold|run|verify> <lockfile> [command|fd ...]\n")
        return 2
    cmd, lockfile = sys.argv[1], sys.argv[2]
    if cmd == "acquire":
        return acquire(lockfile, hold=True)
    if cmd == "try":
        return acquire(lockfile, hold=False)
    if cmd == "hold":
        return hold(lockfile)
    if cmd == "run":
        return run_locked(lockfile, sys.argv[3:])
    if cmd == "verify":
        return verify_inherited(lockfile, sys.argv[3] if len(sys.argv) > 3 else "")
    sys.stderr.write("unknown command\n")
    return 2


if __name__ == "__main__":
    sys.exit(main())
