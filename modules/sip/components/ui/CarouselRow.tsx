// Baris carousel yang bisa digeser (swipe/drag) horizontal — dipakai untuk baris
// pinned (PinnedGridSection) maupun grid Penyaluran Bantuan yang gak punya konsep
// pin tapi tetap butuh tampilan yang bisa digeser kalau datanya banyak.
export function CarouselRow<T>({
  items,
  renderItem,
  itemClassName = "w-[60vw] max-w-[220px] shrink-0 snap-start sm:w-[calc(33.333%-14px)] sm:max-w-none lg:w-[calc(25%-15px)]",
}: {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  itemClassName?: string;
}) {
  return (
    <div className="sip-scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pt-2">
      {items.map((item, i) => (
        <div key={i} className={itemClassName}>
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}
