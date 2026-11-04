# Состояние доработки кабинета

Дата: 3 ноября 2026. Приоритет пользователя: открыть готовый блок и провести урок без долгого подбора материалов. Аккаунты и необязательная декоративная работа отложены.

## Реализовано

- `teach.html`, `teach.css`, `teach.js`: единый маршрут урока, локальные профили учеников, памятка, объяснение, совместная/самостоятельная работа, выбор задач, версии ДЗ, проверка, освоение тем и общая резервная копия.
- `practice-data.js`: 464 уникальные авторские карточки; готовая практика для 56 занятий, две задачи на графики к каждому занятию. Контрольные занятия используют карточки из соответствующих тем.
- `learning-core.js`: строгая проверка чисел и последовательностей; отсутствие автоматического ключа означает ручную проверку, а не ошибку.
- Закрытый банк подключается после входа в существующий журнал через проверяемый по origin/source обмен между страницами. Пароль и расшифрованный банк не включены в новые файлы.
- Исходный задачник: постоянные номера при фильтрации и в домашках; письменные ответы; результаты с ожидающими проверки заданиями; запрет частичного открытия повреждённой подборки.
- Доска: снимок привязан к ученику и задаче; сохранение перед закрытием/сменой задачи, обработка потери указателя; экспорт большого рисунка без обрезания.
- Тренажёр графиков: формулы подписаны как перемещение, путь суммирует площади по модулю, области ниже оси отрисовываются корректно.
- Общая навигация и светлая/тёмная темы.

## Проверено до публикации

- `node scripts/verify-learning.cjs`: проходит.
- Авторская ДЗ из 10 задач открывается ученику с графиками; восемь числовых ответов приняты, два письменных ожидают ручной проверки.
- Результат возвращается в кабинет, комментарий и ручная оценка сохраняются после перезагрузки.
- Фото сохраняется, входит в JSON-копию; копия не содержит пароль журнала. Повторный импорт объединяет записи.
- Вход в прежний защищённый банк, постоянные номера блока 7, открытие задачи №10 с рисунком во встроенной доске.
- Штрих остаётся после быстрого закрытия и открытия доски.
- Домашка из исходного закрытого банка открывается с правильными номерами и изображениями.

## Финальная проверка

- Проверены итоговый diff, отсутствие учётных данных в новых файлах и неизменность зашифрованного банка.
- Сохранённая версия ДЗ открывается после перезагрузки без повторного входа в банк; постоянные номера сохранены.
- В тренажёре проверен разворот: v₀=4, a=−2, t=4; перемещение 0 м, путь 8 м.
- Публикация и проверка публичной версии выполняются после этого коммита.

## Сознательно отложено

Полная независимая проверка всех 602 исходных ключей/таблиц; собственный сервер совместной доски; аккаунты и облачная синхронизация; расширенные игры/питомцы. Авторские карточки дают готовую тренировку, но не заменяют полный официальный банк и проверку экзаменационных развёрнутых работ.

## Приватный вход — 3 ноября

По запросу пользователя кабинет и маршрут защищены паролем журнала. HTML, сценарии, план и практика помещены в AES-GCM-контейнеры. Открытые преподавательские исходники и Markdown больше не раздаются текущей версией Pages; редактируемые копии сохранены в `../site-private-source/`. Ученическая навигация не содержит преподавательских ссылок без входа. Ключ доступа действует в текущей вкладке до выхода; кнопка выхода блокирует также встроенный план. Пароль не сохраняется новым входом и не попадает в исходники/резервные копии. Ранее опубликованные учебные материалы могут оставаться в истории GitHub; это не серверная система аккаунтов. Личные записи по-прежнему локальны.

## Запоминаемое устройство

По дополнительному запросу пользователя в общую навигацию возвращён пункт «🔒 Журнал репетитора», ведущий в закрытый кабинет. Форма предлагает «Запомнить это устройство» (включено по умолчанию). Сохраняется ключ доступа в localStorage текущего браузера; пароль не сохраняется. Выход удаляет и ключ устройства, и ключ вкладки. Без отметки используется только сессия вкладки. Новая авторизация не попадает в резервные копии пользовательских записей.

## 2026-11-05 — readable light theme and laboratory hub
- Flat white task/lesson surfaces in light mode, dark readable text, solid success state and readable board/task overlays.
- New laboratory.html hub: existing density experiment plus spring stiffness, sliding friction and resistance trainers. Three measurements, persisted tables, decimal-comma answer checks, worked calculation, notebook report and print action.
- Models explicitly identified as idealized training, not the complete official OGE experimental bank. Shared navigation now opens the hub; density has a return link.
- Refreshed shared asset versions, including styles loaded by the encrypted teacher workspace. Password gate and encrypted bundles preserved.
- Verified: existing learning verification passes (56 lessons/464 unique author tasks), browser spring measurements and persistence after reload, friction 0,3, resistance 20 and malformed-input rejection, light card computed white background/no background image/dark text.

## 2026-11-05 — animated laboratory models
- Persistent SVG scenes: spring extension and suspended load move smoothly as mass changes; a complete friction rig moves at constant speed with balanced force arrows; conventional-current markers travel around the main circuit and respond to voltage.
- Start/pause/replay controls, spring demonstration through three masses, automatic stop after the friction pass, page-hidden pause, reduced-motion alternative. Numeric readings stay fixed in place and existing tables/checks are preserved.
- Browser checked spring automatic progression to 300 g, moving friction transform, pause and recording 400 g / 1.2 N, switching to Ohm scene and moving current markers. Existing learning validation passed.

## 2026-11-05 — pixel frog physics helper
- Added reference-inspired pixel SVG frog throughout the shared site shell, with idle hops/blinks, pointer-following pupils, and mouth animation during typed text.
- Click to request context-sensitive laboratory formulas or physics facts; occasional quiet fact bubbles, close/Escape, persistent show/hide control in navigation, reduced-motion handling. No AI API, audio, or external service used.
- Embedded workspace resources omit the helper to avoid duplicate floating widgets. Existing password gates remain intact.
- Browser verified: spring-specific Hooke-law hint, talking state, pupils moving to (-3,-2), fact button, hiding retained across reload, restoring from navigation. Learning checks pass.
