"""Reject unresolved merge markers in tracked and unignored repository files."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
MARKER = re.compile(r"^(?:<{7} .+|={7}|>{7} .+)$")


def main():
    paths = subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=ROOT,
    ).decode("utf-8").split("\0")
    failures = []
    for name in sorted(set(paths)):
        path = ROOT / name
        if not name or not path.is_file():
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for line_number, line in enumerate(content.splitlines(), 1):
            if MARKER.fullmatch(line):
                failures.append(f"{name}:{line_number}: unresolved merge marker")
    if failures:
        print("\n".join(failures))
        return 1
    print("No unresolved merge markers found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
