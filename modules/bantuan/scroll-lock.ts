type SavedStyle = { name: string; value: string; priority: string };
type ScrollLock = { users: number; restore: () => void };

const locks = new WeakMap<Document, ScrollLock>();

function remember(style: CSSStyleDeclaration, names: string[]) {
  const saved: SavedStyle[] = names.map(name => ({ name, value: style.getPropertyValue(name), priority: style.getPropertyPriority(name) }));
  return () => saved.forEach(({ name, value, priority }) => {
    if (value) style.setProperty(name, value, priority);
    else style.removeProperty(name);
  });
}

/** Keep the page still until the last open dialog has closed. */
export function lockPageScroll(ownerDocument: Document): () => void {
  const view = ownerDocument.defaultView;
  if (!view) return () => {};

  let lock = locks.get(ownerDocument);
  if (!lock) {
    const root = ownerDocument.documentElement, body = ownerDocument.body;
    const scrollX = view.scrollX, scrollY = view.scrollY, originalWidth = root.clientWidth;
    const paddingRight = parseFloat(view.getComputedStyle(body).paddingRight) || 0;
    const restoreRoot = remember(root.style, ["overflow", "overscroll-behavior"]);
    const restoreBehavior = remember(root.style, ["scroll-behavior"]);
    const restoreBody = remember(body.style, ["position", "top", "left", "width", "overflow", "padding-right", "box-sizing"]);

    root.style.setProperty("scroll-behavior", "auto", "important");
    root.style.setProperty("overflow", "hidden", "important");
    root.style.setProperty("overscroll-behavior", "none", "important");
    // Measure the space actually released, including browsers with a stable scrollbar gutter.
    const scrollbarWidth = Math.max(0, root.clientWidth - originalWidth);
    body.style.setProperty("position", "fixed", "important");
    body.style.setProperty("top", `${-scrollY}px`, "important");
    body.style.setProperty("left", `${-scrollX}px`, "important");
    body.style.setProperty("width", "100%", "important");
    body.style.setProperty("overflow", "hidden", "important");
    body.style.setProperty("box-sizing", "border-box", "important");
    body.style.setProperty("padding-right", `${paddingRight + scrollbarWidth}px`, "important");

    lock = { users: 0, restore: () => {
      restoreBody();
      restoreRoot();
      view.scrollTo(scrollX, scrollY);
      restoreBehavior();
    } };
    locks.set(ownerDocument, lock);
  }

  lock.users++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--lock.users === 0) {
      locks.delete(ownerDocument);
      lock.restore();
    }
  };
}
