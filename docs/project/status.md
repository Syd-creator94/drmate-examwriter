# Статус Dr. Mate

Обновлено: 5 августа 2026 года.

## Текущее состояние

- `CODE_VERIFIED`: repository context policy разделяет лёгкий маршрут для
  обычной разработки и строгий контур для решений/ADR/рисковых границ; обычная
  работа больше не требует чтения всего контекста и отдельного context preview.
- `CODE_VERIFIED`: канонический рабочий репозиторий расположен в `Documents/Codex/projects/dr-mate`.
- `CODE_VERIFIED`: перенос выполнен с чистого рабочего дерева от коммита `5f7f89aa987f1c0531cec8cb2eec771b97f2cf70`.
- `CODE_VERIFIED`: локальная Git-история и существующий remote `git@github.com:syd-creator94/drmate-examwriter.git` сохранены.
- `CODE_VERIFIED`: ранний прототип `2026-06-24/new-chat` оставлен без изменений.
- `CODE_VERIFIED`: текущий код реализует ранний ExamWriter -> MedicalRecord -> HTML/PDF-прототип.
- `CODE_VERIFIED`: после переноса исходный набор тестов прошёл полностью — `6 passed`.
- `DECIDED`: база контактных линз включена в направление Dr. Mate как отдельная ограниченная функция.
- `DECIDED`: X-Cel будет первым пилотным источником каталога.
- `DECIDED`: рецензируемые YAML-записи являются источником каталога и rules; Pydantic является исполняемым контрактом схемы.
- `DECIDED`: matching использует декларативные правила с состояниями `true`, `false`, `unknown`, без скрытого скоринга и произвольного кода.
- `CODE_VERIFIED`: создан модуль `src/dr_mate_contact_lenses` с моделями, загрузчиком, проверкой ссылок на источники и matching engine.
- `CODE_VERIFIED`: каталог X-Cel Custom Soft версии `0.2.0` содержит 16 продуктовых записей: 14 `source_verified` и 2 `draft`.
- `CODE_VERIFIED`: source manifest X-Cel версии `0.2.0` содержит девять versioned source revisions.
- `CODE_VERIFIED`: PRS и ARC имеют отдельные активные rulesets `0.1.0`; остальные модели остаются параметрическими карточками без выдуманных fitting rules.
- `CODE_VERIFIED`: схема различает непрерывные диапазоны, дискретные значения и конфликтующие source claims.
- `CODE_VERIFIED`: matching запрещён для `draft`-продуктов.
- `CODE_VERIFIED`: стартовая линза `8.7/15.0` отделена от K-таблиц, которые валидируются как `reference_mapping`.
- `CODE_VERIFIED`: ARC содержит опубликованные правила показаний, диапазонов, стартовой BC/толщины, посадки и troubleshooting.
- `CODE_VERIFIED`: `ContactLensCatalog` загружает и валидирует каталог, выполняет read-only поиск, фильтрацию, получение карточки и сравнение моделей без пациентской записи.
- `CODE_VERIFIED`: результаты справочника сохраняют source revisions, lifecycle status, наличие ruleset, конфликты параметров и safety disclaimer.
- `CODE_VERIFIED`: реализован локальный русскоязычный экран справочника с поиском, фильтрами, карточкой модели, источниками и сравнением до четырёх моделей.
- `CODE_VERIFIED`: отдельный `/api/v1` отдаёт метаданные, список, карточку и сравнение и явно декларирует отсутствие приёма/сохранения пациентских данных и clinical matching.
- `CODE_VERIFIED`: интеграционное событие `drmate:contact-lens-selection` передаёт только устойчивую ссылку на продукт, каталог, запись и ruleset и создаёт ограниченную точку расширения для будущей медкарты.
- `CODE_VERIFIED`: CSS-контракт `[hidden]` явно скрывает завершившиеся loading, detail, empty и toast states; регрессионная проверка включена в web-тесты.
- `CODE_VERIFIED`: wheel включает source manifest, 16 product YAML и два ruleset; установленный wheel загружает каталог из `share/drmate/knowledge/contact_lenses` вне рабочего репозитория.
- `CODE_VERIFIED`: добавлен GitHub Actions CI для Python 3.11/3.12 с pytest, Ruff, mypy, compileall, JavaScript syntax check, ReportLab smoke, build и проверкой содержимого wheel.
- `CODE_VERIFIED`: development/CI dependencies зафиксированы constraints-файлом `requirements-dev.lock`.
- `CODE_VERIFIED`: профильный набор тестов каталога после реализации интерактивного экрана — `34 passed`.
- `CODE_VERIFIED`: полный набор проекта после реализации интерактивного экрана — `40 passed`.

## Не реализовано

