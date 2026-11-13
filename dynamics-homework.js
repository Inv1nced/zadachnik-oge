/* One assigned diagnostic. Native HW/RES format is handled by the task bank. */
(function () {
  const label = (block, topic) => ({ label: `Блок ${block} · ${topic}` });
  const row = (number, block, answer, topic, text, images = []) =>
    [-2026111400 - number, 0, String(block), 'b', answer, 'A', text, images, label(block, topic)];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 245" width="350" height="245">
    <rect width="350" height="245" rx="10" fill="#fff"/>
    <path d="M52 38H286M52 77H286M52 116H286M52 155H286M130 38V194M208 38V194M286 38V194" fill="none" stroke="#dbe5ee"/>
    <path d="M52 29V194H316M47 36l5-8 5 8M308 189l8 5-8 5" fill="none" stroke="#243a54" stroke-width="2"/>
    <path d="M52 38L286 155" fill="none" stroke="#1759aa" stroke-width="4"/>
    <g fill="#1759aa"><circle cx="52" cy="38" r="4"/><circle cx="286" cy="155" r="4"/></g>
    <g font-family="sans-serif" font-size="15" fill="#243a54">
      <text x="19" y="20">vₓ, м/с</text><text x="302" y="224">t, с</text>
      <text x="30" y="43">8</text><text x="30" y="82">6</text><text x="30" y="121">4</text><text x="30" y="160">2</text>
      <text x="40" y="216">0</text><text x="125" y="216">1</text><text x="203" y="216">2</text><text x="281" y="216">3</text>
    </g>
  </svg>`;
  const graph = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const authored = [
    row(2, 7, '6', 'график скорости', 'Тело массой 3 кг движется вдоль оси Ox. На графике vₓ(t) прямая соединяет точки (0 с; 8 м/с) и (3 с; 2 м/с). Чему равен модуль равнодействующей сил? Ответ — в Н. [рисунок]', [graph]),
    row(5, 9, '3', 'трение покоя', 'На брусок на горизонтальном столе действуют горизонтальной силой 3 Н. Брусок остаётся неподвижным. Максимальная сила трения покоя равна 8 Н. Чему равен модуль силы трения в этот момент? Ответ — в Н.'),
    row(6, 9, '40', 'вес в лифте', 'Ящик массой 5 кг стоит на полу лифта. Лифт движется вверх и замедляется с ускорением, модуль которого равен 2 м/с². С какой силой ящик давит на пол лифта? Прими g = 10 м/с². Ответ — в Н.'),
    row(7, 10, '0.5', 'всемирное тяготение', 'Массу одного шара увеличили в 2 раза, массу второго не меняли. Расстояние между центрами шаров увеличили в 2 раза. Найди отношение новой силы тяготения к первоначальной. Запиши число.'),
    row(8, 11, '2', 'движение по окружности', 'Модуль скорости тела, движущегося по окружности, постоянен. Куда направлена равнодействующая сил? 1) по касательной вперёд; 2) к центру окружности; 3) от центра окружности; 4) равна нулю. Запиши номер ответа.'),
  ];
  const order = [105529, authored[0][0], 71216, 71218, ...authored.slice(1).map(r => r[0]), 146670, 37422];

  window.DynamicsHomework = {
    title: 'Диагностика по динамике · 14 ноября',
    order,
    authored,
    blocks: ['6', '8', '11'],
  };
})();
