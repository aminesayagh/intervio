-- Interventions on the client board (decisions 92-95).

-- The registered address, asked with the company's first intervention (decision 59).
alter table companies
    add column street      varchar(200),
    add column city        varchar(100),
    add column postal_code varchar(20);

create table interventions (
    id                       bigint generated always as identity primary key,
    uuid                     uuid         not null unique,
    company_id               bigint       not null references companies (id) on delete cascade,
    title                    varchar(200) not null,
    description              varchar(2000) not null default '',
    offer_deadline           date         not null,
    offer_deadline_extension date,
    published_at             timestamptz, -- null while the intervention is a draft
    created_at               timestamptz  not null,
    updated_at               timestamptz  not null
);
create index interventions_company on interventions (company_id, updated_at desc);

-- What the company has: equipment, site access, staff time, documents (type 4, with its file).
create table resources (
    id          bigint generated always as identity primary key,
    uuid        uuid         not null unique,
    company_id  bigint       not null references companies (id) on delete cascade,
    name        varchar(200) not null,
    type        smallint     not null check (type in (1, 2, 3, 4)), -- 1 equipment, 2 site access, 3 staff time, 4 document
    description varchar(2000) not null default '',
    quantity    integer,
    file_id     bigint references files (id) on delete cascade,
    created_at  timestamptz  not null,
    updated_at  timestamptz  not null
);

create table intervention_documents (
    resource_id     bigint      not null references resources (id) on delete cascade,
    intervention_id bigint      not null references interventions (id) on delete cascade,
    type            smallint    not null check (type in (1, 2)), -- 1 specification, 2 shared
    created_at      timestamptz not null,
    primary key (resource_id, intervention_id)
);

-- The interventions each user opened, for the sidebar's "last opened" list.
create table intervention_visits (
    user_id         bigint      not null references users (id) on delete cascade,
    intervention_id bigint      not null references interventions (id) on delete cascade,
    visited_at      timestamptz not null,
    primary key (user_id, intervention_id)
);
create index intervention_visits_recent on intervention_visits (user_id, visited_at desc);
