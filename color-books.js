// The color-book menu is rendered in the page so its theme remains readable
// even when the browser's native select popup uses different system colors.
export class ColorBookPicker {
  constructor(select) {
    this.select = select;
    this.host = document.createElement('div');
    this.host.className = 'color-book-picker';
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'color-book-button';
    this.button.setAttribute('aria-label', 'Libro de color');
    this.button.setAttribute('aria-haspopup', 'listbox');
    this.button.setAttribute('aria-expanded', 'false');
    this.list = document.createElement('div');
    this.list.id = 'colorBookOptions';
    this.list.className = 'color-book-options';
    this.list.role = 'listbox';
    this.list.setAttribute('aria-label', 'Libros de color');
    this.list.hidden = true;
    this.button.setAttribute('aria-controls', this.list.id);
    this.host.append(this.button, this.list);
    select.after(this.host);
    select.hidden = true;
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    this.button.addEventListener('click', () => this.list.hidden ? this.open() : this.close());
    this.button.addEventListener('keydown', event => {
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); event.stopPropagation();
        this.open(event.key === 'End' ? this.options.length - 1 : event.key === 'Home' ? 0 : undefined);
      } else if (event.code === 'Space') event.stopPropagation();
    });
    this.list.addEventListener('keydown', event => this.onKey(event));
    document.addEventListener('pointerdown', event => { if (!this.host.contains(event.target)) this.close(); });
    this.host.addEventListener('focusout', event => { if (!this.host.contains(event.relatedTarget)) this.close(); });
  }
  get options() { return [...this.list.querySelectorAll('[role=option]')]; }
  sync() {
    this.close();
    const selected = this.select.selectedOptions[0];
    this.button.textContent = selected?.textContent || 'Elegir libro';
    this.list.replaceChildren(...[...this.select.options].map(option => {
      const item = document.createElement('button');
      item.type = 'button'; item.role = 'option'; item.tabIndex = -1;
      item.textContent = option.textContent; item.dataset.value = option.value;
      item.setAttribute('aria-selected', String(option.selected));
      item.addEventListener('click', () => this.choose(option.value));
      return item;
    }));
  }
  open(index) {
    this.list.hidden = false; this.button.setAttribute('aria-expanded', 'true');
    const options = this.options;
    (options[index] || options.find(option => option.getAttribute('aria-selected') === 'true') || options[0])?.focus();
  }
  close(focus = false) {
    this.list.hidden = true; this.button.setAttribute('aria-expanded', 'false');
    if (focus) this.button.focus();
  }
  choose(value) {
    this.select.value = value;
    this.close(true);
    this.select.dispatchEvent(new Event('change', { bubbles: true }));
  }
  onKey(event) {
    if (event.key === 'Tab') { this.close(true); return; }
    event.stopPropagation();
    const options = this.options, current = options.indexOf(document.activeElement);
    if (event.key === 'Escape') { event.preventDefault(); this.close(true); return; }
    let next;
    if (event.key === 'ArrowDown') next = (current + 1) % options.length;
    else if (event.key === 'ArrowUp') next = (current - 1 + options.length) % options.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && event.key !== ' ') {
      this.search = Date.now() - (this.lastSearch || 0) < 700 ? (this.search || '') + event.key : event.key;
      this.lastSearch = Date.now();
      next = options.findIndex(option => option.textContent.toLocaleLowerCase().startsWith(this.search.toLocaleLowerCase()));
      if (next < 0) return;
    } else return;
    event.preventDefault(); options[next]?.focus();
  }
}
