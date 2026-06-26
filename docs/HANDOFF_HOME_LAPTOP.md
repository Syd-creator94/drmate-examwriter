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

## Вариант 2. Через GitHub/GitLab

Если хотите синхронизировать работу между компьютерами постоянно, лучше создать пустой приватный репозиторий на GitHub или GitLab и отправить туда текущий проект:

```bash
git remote add origin <URL_ВАШЕГО_РЕПОЗИТОРИЯ>
git push -u origin main
```

На домашнем ноутбуке:

```bash
git clone <URL_ВАШЕГО_РЕПОЗИТОРИЯ>
cd <ПАПКА_ПРОЕКТА>
```

## Установка проекта дома

Нужен Python 3.11 или 3.12. Рекомендуемый вариант:

```bash
python3.12 -m venv .venv
. .venv/bin/activate
python -m pip install -e ".[dev]"
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

## Текущие коммиты

- `f9b1d6b Initial ExamWriter medical record pipeline`
- `254c09f Add prototype technical passport`
