CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`shop_id` text NOT NULL,
	`station` text NOT NULL,
	`qty` integer NOT NULL,
	`total` integer NOT NULL,
	`status` integer NOT NULL,
	`locker` integer NOT NULL,
	`created` integer NOT NULL,
	`eta` integer NOT NULL,
	`note` text NOT NULL,
	`code` text NOT NULL,
	`ready` integer
);
--> statement-breakpoint
CREATE INDEX `orders_owner` ON `orders` (`owner`);--> statement-breakpoint
CREATE UNIQUE INDEX `active_locker` ON `orders` (`owner`,`station`,`locker`) WHERE "orders"."status" < 4;