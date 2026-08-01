-- Creates the test database alongside the dev one.
--
-- Scripts in /docker-entrypoint-initdb.d run ONLY when the data directory is
-- empty — i.e. on a brand-new volume. Adding this file to a running stack does
-- nothing; the volume has to be recreated:
--
--   docker compose down -v && docker compose up -d
--
-- The dev database (`homematch`) is created by POSTGRES_DB in docker-compose.yml,
-- so only the test one is needed here.
--
-- Integration tests point at this via DATABASE_URL in backend/.env.test. Keeping
-- it a separate database rather than a schema means a truncate helper can never
-- reach dev data by accident.

CREATE DATABASE homematch_test OWNER homematch;
