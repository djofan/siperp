import { Button } from "@/modules/lazsip/components/ui/Button";

export function PinnedGridSection<T>({
  pinnedItems,
  gridItems,
  renderItem,
  renderPinnedItem,
  maxPinnedItems = 5,
  maxGridItems = 16,
  seeAllHref,
  seeAllLabel = "Lihat semua",
  emptyLabel = "Belum ada data untuk ditampilkan.",
  pinnedItemClassName = "w-[75vw] max-w-[260px] shrink-0 snap-start sm:w-[calc(50%-12px)] sm:max-w-none lg:w-[calc(33.333%-16px)]",
  gridColsClassName = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
}: {
  pinnedItems: T[];
  gridItems: T[];
  renderItem: (item: T) => React.ReactNode;
  renderPinnedItem?: (item: T) => React.ReactNode;
  maxPinnedItems?: number;
  maxGridItems?: number;
  seeAllHref: string;
  seeAllLabel?: string;
  emptyLabel?: string;
  pinnedItemClassName?: string;
  gridColsClassName?: string;
}) {
  const visiblePinnedItems = pinnedItems.slice(0, maxPinnedItems);
  const visibleGridItems = gridItems.slice(0, maxGridItems);

  if (pinnedItems.length === 0 && gridItems.length === 0) {
    return <p className="text-sm text-lazsip-primary-800/60">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {visiblePinnedItems.length > 0 && (
        <div className="lazsip-scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pt-2">
          {visiblePinnedItems.map((item, i) => (
            // Penanda pin dirender oleh varian `featured` tiap kartu (PinnedMark), bukan di sini.
            <div key={i} className={pinnedItemClassName}>
              {(renderPinnedItem ?? renderItem)(item)}
            </div>
          ))}
        </div>
      )}

      {visibleGridItems.length > 0 && (
        <div className={`grid gap-4 sm:gap-5 ${gridColsClassName}`}>
          {visibleGridItems.map((item, i) => (
            <div key={i}>{renderItem(item)}</div>
          ))}
        </div>
      )}

      <Button href={seeAllHref} variant="secondary" icon="arrow" className="self-center">
        {seeAllLabel}
      </Button>
    </div>
  );
}
