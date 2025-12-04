-- Migration: chef_merge_function
-- Creates atomic chef merge operation with transaction safety
-- Created: 2025-12-05

CREATE OR REPLACE FUNCTION merge_duplicate_chefs(
  p_keeper_id UUID,
  p_loser_id UUID,
  p_merged_name TEXT,
  p_merged_slug TEXT,
  p_merged_bio TEXT,
  p_merged_photo_url TEXT,
  p_merged_instagram TEXT,
  p_merged_james_beard TEXT,
  p_chef_shows JSONB
) RETURNS JSONB AS $$
DECLARE
  v_restaurants_transferred INT;
  v_shows_inserted INT;
  v_result JSONB;
BEGIN
  -- Validate inputs
  IF p_keeper_id IS NULL OR p_loser_id IS NULL THEN
    RAISE EXCEPTION 'keeper_id and loser_id cannot be null';
  END IF;

  IF p_keeper_id = p_loser_id THEN
    RAISE EXCEPTION 'keeper_id and loser_id cannot be the same';
  END IF;

  -- Verify both chefs exist
  IF NOT EXISTS (SELECT 1 FROM chefs WHERE id = p_keeper_id) THEN
    RAISE EXCEPTION 'Keeper chef % does not exist', p_keeper_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM chefs WHERE id = p_loser_id) THEN
    RAISE EXCEPTION 'Loser chef % does not exist', p_loser_id;
  END IF;

  -- Start transaction (implicit in function)
  
  -- Step 1: Update keeper chef with merged data
  UPDATE chefs SET
    name = p_merged_name,
    slug = p_merged_slug,
    mini_bio = p_merged_bio,
    photo_url = p_merged_photo_url,
    instagram_handle = p_merged_instagram,
    james_beard_status = p_merged_james_beard,
    updated_at = NOW()
  WHERE id = p_keeper_id;

  -- Step 2: Transfer all restaurants from loser to keeper
  UPDATE restaurants
  SET chef_id = p_keeper_id, updated_at = NOW()
  WHERE chef_id = p_loser_id;

  GET DIAGNOSTICS v_restaurants_transferred = ROW_COUNT;

  -- Step 3: Delete old chef_shows for keeper
  DELETE FROM chef_shows WHERE chef_id = p_keeper_id;

  -- Step 4: Insert merged chef_shows
  -- Parse JSONB array and insert each show
  INSERT INTO chef_shows (chef_id, show_id, season, season_name, result, is_primary)
  SELECT 
    p_keeper_id,
    s.id,
    (show->>'season')::TEXT,
    (show->>'show_name')::TEXT || COALESCE(' ' || (show->>'season')::TEXT, ''),
    (show->>'result')::TEXT,
    (show->>'is_primary')::BOOLEAN
  FROM jsonb_array_elements(p_chef_shows) AS show
  JOIN shows s ON LOWER(s.name) = LOWER(show->>'show_name')
  ON CONFLICT (chef_id, show_id, season) DO NOTHING;

  GET DIAGNOSTICS v_shows_inserted = ROW_COUNT;

  -- Step 5: Delete loser chef (CASCADE will clean up any remaining relationships)
  DELETE FROM chefs WHERE id = p_loser_id;

  -- Return results
  v_result := jsonb_build_object(
    'success', true,
    'keeper_id', p_keeper_id,
    'loser_id', p_loser_id,
    'restaurants_transferred', v_restaurants_transferred,
    'shows_inserted', v_shows_inserted,
    'timestamp', NOW()
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically on exception
    RAISE EXCEPTION 'Chef merge failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION merge_duplicate_chefs TO authenticated;
GRANT EXECUTE ON FUNCTION merge_duplicate_chefs TO service_role;

-- Add comment
COMMENT ON FUNCTION merge_duplicate_chefs IS 
  'Atomically merges two duplicate chef records. Transfers restaurants, merges show data, and deletes the duplicate.';
