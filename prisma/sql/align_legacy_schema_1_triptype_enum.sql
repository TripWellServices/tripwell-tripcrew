-- Part 1: extend TripType (must commit before using new labels in another transaction)
ALTER TYPE "TripType" ADD VALUE IF NOT EXISTS 'SINGLE_DAY';
ALTER TYPE "TripType" ADD VALUE IF NOT EXISTS 'MULTI_DAY';
