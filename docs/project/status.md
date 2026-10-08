# Статус Dr. Mate

Обновлено: 8 октября 2026 года (единое приватное приложение опубликовано).


## Единое приложение — 08.10.2026

- `USER_CONFIRMED`: реализован план единого owner-private Dr. Mate на существующем
  Site Flux; договоры и границы: [канонический ADR-0016](</Users/artem_m/Documents/Lens Order Management/docs/adr/0016-unified-private-platform.md>).
- `CODE_VERIFIED`: Sites v70 опубликована на
  [прежнем адресе Flux](https://lens-order-management.afarbitnik.chatgpt.site).
  Оболочка, настоящий Orders, нынешний Stage UI Clinic/CRM с серверным хранением,
  общий реестр пациентов и Follow-up работают на одном origin. Новые приёмы
  начинаются с пустых наблюдений, завершённые записи неизменяемы, исправления
  имеют причину/автора. Автоматический перенос измерений в заказ не добавлен.
- `CODE_VERIFIED`: Knowledge использует проверенный экспорт настоящего каталога
  0.2.0 с версиями и источниками. Python/YAML в этом репозитории остаются
  источником каталога; пациентские сведения в Knowledge не передаются.
- Проверки реализации Sites: TypeScript, build, 184 теста; синтетическая браузерная
  проверка Clinic/CRM/файлов/переходов/Knowledge. Восстановление резервной копии
  выполнено отдельно; все 27 прежних таблиц с рабочими данными Flux сохранились.
- `CODE_VERIFIED`: Safari Web App Dr. Mate установлен в Applications и Dock;
  самостоятельный запуск, вход, навигация и перезапуск проверены. PDF отчёта Flux открыт в macOS Preview; реальные клинические файлы
  в рабочем web app остаются ручной приёмкой. Старые сайты/прототипы сохранены.
- Исходники выпуска: `/Users/artem_m/Documents/Lens Order Management/output/dr-mate-platform-20261008/source`.
  Полный протокол выпуска: [статус Flux](</Users/artem_m/Documents/Lens Order Management/docs/project/status.md>).
  Операция MIG не начата; роли сотрудников и clinical provenance в Orders — отдельно.

## Реализация сворачивания Clinic — 15.09.2026

- `CODE_VERIFIED`: в `outputs/clinic-site/workspace.js` раскрытые карточки имеют
  явную обратную кнопку вместо оставшейся кнопки раскрытия. Возврат в обзор
  сохраняет черновики, закрепления, предметный заголовок и цветовое семейство.
- `CODE_VERIFIED`: «Итог приёма» возвращается как компактная карточка;
  `revision.js` включает её в компоновку обзора. Полоса прокрутки нейтральная,
  соответствует токенам Orders. Формы кнопок и базовые материалы сохранены.
- В отдельном локальном `src/dr_mate_clinic_prototype/static/app.mjs` уточнены
  подпись, подсказка и `aria-expanded` уже существующего сворачивания.
- Проверки: статический Clinic пересобран; 17 UI-тестов в jsdom и 6 тестов
  локального workspace проходят. Синтаксис локального приложения проверен.
  Браузерная геометрия не проверялась; общая клиническая интеграция не добавлена.
- Коммит статического Clinic: `266f6c612cfca4ec7c8115e10bfa712a082b28c4`
  (отдельный репозиторий `outputs/clinic-site`). `CODE_VERIFIED`: после явного
  разрешения пользователя опубликована Sites v7; deployment
  `appgdep_6aa94eca40e48191bccb1c54280b77bd` завершён успешно.
  [Живой Clinic](https://dr-mate-clinic-workspace.afarbitnik.chatgpt.site)
  сохраняет доступ только владельца.

## Сверка общих данных и рабочего пространства — 15.09.2026

- `USER_CONFIRMED`: модули Dr. Mate должны использовать одни и те же данные там,
  где применимо; конкретный пример — манифестная рефракция Clinic в Orders.
  Подтверждены обратное сворачивание карточек в Clinic/Orders, преемственность
  заголовков/цветов и сохранение принятой стилистики. Клинический контракт
  и точная общая палитра ещё не приняты.
- `USER_CONFIRMED`: основание заказа — исследование, по которому выполнен
  его подбор. Ежегодные неизменённые повторы сохраняют прежнее основание;
  новый подбор после washout использует новое исследование даже при одинаковых
  цифрах. Это принятое правило; связь с источником в коде ещё не реализована.
- `CODE_VERIFIED`: `src/dr_mate_core/models.py`, локальный
  `src/dr_mate_clinic_prototype/static/model.mjs` и статический
  `outputs/clinic-site` используют разные представления данных. Локальный
  прототип сохраняет состояние в sessionStorage; статический — в localStorage.
  Проверенные пути не предоставляют рабочий versioned observation API для Orders.
- `CODE_VERIFIED`: локальный workspace возвращает сохранённое состояние;
  статический Clinic имеет частичное сворачивание через `data-mode="overview"`.
  Наличие одного механизма не доказывает единое поведение всех карточек.
- Узкая проверка: 6 тестов `tests/clinic_prototype/workspace.test.mjs` и
  16 тестов `outputs/clinic-site/test.mjs` проходят. Последние проверяют
  существующий build в jsdom, без браузерной геометрии; он не пересобирался.
  Полная сборка, эксплуатационная валидация и новая интеграция не проверялись.


## Проверенный UX-прототип Clinic — 10.09.2026

- `CODE_VERIFIED`: добавлен отдельный `src/dr_mate_clinic_prototype`, доступный
  локально на `127.0.0.1:8766`. Он демонстрирует синтетическую карту пациента,
  текущую коррекцию и её историю, измерения, заключение и локальный follow-up.
- `CODE_VERIFIED`: реализованы плотная Mechanicus-компоновка без ромба,
  управляемый фокус, выбор осмотра отдельно от открытия, параллельный просмотр
  осмотров/учебных материалов, раскрытие с возвратом, светлая/тёмная/авто темы.
- `CODE_VERIFIED`: поиск внутри учебной карты находит осмотры и встроенные
  материалы, включая синонимы `перерыв`/`washout` и `ОКТ`/`OCT`. Flex-параметры
  относятся к конкретной коррекции и глазу; исторические снимки сохраняются.
- `CODE_VERIFIED`: профильные Node-проверки — `12 passed`; весь Python-набор —
  `41 passed`; Ruff, mypy и сборка прошли. Wheel содержит ресурсы прототипа.
  Выбор, фокус, сравнение, поиск, Flex и темы проверены в браузере Codex.
- `CODE_VERIFIED`: клинические данные прототипа сохраняются лишь как учебное
  состояние вкладки (`sessionStorage`), предпочтение темы — в `localStorage`.
  Сервер не принимает записей; API runtime, реальные приборы, реестр пациентов,
  OCR/PDF-архив, общий Follow-up и clinical decision support не подключены.
- Объём, сценарий запуска и ограничения проверок:
  [Clinic UX prototype](../../tools/clinic-prototype/README.md).

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
- `USER_CONFIRMED`: принята платформенная архитектура Knowledge + private Clinic
  runtime с отдельными CRM, Orders и Connect; Knowledge не принимает patient
  payload.
- `USER_CONFIRMED`: CRM администратора и shadow-mode
  `orthok_washout_assessment` включены в дорожную карту, но не реализованы.
- `DECIDED`: automatic product/parameter selection остаётся вне MVP; versioned
  clinical observations и protocol runs закладываются как будущий фундамент.
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
- `CODE_VERIFIED`: private clinical runtime, patient persistence, CRM,
  knowledge-package manifest и protocol execution в текущем коде отсутствуют.
- `CODE_VERIFIED`: добавлен воспроизводимый macOS launcher, который проверяет
  локальный Knowledge health endpoint, при необходимости запускает read-only
  справочник и открывает Orders, Knowledge и живую проектную доску. Shell,
  Info.plist и ad-hoc code signature собранного приложения проверены; launcher
  не содержит patient data.
- `UNKNOWN`: permission matrix, retention, deployment topology и clinical
  validation washout assessment.

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
- `CODE_VERIFIED`: commit `dd18596` опубликован через SSH в `origin/codex/stabilize-project-foundation`.
- `UNKNOWN`: результат удалённого GitHub Actions workflow не проверен, потому что GitHub CLI требует повторной авторизации.
- Переименование GitHub-репозитория и merge в `main` в текущую границу изменений не входят.

## Следующее точное действие

Проверить GitHub Actions и выполнить review/merge feature-ветки, затем принять
минимальный privacy/authorization contract приватного Clinic runtime и
спроектировать knowledge-package manifest. Первый protocol runner создавать
только после отдельного preview clinical observation schema и review критериев
`orthok_washout_assessment`.
