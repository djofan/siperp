import { Button } from "@/modules/sip/components/ui/Button";
import { CarouselRow } from "@/modules/sip/components/ui/CarouselRow";

function PinBadge() {
  return (
    <span
      title="Disematkan admin"
      className="absolute -left-2 -top-2 z-10 flex h-7 w-7 rotate-[-20deg] items-center justify-center rounded-full bg-sip-secondary-500 text-white shadow-md shadow-sip-secondary-900/30"
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
  maxGridItems = 12,
  gridClassName = "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4",
  gridAsCarousel = false,
  gridItemClassName = "w-[45vw] max-w-[220px] shrink-0 snap-start sm:max-w-[240px] lg:w-[calc(16.666%-14px)] lg:max-w-none",
  seeAllHref,
  seeAllLabel = "Lihat Semua",
  emptyLabel = "Belum ada data untuk ditampilkan.",
}: {
  pinnedItems: T[];
  gridItems: T[];
  renderItem: (item: T) => React.ReactNode;
  renderPinnedItem?: (item: T) => React.ReactNode;
  maxPinnedItems?: number;
  maxGridItems?: number;
  // Card biasa sengaja lebih rapat (kolom lebih banyak, card lebih kecil)
  // daripada card pinned di baris carousel atas — bisa di-override per
  // section lewat prop ini kalau kebutuhan densitasnya beda.
  gridClassName?: string;
  // Kalau true, grid biasa juga jadi baris carousel yang bisa digeser
  // (bukan grid statis) — dipakai section yang datanya cukup banyak biar
  // gak semua ke-cap sama "Lihat Semua" doang.
  gridAsCarousel?: boolean;
  gridItemClassName?: string;
  seeAllHref: string;
  seeAllLabel?: string;
  emptyLabel?: string;
}) {
  const visiblePinnedItems = pinnedItems.slice(0, maxPinnedItems);
  const visibleGridItems = gridItems.slice(0, maxGridItems);

  if (pinnedItems.length === 0 && gridItems.length === 0) {
    return <p className="text-sm text-sip-primary-800/60">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {visiblePinnedItems.length > 0 && (
        <CarouselRow
          items={visiblePinnedItems}
          itemClassName="relative w-[75vw] max-w-[260px] shrink-0 snap-start sm:w-[calc(50%-10px)] sm:max-w-none lg:w-[calc(33.333%-14px)]"
          renderItem={(item) => (
            <>
              <PinBadge />
              {(renderPinnedItem ?? renderItem)(item)}
            </>
          )}
        />
      )}

      {visibleGridItems.length > 0 &&
        (gridAsCarousel ? (
          <CarouselRow items={visibleGridItems} itemClassName={gridItemClassName} renderItem={renderItem} />
        ) : (
          <div className={gridClassName}>
            {visibleGridItems.map((item, i) => (
              <div key={i}>{renderItem(item)}</div>
            ))}
          </div>
        ))}

      <Button href={seeAllHref} variant="secondary" icon="arrow" className="self-center">
        {seeAllLabel}
      </Button>
    </div>
  );
}
