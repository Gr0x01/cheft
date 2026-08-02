-- City counts are scoped by country, so country edits must trigger the same resync as city/state.

DROP TRIGGER IF EXISTS restaurants_city_sync ON restaurants;
CREATE TRIGGER restaurants_city_sync
AFTER INSERT OR DELETE OR UPDATE OF city, state, country, is_public, chef_id ON restaurants
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_sync_city_counts();
