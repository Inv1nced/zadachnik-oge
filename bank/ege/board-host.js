const egeBoardConditions = new Map();

function esc(value) {
  return String(value).replace(/[&<>"']/g, character =>
    ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[character]);
}

function fmtRow(row) {
  return egeBoardConditions.get(row[0]) ?? esc(row[6] || '').replaceAll('\n', '<br>');
}

function toast(message) {
  const node = document.getElementById('toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove('show'), 2400);
}

async function copy(text, input) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Ссылка скопирована');
  } catch {
    input?.select();
    toast('Скопируй выделенную ссылку');
  }
}

function figureSources(condition) {
  return [...condition.querySelectorAll('img')].map(img => img.src)
    .filter(src => {
      const link = new URL(src);
      return link.origin === location.origin && /\.(?:gif|jpe?g|png|svg|webp)$/i.test(link.pathname);
    });
}

window.InvariantEgeBoard = {
  open(id, label, condition) {
    const key = 'invariant-ege-' + id;
    condition.querySelectorAll('button, .figure-link').forEach(button => button.replaceWith(...button.childNodes));
    const figures = figureSources(condition);
    const row = [key, null, null, null, null, null, condition.innerText || condition.textContent, figures];
    egeBoardConditions.clear();
    egeBoardConditions.set(key, condition.innerHTML);
    BD.open(key, row, label);
    document.getElementById('bdClose').focus({preventScroll: true});
  },
  join() {
    const params = new URLSearchParams(location.hash.slice(1));
    const room = params.get('room');
    const board = params.get('board');
    if (/^[a-z\d]{8}$/.test(room ?? '') && /^invariant-ege-[a-z\d-]+$/i.test(board ?? '')) BD.fromHash();
  },
};
