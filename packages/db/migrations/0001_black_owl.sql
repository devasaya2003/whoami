DELETE FROM `blog_versions`;--> statement-breakpoint
DELETE FROM `blogs`;--> statement-breakpoint
DROP TABLE `blog_versions`;--> statement-breakpoint
ALTER TABLE `blogs` ADD `title` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `blogs` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `blogs` ADD `status` text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `blogs` ADD `published_at` integer;--> statement-breakpoint
ALTER TABLE `blogs` ADD `doc_snapshot` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `blogs` ADD `content_html` text DEFAULT '' NOT NULL;
