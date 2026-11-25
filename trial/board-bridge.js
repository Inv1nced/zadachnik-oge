/* The shared board calls these page-level adapters to render the task and announce actions. */
function fmtRow(row) {
  return OgeCore.conditionHTML(row);
}
const esc = value => OgeCore.escapeHtml(value);
function toast(message) {
  const live = document.getElementById('board-toast');
  live.textContent = message;
  live.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => live.classList.remove('show'), 2500);
}
