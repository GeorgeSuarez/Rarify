CREATE TABLE `game_schemas` (
  `app_id` integer PRIMARY KEY NOT NULL CHECK (`app_id` > 0),
  `payload` text NOT NULL,
  `fetched_at` integer NOT NULL
);
