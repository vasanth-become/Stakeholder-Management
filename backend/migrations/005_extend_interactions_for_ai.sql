-- Migration: Extend interactions table for AI-generated entries
-- Description: Add fields for AI-processed meeting notes

-- Add new columns to interactions table
ALTER TABLE interactions ADD COLUMN concerns TEXT;
ALTER TABLE interactions ADD COLUMN action_items TEXT;
ALTER TABLE interactions ADD COLUMN owner TEXT;
ALTER TABLE interactions ADD COLUMN ai_confidence_score REAL;
ALTER TABLE interactions ADD COLUMN ai_generated BOOLEAN DEFAULT 0;
ALTER TABLE interactions ADD COLUMN stakeholders_involved TEXT; -- JSON array of stakeholder names

-- Create index for AI-generated interactions
CREATE INDEX IF NOT EXISTS idx_interactions_ai_generated ON interactions(ai_generated);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at DESC);
