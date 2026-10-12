-- CreateTable
CREATE TABLE `teknisi_outlets` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `address` TEXT NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teknisi_technicians` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `outletId` VARCHAR(191) NOT NULL,
    `specialty` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `teknisi_technicians_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teknisi_tickets` (
    `id` VARCHAR(191) NOT NULL,
    `number` VARCHAR(191) NOT NULL,
    `trackingToken` VARCHAR(191) NOT NULL,
    `outletId` VARCHAR(191) NOT NULL,
    `technicianId` VARCHAR(191) NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NOT NULL,
    `device` VARCHAR(191) NOT NULL,
    `imei` VARCHAR(191) NULL,
    `complaint` TEXT NOT NULL,
    `accessories` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'received',
    `priority` VARCHAR(191) NOT NULL DEFAULT 'normal',
    `estimate` INTEGER NOT NULL DEFAULT 0,
    `serviceCost` INTEGER NOT NULL DEFAULT 0,
    `dueAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `teknisi_tickets_number_key`(`number`),
    UNIQUE INDEX `teknisi_tickets_trackingToken_key`(`trackingToken`),
    INDEX `teknisi_tickets_outletId_status_createdAt_idx`(`outletId`, `status`, `createdAt`),
    INDEX `teknisi_tickets_technicianId_status_idx`(`technicianId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teknisi_events` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `note` TEXT NOT NULL,
    `actorName` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `teknisi_events_ticketId_createdAt_idx`(`ticketId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teknisi_parts` (
    `id` VARCHAR(191) NOT NULL,
    `outletId` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `minimum` INTEGER NOT NULL DEFAULT 3,
    `price` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `teknisi_parts_outletId_sku_key`(`outletId`, `sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teknisi_part_uses` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `partId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teknisi_stock_movements` (
    `id` VARCHAR(191) NOT NULL,
    `partId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `note` VARCHAR(191) NOT NULL,
    `actorName` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `teknisi_technicians` ADD CONSTRAINT `teknisi_technicians_outletId_fkey` FOREIGN KEY (`outletId`) REFERENCES `teknisi_outlets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teknisi_tickets` ADD CONSTRAINT `teknisi_tickets_outletId_fkey` FOREIGN KEY (`outletId`) REFERENCES `teknisi_outlets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teknisi_tickets` ADD CONSTRAINT `teknisi_tickets_technicianId_fkey` FOREIGN KEY (`technicianId`) REFERENCES `teknisi_technicians`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teknisi_events` ADD CONSTRAINT `teknisi_events_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `teknisi_tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teknisi_parts` ADD CONSTRAINT `teknisi_parts_outletId_fkey` FOREIGN KEY (`outletId`) REFERENCES `teknisi_outlets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teknisi_part_uses` ADD CONSTRAINT `teknisi_part_uses_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `teknisi_tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teknisi_part_uses` ADD CONSTRAINT `teknisi_part_uses_partId_fkey` FOREIGN KEY (`partId`) REFERENCES `teknisi_parts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teknisi_stock_movements` ADD CONSTRAINT `teknisi_stock_movements_partId_fkey` FOREIGN KEY (`partId`) REFERENCES `teknisi_parts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
