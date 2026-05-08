CREATE TABLE `book_copies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookId` int NOT NULL,
	`copyCode` varchar(32) NOT NULL,
	`status` enum('available','loaned','maintenance') NOT NULL DEFAULT 'available',
	`acquiredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `book_copies_id` PRIMARY KEY(`id`),
	CONSTRAINT `book_copies_copyCode_unique` UNIQUE(`copyCode`)
);
--> statement-breakpoint
CREATE TABLE `books` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`author` varchar(255) NOT NULL,
	`categoryId` int NOT NULL,
	`description` text,
	`publisher` varchar(160),
	`publicationYear` int,
	`isbn` varchar(32),
	`coverUrl` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `books_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_name_unique` UNIQUE(`name`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `loans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`copyId` int NOT NULL,
	`bookId` int NOT NULL,
	`loanedAt` timestamp NOT NULL DEFAULT (now()),
	`dueDate` timestamp NOT NULL,
	`returnedAt` timestamp,
	`renewalCount` int NOT NULL DEFAULT 0,
	`daysLate` int NOT NULL DEFAULT 0,
	`status` enum('active','returned','overdue') NOT NULL DEFAULT 'active',
	`notes` text,
	`loanedByUserId` int,
	`returnedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`cpf` varchar(14),
	`phone` varchar(20),
	`address` text,
	`verificationStatus` enum('pending','submitted','verified','rejected') NOT NULL DEFAULT 'pending',
	`rejectionReason` text,
	`isBlocked` boolean NOT NULL DEFAULT false,
	`blockedUntil` timestamp,
	`blockReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `verification_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`docType` enum('identity','address_proof') NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` varchar(512) NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verification_documents_id` PRIMARY KEY(`id`)
);
