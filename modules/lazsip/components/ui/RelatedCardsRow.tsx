export function RelatedCardsRow<T>({
  items,
  renderItem,
  itemClassName = "w-[42vw] max-w-[220px] shrink-0 snap-start sm:w-[calc(33.333%-11px)] sm:max-w-none",
}: {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  itemClassName?: string;
}) {
  return (
    <div className="lazsip-scrollbar-hide -mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1">
      {items.map((item, i) => (
        <div key={i} className={itemClassName}>
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}
