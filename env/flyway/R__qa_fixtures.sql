-- QA adjustments on top of the real data (owned by the suite, not by the API). Flyway applies them after the versioned
-- migrations, so the environment has the catalog and the reference ranges from the production seed (V5) with one
-- documented exception: btn_open@8 is left without a reference range, to prove black-box that without a range there
-- is no grading (422). Idempotent.

DELETE FROM app.default_range WHERE situation = 'btn_open' AND stack = 8;
