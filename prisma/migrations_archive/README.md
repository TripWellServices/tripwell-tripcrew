# Archived Prisma migrations

These migrations were replaced by `00000000000000_baseline_current_schema` on 2026-06-24.

The old chain could not replay cleanly in Prisma's shadow database because
`20250314120000_add_hike_and_itinerary_hike` referenced removed `ItineraryItem`
artifacts that were never created in-repo. The live database already matched the
current schema; history was squashed to a single baseline without data loss.

Do not move these back into `prisma/migrations/`.
