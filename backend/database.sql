-- DayTrack Max schema for XAMPP/MariaDB and phpMyAdmin.
CREATE DATABASE IF NOT EXISTS `daytrack_max`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `daytrack_max`;

CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `pending_email` VARCHAR(254) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `email_verified` TINYINT(1) NOT NULL DEFAULT 0,
    `failed_login_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `users_email_unique` (`email`),
    UNIQUE KEY `users_pending_email_unique` (`pending_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `auth_tokens` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `purpose` VARCHAR(32) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `expires_at` DATETIME NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `auth_tokens_hash_unique` (`token_hash`),
    KEY `auth_tokens_user_purpose_index` (`user_id`, `purpose`),
    KEY `auth_tokens_expires_index` (`expires_at`),
    CONSTRAINT `auth_tokens_user_foreign`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `birthdays` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL DEFAULT '',
    `birth_date` DATE NOT NULL,
    `notify_on_birthday` TINYINT(1) NOT NULL DEFAULT 1,
    `notify_days_before` SMALLINT UNSIGNED NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `birthdays_user_name_unique` (`user_id`, `first_name`, `last_name`),
    CONSTRAINT `birthdays_user_foreign`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
