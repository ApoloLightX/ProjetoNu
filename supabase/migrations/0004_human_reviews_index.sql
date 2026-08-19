-- Cover the human_reviews foreign key for replay/review lookups and delete cascades.
create index if not exists idx_human_reviews_assessment_run
  on human_reviews(assessment_run_id);
