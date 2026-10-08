---
title: "Knowledge packages and private clinical runtime"
status: "accepted"
date: "2026-08-05"
supersedes: "none"
superseded_by: "ADR-0003 (partial: Follow-up module ownership only)"
---

# ADR: пакеты знаний и приватный клинический runtime

## Контекст

Dr. Mate уже разделяет manufacturer facts, clinician-authored rules, clinical
observations и explainable matching output. Пользователь подтвердил дальнейшее
платформенное направление: проверяемые знания должны распространяться отдельно
от реальных клинических данных и исполняться только внутри доверенного контура
клиники.

Это решение определяет долгосрочную границу Knowledge и Clinic, основу будущих
protocol assessments и взаимодействие с CRM и Lens Order Management. Оно не
разрешает хранение реальных пациентов в текущем каталожном API и не включает
автоматический выбор продукта в MVP.

## Решение

### Dr. Mate Knowledge

Knowledge содержит только переносимые и проверяемые знания:

- источники, редакции, provenance и content hashes;
- manufacturer facts и product lifecycle status;
- формулы и нормализации;
- clinician-authored protocols и declarative rules;
- требования к входным данным и допустимые единицы;
- версии, совместимость, changelog и validation status.

Knowledge не принимает patient identifiers, clinical observations, orders,
requested parameters или laboratory confirmations.

### Knowledge package

Переносимая единица знаний должна иметь manifest с минимум следующими полями:

- устойчивый package ID и клиническая область;
- author или publisher;
- semantic version;
- source revisions и content hashes;
- schemas, formulas, rules и required inputs;
- совместимость с core/runtime;
- validation lifecycle: `draft`, `reviewed`, `validated`, `deprecated`;
- changelog и опциональная цифровая подпись.

Точный формат manifest и механизм подписи остаются `PROPOSED` до отдельной
реализации и review.

### Dr. Mate Clinic

Clinic является приватным runtime, где knowledge package исполняется над
данными конкретного случая. Patient и clinical data остаются внутри доверенного
контура клиники.

Допустимые deployment modes: private hosted tenant, on-premise и hybrid. Выбор
единственной production topology остаётся `UNKNOWN`; архитектурной гарантией
является trust boundary и запрет передачи patient payload в Knowledge, а не
обязательная база на одном компьютере.

### Explainable protocol execution

Protocol run должен сохранять:

- package, ruleset и engine versions;
- immutable snapshot входных наблюдений и их quality/provenance;
- missing inputs и состояние `unknown` без догадок;
- findings, сработавшие правила и источники;
- output status и объяснение;
- clinician decision, override и reason при наличии.

Результат является поддержкой решения врача, а не автономным клиническим
назначением.

### Модули платформы

- Knowledge — знания и версии без пациентов;
- Clinic — клиническая карта, timeline и protocol execution;
- CRM — административные обращения, запись, задачи, оплаты и follow-up;
- Orders — заказы, ревизии параметров, лаборатории и audit;
- Connect — изолированные приборные и внешние integrations;
- Identity & Audit — сквозные access, privacy и traceability controls.

CRM и Orders могут использовать один clinic-controlled patient identity, но не
переносят patient data в Knowledge.

### Ближайший protocol case

Первым запланированным shadow-mode клиническим сценарием является
`orthok_washout_assessment`. Он должен различать:

1. необходимость провести manifest refraction на текущем визите;
2. возможность считать полученную рефракцию окончательным untreated baseline.

Признаки возможного contact-lens-induced astigmatism или продолжающейся
регрессии могут приводить к статусу `washout_stability_unknown` и предложению
серийного повторного измерения. Один снимок не доказывает стабильность или её
отсутствие. Точные клинические пороги остаются `UNKNOWN` до литературного review,
экспертной валидации и тестовых случаев.

## Последствия

Положительные:

- knowledge packages можно рецензировать и распространять без PHI;
- один protocol version воспроизводимо исполняется в разных private runtimes;
- неопределённость и clinician override становятся частью аудита;
- будущий product/parameter decision support получает безопасный фундамент.

Ограничения:

- patient persistence, authorization и clinical runtime пока не реализованы;
- package manifest, подпись и distribution channel ещё не выбраны;
- clinical thresholds нельзя кодировать без отдельной review/validation работы;
- regulatory classification остаётся `UNKNOWN`.

## Проверка

До implementation решение проверяется review границ и отсутствием patient data
в Knowledge API. Реализация потребует schema tests, package validation,
deterministic protocol fixtures, role/privacy tests и подтверждения, что output
не маскируется под prescription.

## Supersedes

None.

## Superseded by

Partially superseded by ADR-0003 only where this ADR could be read as assigning
Follow-up architecture exclusively to CRM. CRM remains a consumer of
administrative Follow-ups. All other decisions in this ADR remain unchanged.
