# Dr. Mate ExamWriter Prototype

Первый самостоятельный прототип пайплайна для быстрой подготовки русскоязычного офтальмологического заключения из грязного RTF/TXT, который сохраняет ExamWriter/OfficeMate.

## Целевая архитектура

```text
ExamWriter RTF/TXT
  -> dr_mate_adapters.examwriter
  -> dr_mate_core.MedicalRecord
  -> dr_mate_rendering HTML/CSS
  -> Playwright/Chromium PDF
  -> печать
```

### Слои

- `dr_mate_core`: универсальная медицинская модель и нормализации. Этот слой не знает про ExamWriter.
- `dr_mate_adapters.examwriter`: извлечение текста из RTF, эвристический парсинг ExamWriter и перевод в универсальную модель.
- `dr_mate_rendering`: Jinja2-шаблон, CSS для A4 и HTML/PDF-вывод.
- `dr_mate_cli.py`: маленькая CLI-команда для ручного запуска и будущего hot-folder режима.

Такой разрез оставляет место для будущего Dr. Mate: можно добавить новый адаптер источника, не трогая модель, дизайн и PDF.

## Быстрый старт

```bash
python3.12 -m venv .venv
. .venv/bin/activate
python -m pip install -e ".[dev]"
python -m playwright install chromium
drmate-examwriter examples/examwriter_sample.rtf --outdir outputs
pytest
```

Если Chromium еще не установлен, можно проверить парсинг и HTML без PDF:

```bash
drmate-examwriter examples/examwriter_sample.rtf --outdir outputs --no-pdf
```

В ограниченных средах, где Chromium не может стартовать, можно поставить запасной HTML/CSS -> PDF-движок:

```bash
python -m pip install -e ".[fallback-pdf]"
drmate-examwriter examples/examwriter_sample.rtf --outdir outputs --pdf-engine weasyprint
```

Если в среде заблокированы и браузеры, и системные библиотеки WeasyPrint, есть аварийный renderer напрямую из JSON-модели:

```bash
python -m pip install -e ".[reportlab-pdf]"
drmate-examwriter examples/examwriter_sample.rtf --outdir outputs --pdf-engine reportlab
```

## Что уже нормализуется

- `RT`, `Right` -> `OD`; `LT`, `Left` -> `OS`; `Bilateral`, `BI` -> `OU`.
- Даты вида `MM/DD/YYYY` -> `DD.MM.YYYY`.
- `20/20`, `20/25`, `20/40` -> десятичная острота зрения.
- `16"` -> `40 см`.
- Оси форматируются как три цифры: `@ 85` -> `@ 085`, `x 50` -> `x 050`.
- Диоптрии форматируются с двумя знаками: `-4.25 -0.50 x 050`.
- `Dominant eye RT` -> `Доминантный глаз: правый`.
- `OBSERVATIONS` в клинических блоках -> `(заметки)`.
- Семейный анамнез приводится к клиническому виду, например `Myopia Sister` -> `Миопия: у сестры`.
- Одинаковые диагнозы OD/OS объединяются в `OU`.

## Дальнейшие шаги

- Добавить реальные анонимизированные RTF из ExamWriter и расширить адаптер на фактические блоки.
- Подключить `watchdog` для hot-folder режима.
- Добавить локальный FastAPI-сервис, если понадобится интеграция с интерфейсом.
- Позже вынести Dr. Mate UI в React/TypeScript поверх той же модели.

## Документы

- [Технический паспорт прототипа](docs/TECH_PASSPORT.md)
- [Как продолжить работу дома на ноутбуке](docs/HANDOFF_HOME_LAPTOP.md)
# main


## Clinic и CRM · новая визуальная концепция

Интерактивное представление Clinic и CRM на основе актуального Flux, включая дневное и недельное расписание: [исходники и запуск](tools/clinic-stage/README.md). Это самостоятельный фронтенд с вымышленными данными и локальным сохранением. Откройте `tools/clinic-stage/dist/clinic-stage.html` в браузере для просмотра без установки и сети.
