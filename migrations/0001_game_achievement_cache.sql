CREATE TABLE `game_achievements` (
  `steam_id` text NOT NULL,
  `app_id` integer NOT NULL,
  `payload` text NOT NULL,
  `fetched_at` integer NOT NULL,
  PRIMARY KEY (`steam_id`, `app_id`)
);

CREATE INDEX `game_achievements_steam_id_fetched_at`
  ON `game_achievements` (`steam_id`, `fetched_at`);
