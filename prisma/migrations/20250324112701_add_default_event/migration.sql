-- Insert a default event for the superadmin user
INSERT INTO "Event" ("id", "title", "description", "location", "startDate", "endDate", "imageUrl", "status", "createdAt", "updatedAt", "ownerId", "slug")
SELECT 
  'clv0default0event0000000000', -- Default ID for the event
  'Jesse George Church Dedication', -- Title
  'Church dedication ceremony for Jesse George.', -- Description
  'Lagos, Nigeria', -- Location
  CURRENT_TIMESTAMP, -- Start date (current time)
  CURRENT_TIMESTAMP + INTERVAL '2 days', -- End date (2 days from now)
  NULL, -- Image URL
  'published', -- Status
  CURRENT_TIMESTAMP, -- Created at
  CURRENT_TIMESTAMP, -- Updated at
  id, -- User ID from the User table
  'jessegeorge' -- Slug
FROM "User"
WHERE "role" = 'SUPERADMIN'
LIMIT 1; -- Only create one default event for the first superadmin

-- Also add the superadmin as an admin for this event
INSERT INTO "EventAdmin" ("id", "userId", "eventId", "createdAt")
SELECT 
  'clv0default0eventadmin000000', -- Default ID for the event admin
  id, -- User ID from the User table
  'clv0default0event0000000000', -- Event ID
  CURRENT_TIMESTAMP -- Created at
FROM "User"
WHERE "role" = 'SUPERADMIN'
LIMIT 1; -- Only for the first superadmin
