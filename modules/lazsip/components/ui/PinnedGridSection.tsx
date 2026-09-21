import { Button } from "@/modules/lazsip/components/ui/Button";

function PinBadge() {
  return (
    <span
      title="Disematkan admin"
      className="absolute -left-2 -top-2 z-10 flex h-7 w-7 rotate-[-20deg] items-center justify-center rounded-full bg-lazsip-secondary-500 text-white shadow-md shadow-lazsip-secondary-900/30"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M14.5 2.5a1 1 0 0 1 1 1v5.6l3.6 3.6a1 1 0 0 1-.7 1.7H13v6.1a1 1 0 0 1-2 0V14.4H5.6a1 1 0 0 1-.7-1.7l3.6-3.6V3.5a1 1 0 0 1 1-1z" />
      </svg>
    </span>
  );
}

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
            <div key={i} className={`relative ${pinnedItemClassName}`}>
              <PinBadge />
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
