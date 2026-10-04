import { Button } from "@/modules/sip/components/ui/Button";
import { CarouselRow } from "@/modules/sip/components/ui/CarouselRow";
import { SectionEmptyState } from "@/modules/sip/components/ui/SectionEmptyState";

function PinBadge() {
  return (
    <span
      title="Disematkan admin"
      className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-sip-primary-900 backdrop-blur-sm"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-sip-primary-500">
        <path d="M14.5 2.5a1 1 0 0 1 1 1v5.6l3.6 3.6a1 1 0 0 1-.7 1.7H13v6.1a1 1 0 0 1-2 0V14.4H5.6a1 1 0 0 1-.7-1.7l3.6-3.6V3.5a1 1 0 0 1 1-1z" />
      </svg>
      Pilihan
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
  gridClassName = "grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4",
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
    return <SectionEmptyState message={emptyLabel} />;
  }

  return (
    <div className="flex flex-col gap-8">
      {visiblePinnedItems.length > 0 && (
        <CarouselRow
          items={visiblePinnedItems}
          itemClassName="relative w-[80vw] max-w-[340px] shrink-0 snap-start sm:w-[calc(50%-12px)] sm:max-w-none lg:w-[calc(33.333%-16px)]"
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

      <Button href={seeAllHref} variant="soft" icon="arrow" className="self-center">
        {seeAllLabel}
      </Button>
    </div>
  );
}
