from pathlib import Path

from deep_translator import GoogleTranslator


def main() -> None:
    docs_dir = Path(__file__).resolve().parents[1] / "docs"
    files = sorted(docs_dir.glob("*.md"))
    translator = GoogleTranslator(source="en", target="uk")

    for file_path in files:
        text = file_path.read_text(encoding="utf-8")
        lines = text.splitlines()
        output: list[str] = []
        in_code_block = False

        for line in lines:
            stripped = line.strip()

            if stripped.startswith("```"):
                in_code_block = not in_code_block
                output.append(line)
                continue

            if in_code_block or stripped == "":
                output.append(line)
                continue

            try:
                translated = translator.translate(line)
                output.append(translated if translated else line)
            except Exception:
                output.append(line)

        file_path.write_text(
            "\n".join(output) + ("\n" if text.endswith("\n") else ""),
            encoding="utf-8",
        )
        print(f"Translated {file_path.name}")


if __name__ == "__main__":
    main()
