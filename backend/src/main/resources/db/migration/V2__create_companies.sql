create table companies (
    id                  bigint generated always as identity primary key,
    uuid                uuid         not null unique,
    owner_id            bigint       not null references users (id),
    name                varchar(200) not null,
    country             varchar(2)   not null, -- ISO 3166 code, for example FR
    registration_number varchar(50)  not null, -- upper case, without spaces
    industries          smallint[]   not null default '{}', -- codes 1–14, see Company.INDUSTRIES
    logo                bytea,
    logo_content_type   varchar(20),
    created_at          timestamptz  not null,
    updated_at          timestamptz  not null,
    unique (country, registration_number)
);

create index companies_owner_id on companies (owner_id);
