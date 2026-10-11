"""Reject known secret patterns and private config files in Git snapshots.

Prints paths/line numbers only, never the matching credential. This is a guard,
not proof that every possible secret format can be detected.
"""
import argparse
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PATTERNS = (
    re.compile(rb"\bsk-[A-Za-z0-9_-]{20,}"),
    re.compile(rb"\bsb_secret_[A-Za-z0-9_-]{16,}"),
    re.compile(rb"\bgh[pousr]_[A-Za-z0-9]{30,}"),
    re.compile(rb"\bgithub_pat_[A-Za-z0-9_]{30,}"),
    re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(rb"api\.render\.com/deploy/[^\s\"']+\?key=[A-Za-z0-9_-]{16,}"),
)


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def forbidden(path):
    name = Path(path).name.lower()
    return name == "account.txt" or (name.startswith(".env") and name != ".env.example")


def inspect(path, content, snapshot):
    findings = []
    if forbidden(path):
        findings.append(f"{snapshot}:{path}: private config file must not be tracked")
    if b"\0" not in content:
        for number, line in enumerate(content.splitlines(), 1):
            if any(pattern.search(line) for pattern in PATTERNS):
                findings.append(f"{snapshot}:{path}:{number}: possible credential")
    return findings


def scan(*, staged=False, history=False, working_tree=False):
    findings = []
    if working_tree:
        names = git("ls-files", "--cached", "--others", "--exclude-standard", "-z").decode().split("\0")
        for name in sorted(set(filter(None, names))):
            path = ROOT / name
            if path.is_file():
                findings.extend(inspect(name, path.read_bytes(), "working-tree"))
    else:
        names = git("ls-files", "-z").decode().split("\0")
        for name in filter(None, names):
            findings.extend(inspect(name, git("show", f":{name}"), "index"))
    if history:
        for commit in git("rev-list", "--all").decode().splitlines():
            names = git("ls-tree", "-r", "--name-only", "-z", commit).decode().split("\0")
            for name in filter(None, names):
                findings.extend(inspect(name, git("show", f"{commit}:{name}"), commit[:12]))
    return sorted(set(findings))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--staged", action="store_true", help="Scan the index (default)")
    parser.add_argument("--history", action="store_true", help="Also scan all local commit snapshots")
    parser.add_argument("--working-tree", action="store_true", help="Scan non-ignored local files before staging")
    args = parser.parse_args()
    findings = scan(staged=args.staged, history=args.history, working_tree=args.working_tree)
    if findings:
        print("Secret guard failed:\n" + "\n".join(findings))
        sys.exit(1)
    print("Secret guard passed: no prohibited config files or known credential patterns found.")
