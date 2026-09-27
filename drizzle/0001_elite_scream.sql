CREATE TABLE `auth_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`password` text NOT NULL,
	`recovery` text NOT NULL,
	`created` integer NOT NULL,
	`terms_version` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_email_unique` ON `members` (`email`);--> statement-breakpoint
CREATE TABLE `merchants` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`name` text NOT NULL,
	`station` text NOT NULL,
	`address` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`menu` text NOT NULL,
	`price` integer NOT NULL,
	`minutes` integer NOT NULL,
	`image` text NOT NULL,
	`open` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `merchants_member_id_unique` ON `merchants` (`member_id`);--> statement-breakpoint
CREATE TABLE `pickup_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`buyer_id` text NOT NULL,
	`seller_id` text NOT NULL,
	`shop_id` text NOT NULL,
	`shop_name` text NOT NULL,
	`menu_name` text NOT NULL,
	`image` text NOT NULL,
	`station` text NOT NULL,
	`qty` integer NOT NULL,
	`total` integer NOT NULL,
	`status` integer NOT NULL,
	`locker` integer NOT NULL,
	`created` integer NOT NULL,
	`eta` integer NOT NULL,
	`note` text NOT NULL,
	`code` text NOT NULL,
	`ready` integer,
	`request_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `pickup_buyer` ON `pickup_orders` (`buyer_id`);--> statement-breakpoint
CREATE INDEX `pickup_seller` ON `pickup_orders` (`seller_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `pickup_request` ON `pickup_orders` (`buyer_id`,`request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `pickup_global_locker` ON `pickup_orders` (`station`,`locker`) WHERE "pickup_orders"."status"<4;--> statement-breakpoint
CREATE TABLE `sessions` (
	`hash` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sessions_member` ON `sessions` (`member_id`);