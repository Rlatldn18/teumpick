ALTER TABLE `merchants` ADD `menus` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `pickup_orders` ADD `canceled_by` text DEFAULT '' NOT NULL;