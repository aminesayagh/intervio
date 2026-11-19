-- One table for every uploaded file (logos, documents, reports). Contents live on disk, under storage_key.
create table files (
    id          bigint generated always as identity primary key,
    uuid        uuid        not null unique,
    purpose     smallint    not null check (purpose in (1, 2)), -- 1 company logo, 2 document
    uploaded_by bigint      not null references users (id),
    storage_key varchar(36) not null unique,
    metadata    jsonb       not null, -- contentType, sizeBytes, sha256, originalName, width, height
    attached_at timestamptz,          -- null until a business record uses the file
    created_at  timestamptz not null
);

create index files_unattached on files (created_at) where attached_at is null;

-- The logo is now a file. Logos stored so far (development data only) are dropped.
alter table companies drop column logo, drop column logo_content_type,
    add column logo_file_id bigint references files (id);
