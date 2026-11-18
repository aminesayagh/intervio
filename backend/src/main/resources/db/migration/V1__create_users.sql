create table users (
    id                bigint generated always as identity primary key,
    uuid              uuid         not null unique,
    full_name         varchar(200) not null,
    email             varchar(320) not null unique, -- stored lower-case
    role              smallint     not null check (role in (1, 2, 3)), -- 1 client, 2 client_staff, 3 contractor
    password_hash     varchar(200),
    google_id         varchar(100) unique,
    email_verified_at timestamptz,
    locale            smallint     not null default 1 check (locale in (1, 2)), -- 1 en, 2 fr
    created_at        timestamptz  not null,
    updated_at        timestamptz  not null
);

-- Table used by Spring Security's JdbcOneTimeTokenService (email links).
-- Same shape as Spring's schema, with username widened to hold "PURPOSE:email".
create table one_time_tokens (
    token_value varchar(36)  not null primary key,
    username    varchar(400) not null,
    expires_at  timestamp    not null
);
