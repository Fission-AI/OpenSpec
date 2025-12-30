#!/usr/bin/env python3
"""
Remove OpenSpec configuration files from a project.

This script deletes the core OpenSpec directory plus integration files for
Codex and project-level agent commands (Claude Code, Cursor, OpenCode, Factory
Droid, Windsurf, Kilo Code, Amazon Q, GitHub Copilot). For AGENTS.md and
CLAUDE.md it removes only the managed OpenSpec block so custom instructions
remain intact. Provide the target project path as the first argument (quotes
are supported for paths that contain spaces). Use --instructions-only to limit
cleanup to AGENTS.md and CLAUDE.md without touching other OpenSpec assets.
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path
from typing import Iterable, Tuple, Literal


def remove_path(target: Path) -> bool:
    """Remove a file or directory if it exists, returning True when deleted."""
    try:
        if not target.exists():
            return False
        if target.is_dir() and not target.is_symlink():
            shutil.rmtree(target)
        else:
            target.unlink()
        return True
    except Exception as exc:  # pragma: no cover - best-effort cleanup
        print(f"Failed to remove {target}: {exc}", file=sys.stderr)
        return False


def remove_many(paths: Iterable[Path]) -> Tuple[int, int]:
    """Attempt to remove multiple paths; return (removed, missing) counts."""
    removed = 0
    missing = 0
    for file_path in paths:
        if remove_path(file_path):
            print(f"Removed {file_path}")
            removed += 1
        else:
            print(f"Skipped (missing): {file_path}")
            missing += 1
    return removed, missing


def build_project_targets(project_root: Path) -> Iterable[Path]:
    """Yield project-scoped paths that should be removed."""
    openspec_dir = project_root / "openspec"
    claude_commands = [
        project_root
        / ".claude"
        / "commands"
        / "openspec"
        / f"{name}.md"
        for name in ("proposal", "apply", "archive")
    ]
    factory_commands = [
        project_root / ".factory" / "commands" / f"openspec-{name}.md"
        for name in ("proposal", "apply", "archive")
    ]
    cursor_commands = [
        project_root / ".cursor" / "commands" / f"openspec-{name}.md"
        for name in ("proposal", "apply", "archive")
    ]
    opencode_commands = [
        project_root / ".opencode" / "commands" / f"openspec-{name}.md"
        for name in ("proposal", "apply", "archive")
    ]
    windsurf_commands = [
        project_root / ".windsurf" / "workflows" / f"openspec-{name}.md"
        for name in ("proposal", "apply", "archive")
    ]
    kilocode_commands = [
        project_root / ".kilocode" / "workflows" / f"openspec-{name}.md"
        for name in ("proposal", "apply", "archive")
    ]
    amazonq_commands = [
        project_root / ".amazonq" / "prompts" / f"openspec-{name}.md"
        for name in ("proposal", "apply", "archive")
    ]
    github_copilot_commands = [
        project_root / ".github" / "prompts" / f"openspec-{name}.prompt.md"
        for name in ("proposal", "apply", "archive")
    ]

    for target in [
        openspec_dir,
        *claude_commands,
        *factory_commands,
        *cursor_commands,
        *opencode_commands,
        *windsurf_commands,
        *kilocode_commands,
        *amazonq_commands,
        *github_copilot_commands,
    ]:
        yield target


def build_codex_targets(prompts_dir: Path) -> Iterable[Path]:
    """Yield Codex prompt files that should be removed."""
    for name in ("proposal", "apply", "archive"):
        yield prompts_dir / f"openspec-{name}.md"


def prune_empty(paths: Iterable[Path]) -> None:
    """Remove empty directories, ignoring errors."""
    for dir_path in paths:
        try:
            if dir_path.exists() and dir_path.is_dir():
                # Check whether directory is empty before removing.
                if not any(dir_path.iterdir()):
                    dir_path.rmdir()
                    print(f"Removed empty directory {dir_path}")
        except Exception as exc:  # pragma: no cover - best-effort cleanup
            print(f"Could not prune {dir_path}: {exc}", file=sys.stderr)


def parse_args(argv: Iterable[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Remove OpenSpec files from a project."
    )
    parser.add_argument(
        "project_path",
        help="Path to the project that contains OpenSpec files.",
    )
    parser.add_argument(
        "--instructions-only",
        action="store_true",
        help="Only remove OpenSpec managed blocks from AGENTS.md and CLAUDE.md.",
    )
    return parser.parse_args(argv)


def strip_managed_block(file_path: Path) -> Literal["missing", "no_marker", "stripped", "deleted", "incomplete"]:
    """Remove the OpenSpec managed block from a file, preserving custom content."""
    if not file_path.exists() or not file_path.is_file():
        return "missing"

    try:
        content = file_path.read_text(encoding="utf-8")
    except OSError as exc:  # pragma: no cover - best-effort cleanup
        print(f"Failed to read {file_path}: {exc}", file=sys.stderr)
        return "missing"

    start_marker = "<!-- OPENSPEC:START -->"
    end_marker = "<!-- OPENSPEC:END -->"
    if start_marker not in content or end_marker not in content:
        return "no_marker"

    lines = content.splitlines()
    kept_lines = []
    inside = False
    removed = False

    for line in lines:
        start = start_marker in line
        end = end_marker in line

        if start and end:
            removed = True
            inside = False
            continue

        if start:
            inside = True
            removed = True
            continue

        if inside:
            if end:
                inside = False
            continue

        if end:
            # Encountered end marker without matching start.
            return "incomplete"

        kept_lines.append(line)

    if inside:
        # Unmatched start marker; don't modify the file.
        return "incomplete"

    if not removed:
        return "no_marker"

    # Trim leading/trailing blank lines introduced by removal.
    while kept_lines and not kept_lines[0].strip():
        kept_lines.pop(0)
    while kept_lines and not kept_lines[-1].strip():
        kept_lines.pop()

    if kept_lines:
        new_content = "\n".join(kept_lines) + "\n"
        try:
            file_path.write_text(new_content, encoding="utf-8")
        except OSError as exc:  # pragma: no cover - best-effort cleanup
            print(f"Failed to write {file_path}: {exc}", file=sys.stderr)
            return "incomplete"
        return "stripped"

    try:
        file_path.unlink()
    except OSError as exc:  # pragma: no cover - best-effort cleanup
        print(f"Failed to delete {file_path}: {exc}", file=sys.stderr)
        return "incomplete"
    return "deleted"


def cleanup_instruction_file(file_path: Path) -> Literal["missing", "no_marker", "stripped", "deleted", "incomplete"]:
    """Surgically remove the managed block from instruction files."""
    result = strip_managed_block(file_path)
    if result == "missing":
        print(f"Skipped (missing): {file_path}")
    elif result == "no_marker":
        print(f"No OpenSpec block found in {file_path}")
    elif result == "stripped":
        print(f"Removed OpenSpec block from {file_path}")
    elif result == "deleted":
        print(f"Removed OpenSpec block and deleted empty file {file_path}")
    elif result == "incomplete":
        print(f"Could not fully remove block in {file_path}; markers may be unmatched.")
    return result


def main(argv: Iterable[str]) -> int:
    args = parse_args(argv)
    project_root = Path(args.project_path).expanduser().resolve()

    if not project_root.exists():
        print(f"Project path does not exist: {project_root}", file=sys.stderr)
        return 1
    if not project_root.is_dir():
        print(f"Project path is not a directory: {project_root}", file=sys.stderr)
        return 1

    print(f"Removing OpenSpec files from {project_root}")

    instruction_results = [
        cleanup_instruction_file(project_root / "AGENTS.md"),
        cleanup_instruction_file(project_root / "CLAUDE.md"),
    ]
    stripped_count = sum(result in {"stripped", "deleted"} for result in instruction_results)

    if args.instructions_only:
        print(f"Cleanup complete. Updated {stripped_count} instruction file(s).")
        return 0

    project_removed, _ = remove_many(build_project_targets(project_root))

    # Clean up Codex prompt files
    codex_home = Path(os.environ.get("CODEX_HOME") or Path.home() / ".codex")
    prompts_dir = codex_home / "prompts"
    codex_removed, _ = remove_many(build_codex_targets(prompts_dir))

    # Attempt to prune empty directories created for integrations.
    prune_empty(
        [
            prompts_dir,
            project_root / ".claude" / "commands" / "openspec",
            project_root / ".claude" / "commands",
            project_root / ".claude",
            project_root / ".factory" / "commands",
            project_root / ".factory",
            project_root / ".cursor" / "commands",
            project_root / ".cursor",
            project_root / ".opencode" / "commands",
            project_root / ".opencode",
            project_root / ".windsurf" / "workflows",
            project_root / ".windsurf",
            project_root / ".kilocode" / "workflows",
            project_root / ".kilocode",
            project_root / ".amazonq" / "prompts",
            project_root / ".amazonq",
            project_root / ".github" / "prompts",
        ]
    )

    print(
        f"Cleanup complete. Removed {project_removed} project item(s), "
        f"{codex_removed} Codex item(s), and updated {stripped_count} instruction file(s)."
    )
    print("You may manually remove any remaining empty folders if desired.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
