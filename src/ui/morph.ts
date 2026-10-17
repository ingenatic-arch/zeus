/**
 * Bring a panel's DOM up to date with new HTML in place, changing only what
 * differs (text, attributes, added or removed nodes), so a hover tip or a
 * button under the pointer isn't replaced while it is in use, and nothing
 * flickers. Cheap enough for a panel of a few hundred nodes a few times a
 * second.
 */
export function morph(el: HTMLElement, html: string): void {
  const t = document.createElement('template');
  t.innerHTML = html;
  morphChildren(el, t.content);
}

function morphChildren(to: Node, from: Node): void {
  const want = [...from.childNodes];
  let cur = to.firstChild;
  for (const w of want) {
    if (!cur) {
      to.appendChild(w);
      continue;
    }
    if (same(cur, w)) {
      morphNode(cur, w);
      cur = cur.nextSibling;
    } else {
      const next = cur.nextSibling;
      to.replaceChild(w, cur);
      cur = next;
    }
  }
  while (cur) {
    const next = cur.nextSibling;
    to.removeChild(cur);
    cur = next;
  }
}

const same = (a: Node, b: Node): boolean => a.nodeType === b.nodeType && a.nodeName === b.nodeName;

function morphNode(cur: Node, w: Node): void {
  if (cur.nodeType === Node.TEXT_NODE || cur.nodeType === Node.COMMENT_NODE) {
    if (cur.nodeValue !== w.nodeValue) cur.nodeValue = w.nodeValue;
    return;
  }
  if (!(cur instanceof Element) || !(w instanceof Element)) return;
  for (const a of [...cur.attributes]) if (!w.hasAttribute(a.name)) cur.removeAttribute(a.name);
  for (const a of [...w.attributes]) if (cur.getAttribute(a.name) !== a.value) cur.setAttribute(a.name, a.value);
  // A checkbox's ticked state and a button's disabled one are properties as well as attributes.
  if (cur instanceof HTMLInputElement && cur.checked !== w.hasAttribute('checked')) cur.checked = w.hasAttribute('checked');
  if (cur instanceof HTMLButtonElement && cur.disabled !== w.hasAttribute('disabled')) cur.disabled = w.hasAttribute('disabled');
  morphChildren(cur, w);
}
