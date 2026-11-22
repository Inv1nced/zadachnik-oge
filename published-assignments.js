/* Public presets are shared by the short student links and the teacher's checker. */
(function (root) {
  'use strict';
  const names = ['impulse', 'dynamics', 'friction', 'ratio', 'energy', 'energy-ratios'];
  const cache = new Map();

  function load(name) {
    if (!names.includes(name)) return Promise.reject(new Error('Такой домашки нет. Проверь ссылку.'));
    if (!cache.has(name)) {
      const request = fetch(`assignments/${name}.json`).then(response => {
        if (!response.ok) throw new Error('Домашка не загрузилась. Проверь соединение и обнови страницу.');
        return response.json();
      }).then(data => OgeAssignments.homework(OgeAssignments.encode('HW-', data)))
        .catch(error => {
          cache.delete(name);
          if (error instanceof TypeError) throw new Error('Проверь соединение и попробуй открыть домашку снова.');
          throw error;
        });
      cache.set(name, request);
    }
    return cache.get(name);
  }

  async function all() {
    const results = await Promise.allSettled(names.map(load));
    return results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
  }

  root.OgePublished = { load, all };
})(window);
