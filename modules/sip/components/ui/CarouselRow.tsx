// Baris carousel yang bisa digeser (swipe/drag) horizontal — dipakai untuk baris
// pinned (PinnedGridSection) maupun grid Penyaluran Bantuan yang gak punya konsep
// pin tapi tetap butuh tampilan yang bisa digeser kalau datanya banyak.
export function CarouselRow<T>({
  items,
  renderItem,
  itemClassName = "w-[70vw] max-w-[280px] shrink-0 snap-start sm:w-[calc(33.333%-16px)] sm:max-w-none lg:w-[calc(25%-18px)]",
}: {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  itemClassName?: string;
}) {
  return (
    <div className="sip-scrollbar-hide -mx-4 flex scroll-px-4 snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-4 pt-2 sm:-mx-6 sm:scroll-px-6 sm:px-6">
      {items.map((item, i) => (
        <div key={i} className={itemClassName}>
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}
