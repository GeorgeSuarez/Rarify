CREATE TABLE `users` (
  `steam_id` text PRIMARY KEY NOT NULL,
  `persona_name` text NOT NULL,
  `avatar` text,
  `level` integer DEFAULT 0,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE TABLE `tracked_games` (
  `steam_id` text NOT NULL,
  `app_id` integer NOT NULL CHECK (`app_id` > 0),
  `tracked_at` integer NOT NULL,
  PRIMARY KEY (`steam_id`, `app_id`)
);

CREATE TABLE `snapshots` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `steam_id` text NOT NULL,
  `date` text NOT NULL,
  `achievements_earned` integer NOT NULL,
  `avg_completion` integer NOT NULL,
  `games_owned` integer NOT NULL
);

CREATE UNIQUE INDEX `snapshots_steam_id_date_unique`
  ON `snapshots` (`steam_id`, `date`);

CREATE TABLE `library_snapshots` (
  `steam_id` text PRIMARY KEY NOT NULL,
  `version` integer NOT NULL,
  `payload` text NOT NULL,
  `fetched_at` integer NOT NULL
);

CREATE TABLE `user_preferences` (
  `steam_id` text PRIMARY KEY NOT NULL,
  `default_filter` text DEFAULT 'all' NOT NULL
    CHECK (`default_filter` IN ('all', 'owned', 'tracked')),
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`steam_id`) REFERENCES `users` (`steam_id`)
    ON UPDATE NO ACTION ON DELETE NO ACTION
);
