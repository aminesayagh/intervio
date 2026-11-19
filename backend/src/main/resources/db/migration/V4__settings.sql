-- Settings (decisions 86-91): profile photo, email change waiting for confirmation,
-- and "Log out of other devices".
alter table users
    add column photo_file_id        bigint references files (id),
    add column pending_email        varchar(320),
    add column sessions_valid_after timestamptz, -- sessions and "Remember me" cookies older than this are ended
    add column google_picture_url   varchar(1000); -- the Google account photo, shown when no photo is uploaded

alter table files drop constraint files_purpose_check;
alter table files add constraint files_purpose_check check (purpose in (1, 2, 3)); -- 3 profile photo

-- An email-change link names both addresses (see AuthService.requestEmailChange).
alter table one_time_tokens alter column username type varchar(700);
