# Dr. Mate

Локальный прототип поддержки работы врача-офтальмолога. Репозиторий содержит
два самостоятельных контура:

1. преобразование ExamWriter/OfficeMate RTF/TXT в нормализованную медицинскую
   запись и русскоязычное HTML/PDF-заключение;
2. проверяемый справочник контактных линз X-Cel с поиском, сравнением,
   provenance и экспериментальным объяснимым matching engine.

Проект находится на стадии прототипа. Он не является медицинской
информационной системой, не выполняет автоматическое назначение линз и пока не
валидирован для клинической эксплуатации на реальных данных.

## Архитектура

```text
ExamWriter RTF/TXT
  -> dr_mate_adapters.examwriter
  -> dr_mate_core.MedicalRecord
  -> dr_mate_rendering HTML/PDF

Official manufacturer sources
  -> reviewed YAML + provenance
  -> dr_mate_contact_lenses catalog and rules
  -> read-only API + local reference UI
```

Matching для Flexlens PRS и ARC существует как отдельный библиотечный контур.
Он не подключён к MedicalRecord или web API и не должен использоваться как
рецепт или подтверждение клинической пригодности.

## Установка для разработки

Поддерживаются Python 3.11 и 3.12.

```bash
python3.12 -m venv .venv
. .venv/bin/activate
python -m pip install -e ".[dev,reportlab-pdf]" -c requirements-dev.lock
```

Для основного HTML/CSS -> PDF пути дополнительно нужен Chromium:

```bash
python -m playwright install chromium
```

## Запуск ExamWriter-конвейера

```bash
drmate-examwriter examples/examwriter_sample.rtf --outdir outputs --no-pdf
```

PDF через основной Playwright engine:

```bash
drmate-examwriter examples/examwriter_sample.rtf --outdir outputs
```

PDF через автономный fallback:

```bash
drmate-examwriter examples/examwriter_sample.rtf \
  --outdir outputs \
  --pdf-engine reportlab
```

WeasyPrint остаётся дополнительным вариантом и требует системные библиотеки,
описанные в его документации.

## Запуск справочника контактных линз

```bash
drmate-lenses
```

По умолчанию открывается локальный read-only интерфейс на
`http://127.0.0.1:8765/`. Он не принимает и не сохраняет пациентские данные.

## Проверки

```bash
pytest
ruff check src tests
mypy src
python -m compileall -q src
node --check src/dr_mate_contact_lenses/web_static/app.js
python -m build
```

Те же проверки выполняет GitHub Actions для Python 3.11 и 3.12.

## Структура

- `src/dr_mate_core` — универсальные Pydantic-модели и нормализация;
- `src/dr_mate_adapters/examwriter` — чтение и эвристический разбор RTF/TXT;
- `src/dr_mate_rendering` — HTML и PDF renderers;
- `src/dr_mate_contact_lenses` — схема каталога, loader, matcher, API и UI;
- `knowledge/contact_lenses` — рецензируемые YAML-источники, продукты и rules;
- `tests` — тесты ExamWriter, rendering, каталога, matching и web API;
- `docs/project/status.md` — подтверждённое текущее состояние и ограничения.

## Границы безопасности

- Кандидат контактной линзы не является назначением.
- Отсутствующие клинические значения не угадываются.
- Факты производителя, клинические правила и результаты алгоритма сохраняются
  как разные типы данных.
- Идентифицируемые данные пациентов, credentials и частные клинические экспорты
  не должны попадать в Git.
- Перед работой с реальными пациентскими данными требуются отдельные решения по
  доступу, хранению, шифрованию, удалению и аудиту.

## Документация

- [Обзор проекта](docs/project/overview.md)
- [Текущий статус](docs/project/status.md)
- [Функция каталога контактных линз](docs/features/contact-lens-knowledge-base.md)
- [ADR каталога и matching](docs/adr/0001-contact-lens-knowledge-and-matching.md)
- [Технический паспорт ExamWriter-прототипа](docs/TECH_PASSPORT.md)