- `CODE_VERIFIED`: в текущей `MedicalRecord` нет специализированных сущностей каталога контактных линз или результатов matching.
- `CODE_VERIFIED`: встраивание справочника в медкарту, контракт передачи `MatchContext` и сохранение выбранной ссылки в `MedicalRecord` отсутствуют.
- `CODE_VERIFIED`: автоматизированное обновление источников отсутствует.
- `UNKNOWN`: актуальные официальные параметры Horizon Toric и IdealSoft Spherical; обе карточки остаются `draft`.
- `UNKNOWN`: какая из несовпадающих публикаций Tri-Curve описывает текущую заказываемую номенклатуру.
- `DECIDED`: взвешенное ранжирование и единый процент совместимости намеренно не реализуются в MVP.
- `DEFERRED`: противопоказания не кодируются до проверки package inserts.
- `OUT_OF_SCOPE`: доступность и регистрационный статус в Казахстане.
- `UNKNOWN`: эксплуатационная и клиническая валидация существующего ExamWriter-прототипа на реальных обезличенных данных.

## Выполненная проверка

- Проверены наличие исходного и отсутствие конфликтующего целевого пути до переноса.
- Проверены чистота рабочего дерева, Git HEAD и remote до переноса.
- После переноса `git rev-parse --show-toplevel` вернул новый канонический путь.
- После переноса повторно проверены Git HEAD и remote.
- Команда `.venv/bin/python -m pytest` завершилась успешно: `6 passed in 0.17s`.
- Проверено сохранение раннего прототипа и отсутствие старого пути перемещённого репозитория.
- Источники PRS проверены по PDF-тексту и визуальному рендеру страниц; SHA-256 сохранены в source manifest.
- YAML source manifest, продукт и ruleset загружены через Pydantic и проверены на непротиворечивые source revision IDs.
- Команда `.venv/bin/python -m pytest` после реализации каталога завершилась успешно: `15 passed`.
- Тестами покрыты подходящий случай, отсутствие входных данных, отсутствие опубликованного показания, выход силы за диапазон, 74% material adjustment и критерии посадки.
- Все 16 YAML-карточек X-Cel загружены через Pydantic и проверены на ссылки только на известные source revision IDs.
- Проверены дискретные параметры XRP, версия Aphakic 2024, неразрешённые конфликты Tri-Curve и блокировка matching для `draft`.
- Проверены стартовые решения и troubleshooting ARC; профильный набор завершился успешно: `17 passed`.
- Полный набор `.venv/bin/python -m pytest -q` завершился успешно: `23 passed`.
- Девять тестов read-only API покрывают загрузку, сортировку, текстовый поиск, фильтры, сравнение, provenance, `draft`, конфликты и явные ошибки неизвестных ID.
- Профильный набор `tests/contact_lenses` после реализации API завершился успешно: `26 passed`.
- Полный набор `.venv/bin/python -m pytest -q` после реализации API завершился успешно: `32 passed`.
- Smoke-проверка программного API вернула четыре Horizon-модели по сочетанию brand + presbyopia и сравнительную матрицу PRS/ARC.
- После editable-установки проверен самостоятельный импорт `dr_mate_contact_lenses` вне pytest.
- Реестр артефактов проверен на существующие пути, уникальные ID и корректные зависимости.
- Восемь web-тестов покрывают статические ресурсы, API metadata/search/detail/compare, явные ошибки, `HEAD`, security headers и реальный локальный HTTP-запрос.
- Профильный набор `tests/contact_lenses` после реализации интерактивного экрана завершился успешно: `34 passed`.
- Полный набор `.venv/bin/python -m pytest -q` после реализации интерактивного экрана завершился успешно: `40 passed`.
- JavaScript-файл интерфейса прошёл `node --check`; Python-модуль — `compileall`.
- После стабилизации интерфейса полный набор `.venv/bin/python -m pytest -q` повторно завершился успешно: `40 passed`.
- `ruff check src tests` завершился без замечаний; `mypy src` проверил 18 source-файлов без ошибок.
- ReportLab smoke создал JSON, HTML и одностраничный PDF из демонстрационного ExamWriter RTF.
- `python -m build --no-isolation` собрал sdist и wheel; wheel содержит 16 product YAML, два ruleset и один source manifest.
- Wheel установлен во временное окружение и вне репозитория загрузил каталог `0.2.0` из 16 моделей.
- `pip check` не обнаружил нарушенных зависимостей; GitHub workflow успешно разобран как YAML.

## Контроль версий

- `CODE_VERIFIED`: стабилизация выполняется в ветке `codex/stabilize-project-foundation`, отдельно от `main`.
- `UNKNOWN`: GitHub CLI требует повторной авторизации; возможность push через настроенный SSH remote проверяется при публикации ветки.
- Переименование GitHub-репозитория и merge в `main` в текущую границу изменений не входят.

## Следующее точное действие

Опубликовать и проверить feature-ветку, затем собрать 5–10 обезличенных реальных ExamWriter RTF и для каждого зафиксировать ожидаемый JSON fixture. Контракт встраивания `MatchContext` по-прежнему требует отдельного change preview и ADR.
