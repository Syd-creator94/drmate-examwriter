from __future__ import annotations

import re
from pathlib import Path

_IGNORED_DESTINATIONS = {
    "fonttbl",
    "colortbl",
    "datastore",
    "stylesheet",
    "info",
    "pict",
    "object",
    "xmlnstbl",
    "themedata",
    "generator",
}


def read_examwriter_source(path: str | Path) -> str:
    file_path = Path(path)
    data = file_path.read_bytes()
    if file_path.suffix.lower() == ".rtf" or data.lstrip().startswith(b"{\\rtf"):
        return rtf_to_text(data)
    for encoding in ("utf-8-sig", "cp1251", "cp1252"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def rtf_to_text(data: bytes | str) -> str:
    if isinstance(data, bytes):
        probe = data.decode("latin1")
        codepage = _detect_codepage(probe)
        raw = _decode_rtf_bytes(data, codepage)
    else:
        raw = data
        codepage = _detect_codepage(raw)
    text: list[str] = []
    i = 0
    skip_depth = 0
    uc_skip = 1

    while i < len(raw):
        char = raw[i]

        if skip_depth:
            if char == "{":
                skip_depth += 1
            elif char == "}":
                skip_depth -= 1
            i += 1
            continue

        if char == "{":
            destination = _destination_at(raw, i)
            if destination in _IGNORED_DESTINATIONS:
                skip_depth = 1
            i += 1
            continue

        if char == "}":
            i += 1
            continue

        if char != "\\":
            text.append(char)
            i += 1
            continue

        i += 1
        if i >= len(raw):
            break

        escaped = raw[i]
        if escaped in "\\{}":
            text.append(escaped)
            i += 1
            continue

        if escaped == "'":
            hex_value = raw[i + 1 : i + 3]
            if len(hex_value) == 2:
                text.append(bytes.fromhex(hex_value).decode(codepage, errors="replace"))
                i += 3
            else:
                i += 1
            continue

        match = re.match(r"([A-Za-z]+)(-?\d+)? ?", raw[i:])
        if not match:
            symbol = raw[i]
            if symbol == "~":
                text.append(" ")
            i += 1
            continue

        word, argument = match.group(1), match.group(2)
        i += match.end()

        if word in {"par", "line"}:
            text.append("\n")
        elif word == "tab":
            text.append("\t")
        elif word == "emdash":
            text.append("-")
        elif word == "endash":
            text.append("-")
        elif word == "bullet":
            text.append("*")
        elif word == "uc" and argument is not None:
            uc_skip = int(argument)
        elif word == "u" and argument is not None:
            value = int(argument)
            if value < 0:
                value += 65536
            text.append(chr(value))
            i = min(len(raw), i + uc_skip)

    return _clean_text("".join(text))


def _detect_codepage(raw: str) -> str:
    match = re.search(r"\\ansicpg(\d+)", raw)
    if not match:
        return "cp1252"
    codepage = f"cp{match.group(1)}"
    try:
        b"\x20".decode(codepage)
        return codepage
    except LookupError:
        return "cp1252"


def _decode_rtf_bytes(data: bytes, codepage: str) -> str:
    for encoding in ("utf-8", codepage, "latin1"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("latin1", errors="replace")


def _destination_at(raw: str, brace_index: int) -> str | None:
    start = brace_index + 1
    if raw.startswith(r"\*", start):
        start += 2
    if not raw.startswith("\\", start):
        return None
    match = re.match(r"\\([A-Za-z]+)", raw[start:])
    return match.group(1) if match else None


def _clean_text(value: str) -> str:
    value = value.replace("\r", "\n")
    value = re.sub(r"[ \t]+\n", "\n", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()
