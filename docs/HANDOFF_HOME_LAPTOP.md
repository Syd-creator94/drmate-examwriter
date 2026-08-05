# Как продолжить работу дома на ноутбуке

Проект уже является локальным git-репозиторием. Его можно перенести на другой компьютер двумя способами.

## Вариант 1. Через git bundle

`git bundle` - это один файл, внутри которого лежит весь git-репозиторий с историей коммитов. Его удобно перенести на флешке, через AirDrop, облако или мессенджер.

На домашнем ноутбуке:

```bash
git clone drmate-examwriter.bundle drmate-examwriter
cd drmate-examwriter
```

После этого проект будет обычным git-репозиторием.

## Вариант 2. Через GitHub

Для постоянной синхронизации используйте настроенный приватный remote:

```bash
git clone git@github.com:syd-creator94/drmate-examwriter.git
cd drmate-examwriter
```

Если нужна незамерженная feature-ветка:

```bash
git fetch origin
git switch codex/stabilize-project-foundation
```

## Установка проекта дома

Нужен Python 3.11 или 3.12. Рекомендуемый вариант:

```bash
python3.12 -m venv .venv
. .venv/bin/activate
python -m pip install -e ".[dev,reportlab-pdf]" -c requirements-dev.lock
python -m playwright install chromium
pytest
```

Проверка генерации:

```bash
drmate-examwriter examples/examwriter_sample.rtf --outdir outputs
```

Если Playwright/Chromium на конкретной машине временно не работает, можно проверить парсинг и HTML без PDF:

```bash
drmate-examwriter examples/examwriter_sample.rtf --outdir outputs --no-pdf
```

## Что не переносится специально

В git не сохраняются:

- `.venv/` - локальное Python-окружение;
- `work/` - временные файлы;
- `outputs/*.pdf`, `outputs/*.html`, `outputs/*.json` - сгенерированные результаты;
- кэши Python и pytest.

Это нормально. Дома эти файлы пересоздаются локально.

## Проверка текущей версии

После клонирования проверьте ветку, актуальный коммит и отсутствие локальных
изменений:

```bash
git branch --show-current
git log --oneline -n 10
git status --short
```

Список коммитов в документе намеренно не фиксируется: каноническое состояние
определяется Git-историей и `docs/project/status.md`.
