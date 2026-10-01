"""Save local settings without displaying their contents."""

from pathlib import Path


def save_settings(path: Path, values: dict[str, str]) -> None:
    existing = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    output = []
    remaining = dict(values)
    for line in existing:
        key, separator, _ = line.partition("=")
        if separator and key.strip() in values:
            if key.strip() in remaining:
                output.append(f"{key.strip()}={remaining.pop(key.strip())}")
            continue
        output.append(line)
    output.extend(f"{key}={value}" for key, value in remaining.items())
    path.touch(mode=0o600, exist_ok=True)
    path.chmod(0o600)
    path.write_text("\n".join(output).rstrip() + "\n", encoding="utf-8")
