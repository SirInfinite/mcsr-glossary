begin;

create index glossary_term_reports_by_term
    on public.glossary_term_reports (term_id);

commit;
