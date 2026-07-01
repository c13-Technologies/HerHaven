-- ============================================================
-- Her Haven — Local MySQL Database (XAMPP-compatible)
-- Converted from Supabase/PostgreSQL migrations
-- ============================================================
-- Usage:
--   1. Open phpMyAdmin or MySQL CLI
--   2. Create a database: CREATE DATABASE her_haven CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--   3. Run: mysql -u root -p her_haven < database/schema.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- USERS (replaces Supabase auth.users for local testing)
-- ============================================================
CREATE TABLE users (
    id          CHAR(36)     PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL COMMENT 'bcrypt hash',
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
    id                 CHAR(36)     PRIMARY KEY,
    username           VARCHAR(60)  UNIQUE,
    display_name       VARCHAR(120),
    bio                VARCHAR(280),
    avatar_url         TEXT,
    default_anonymous  TINYINT(1)   NOT NULL DEFAULT 0,
    created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- USER ROLES
-- ============================================================
CREATE TABLE user_roles (
    id         CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
    user_id    CHAR(36)     NOT NULL,
    role       ENUM('admin','moderator','user') NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_role (user_id, role),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
    slug        VARCHAR(50)  PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    emoji       VARCHAR(10),
    ord         INT          NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO categories (slug, name, description, emoji, ord) VALUES
  ('relationships',   'Relationships',   'Love, dating, partnership, the messy in-between.', '🤍',  1),
  ('career',          'Career & Work',   'Ambitions, bosses, burnout, the next chapter.',    '💼',  2),
  ('marriage',        'Marriage',        'Vows, partnership, the long quiet work of staying.','💍',  3),
  ('motherhood',      'Motherhood',      'The wonder and the weight of raising a person.',    '🌿',  4),
  ('mental-wellness', 'Mental Wellness', 'Anxiety, healing, therapy, the inner weather.',     '🌙',  5),
  ('personal-growth', 'Personal Growth', 'Becoming. Unlearning. Returning to yourself.',      '✨',  6),
  ('finance',         'Finance',         'Money honestly — earning, saving, asking for more.','📓',  7),
  ('friendship',      'Friendship',      'The chosen sisters, the drifting apart.',           '🫶',  8),
  ('faith',           'Faith & Spirituality','Prayer, doubt, devotion, the search for meaning.','🕊️',9),
  ('lifestyle',       'Lifestyle',       'Home, beauty, food, small ordinary joys.',          '🌸', 10),
  ('general',         'General Discussions','Anything else on your heart.',                   '💬', 11);

-- ============================================================
-- CIRCLES
-- ============================================================
CREATE TABLE circles (
    id          CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    created_by  CHAR(36)     NOT NULL,
    is_private  TINYINT(1)   NOT NULL DEFAULT 1,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE circle_members (
    id        CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
    circle_id CHAR(36)     NOT NULL,
    user_id   CHAR(36)     NOT NULL,
    role      VARCHAR(20)  NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_circle_member (circle_id, user_id),
    FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- POSTS
-- ============================================================
CREATE TABLE posts (
    id            CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
    author_id     CHAR(36)     NOT NULL,
    category_slug VARCHAR(50)  NOT NULL,
    circle_id     CHAR(36)     NULL,
    title         VARCHAR(140) NOT NULL,
    body          TEXT         NOT NULL,
    tag           ENUM('need_advice','just_venting','general') NOT NULL DEFAULT 'general',
    is_anonymous  TINYINT(1)   NOT NULL DEFAULT 0,
    is_sensitive  TINYINT(1)   NOT NULL DEFAULT 0,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id)     REFERENCES users(id)      ON DELETE CASCADE,
    FOREIGN KEY (category_slug) REFERENCES categories(slug),
    FOREIGN KEY (circle_id)     REFERENCES circles(id)     ON DELETE SET NULL,
    INDEX idx_posts_category (category_slug, created_at),
    INDEX idx_posts_circle   (circle_id, created_at),
    INDEX idx_posts_author   (author_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE comments (
    id           CHAR(36)  PRIMARY KEY DEFAULT (UUID()),
    post_id      CHAR(36)  NOT NULL,
    author_id    CHAR(36)  NOT NULL,
    parent_id    CHAR(36)  NULL,
    body         TEXT      NOT NULL,
    is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id)   REFERENCES posts(id)    ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
    INDEX idx_comments_post (post_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- REACTIONS (supports both posts and comments)
-- ============================================================
CREATE TABLE reactions (
    id         CHAR(36)  PRIMARY KEY DEFAULT (UUID()),
    post_id    CHAR(36)  NULL,
    comment_id CHAR(36)  NULL,
    user_id    CHAR(36)  NOT NULL,
    type       ENUM('heart','hug','support','relate','pray') NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id)    REFERENCES posts(id)    ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    UNIQUE KEY uq_post_reaction    (post_id,    user_id, type),
    UNIQUE KEY uq_comment_reaction (comment_id, user_id, type),
    INDEX idx_reactions_post    (post_id),
    INDEX idx_reactions_comment (comment_id),
    CONSTRAINT chk_reaction_target CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- REPORTS
-- ============================================================
CREATE TABLE reports (
    id          CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
    reporter_id CHAR(36)     NOT NULL,
    target_type ENUM('post','comment','user') NOT NULL,
    target_id   CHAR(36)     NOT NULL,
    reason      TEXT         NOT NULL,
    status      ENUM('pending','reviewed','dismissed','actioned') NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- USER BLOCKS
-- ============================================================
CREATE TABLE user_blocks (
    blocker_id CHAR(36)  NOT NULL,
    blocked_id CHAR(36)  NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (blocker_id, blocked_id),
    FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id         CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
    user_id    CHAR(36)     NOT NULL,
    type       ENUM('reply','mention','reaction','circle_invite','circle_activity','system') NOT NULL,
    title      VARCHAR(255) NOT NULL,
    body       TEXT,
    link       VARCHAR(500),
    `read`     TINYINT(1)   NOT NULL DEFAULT 0,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- SEED DATA — Test users and sample content
-- ============================================================

-- Test users (password: "password123" — bcrypt hash)
INSERT INTO users (id, email, password) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'maya@example.com',   '$2b$10$dummyhash'),
  ('a0000000-0000-0000-0000-000000000002', 'zara@example.com',   '$2b$10$dummyhash'),
  ('a0000000-0000-0000-0000-000000000003', 'admin@herhaven.app', '$2b$10$dummyhash');

-- Profiles
INSERT INTO profiles (id, username, display_name, bio, default_anonymous) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'maya',   'Maya',   'Writer, mother of two, learning to ask for what I need.', 0),
  ('a0000000-0000-0000-0000-000000000002', 'zara',   'Zara',   'Software engineer. First-gen everything. Always tired.',   0),
  ('a0000000-0000-0000-0000-000000000003', 'sistermod','Her Haven Team','Keeping this space safe and soft.',                 0);

-- Roles
INSERT INTO user_roles (id, user_id, role) VALUES
  (UUID(), 'a0000000-0000-0000-0000-000000000001', 'user'),
  (UUID(), 'a0000000-0000-0000-0000-000000000002', 'user'),
  (UUID(), 'a0000000-0000-0000-0000-000000000003', 'admin'),
  (UUID(), 'a0000000-0000-0000-0000-000000000003', 'moderator');

-- Sample posts
INSERT INTO posts (id, author_id, category_slug, title, body, tag, is_anonymous, created_at) VALUES
  ('b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'relationships',
   'He says I''m too sensitive. I don''t know if I am anymore.',
   'Three years in and every time I bring up something that hurt me, the conversation becomes about how I said it. I''m starting to lose my own voice and I don''t know how to get it back.\n\nHas anyone else been through this? How did you know when it was time to leave?',
   'need_advice', 0,
   '2026-06-28 09:15:00'),

  ('b0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000002',
   'career',
   'Asking for the raise I''ve earned — what would you say?',
   'I''ve led the last two product launches and I''m still the lowest-paid person on my team. The meeting is on Monday. Tell me what to actually say. I have the data. I have the results. I just need the words that won''t make me sound like I''m apologizing.',
   'need_advice', 0,
   '2026-06-29 14:30:00'),

  ('b0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000001',
   'motherhood',
   'I love my baby and I miss who I was. Both can be true.',
   'Nobody warned me how much I would grieve the woman I was before her. I would do it all again — she is the best thing that ever happened to me. But today I needed to say this out loud somewhere safe.\n\nI miss sleeping through the night. I miss not being touched out by 9am. I miss the quiet.',
   'just_venting', 1,
   '2026-06-30 07:45:00'),

  ('b0000000-0000-0000-0000-000000000004',
   'a0000000-0000-0000-0000-000000000002',
   'personal-growth',
   'The quiet work of becoming. Unlearning. Returning to yourself.',
   'I turned 30 last week and I realized I have spent the last decade trying to become someone else''s idea of successful. I''m done. I don''t know what comes next but I know it has to be mine.',
   'general', 0,
   '2026-06-25 11:00:00');

-- Sample comments
INSERT INTO comments (id, post_id, author_id, body, is_anonymous, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000002',
   'I went through something very similar two years ago. What helped me was writing down what I wanted to say before the conversation. It stopped the gaslighting because I could point to my own words. You are not too sensitive. Sending you so much strength.',
   0, '2026-06-28 10:30:00'),

  ('c0000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000003',
   'As a moderator, just want to remind everyone: if you ever feel unsafe at home, resources are available. The community rules have a list. You are not alone.',
   0, '2026-06-28 11:00:00'),

  ('c0000000-0000-0000-0000-000000000003',
   'b0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000001',
   'Lead with the numbers, close with your value. Something like: "Based on my contributions to X and Y launches, which generated Z in revenue, I would like to discuss adjusting my compensation to reflect my current level of impact." No apology, no "I feel like." You have earned this.',
   0, '2026-06-29 15:00:00'),

  ('c0000000-0000-0000-0000-000000000004',
   'b0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000002',
   'Both things can absolutely be true. The grief for your old self is real and valid. It does not mean you love your baby any less. You are doing an incredible job, sister.',
   0, '2026-06-30 09:00:00'),

  ('c0000000-0000-0000-0000-000000000005',
   'b0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000001',
   'Thank you both. Reading these replies made me cry in a good way. I needed to hear this today.',
   1, '2026-06-30 10:15:00');

-- Nested reply
INSERT INTO comments (id, post_id, author_id, parent_id, body, is_anonymous, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000006',
   'b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001',
   'Thank you so much. The writing it down idea is genius — I always freeze in the moment. I am going to try this tonight.',
   0, '2026-06-28 12:00:00');

-- Sample reactions
INSERT INTO reactions (id, post_id, user_id, type, created_at) VALUES
  (UUID(), 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'hug',     '2026-06-28 10:00:00'),
  (UUID(), 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'support', '2026-06-28 11:00:00'),
  (UUID(), 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'heart',   '2026-06-29 15:30:00'),
  (UUID(), 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'hug',     '2026-06-30 09:00:00'),
  (UUID(), 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'hug',     '2026-06-30 09:30:00');

-- Comment reactions
INSERT INTO reactions (id, comment_id, user_id, type, created_at) VALUES
  (UUID(), 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'heart', '2026-06-28 12:01:00'),
  (UUID(), 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'heart', '2026-06-29 16:00:00');

-- Sample notifications
INSERT INTO notifications (id, user_id, type, title, body, link, created_at) VALUES
  (UUID(), 'a0000000-0000-0000-0000-000000000001', 'reply', 'Someone replied to your story',
   'I went through something very similar two years ago...', '/post/b0000000-0000-0000-0000-000000000001', '2026-06-28 10:30:00'),
  (UUID(), 'a0000000-0000-0000-0000-000000000002', 'reaction', 'Your story received a heart',
   'Maya loved your story about asking for a raise.', '/post/b0000000-0000-0000-0000-000000000002', '2026-06-29 15:30:00');
