---
Last-Updated: 2025-11-30
Maintainer: RB
Status: Implemented
---

# Row Level Security (RLS) Configuration

## Overview

The TV Chef Map project implements comprehensive Row Level Security (RLS) to ensure safe public access to restaurant data while preventing unauthorized modifications. This setup allows anonymous users to read public restaurant information without any risk of data corruption or security breaches.

## RLS Implementation Status

### ✅ Completed Security Measures

1. **RLS Enabled on All Tables**
   - `shows` - RLS enabled ✅
   - `chefs` - RLS enabled ✅  
   - `restaurants` - RLS enabled ✅
   - `restaurant_embeddings` - RLS enabled ✅

2. **Read-Only Policies for Anonymous Users**
   ```sql
   -- Shows: Allow anyone to read all shows
   CREATE POLICY "Shows are viewable by everyone" 
   ON shows FOR SELECT USING (true);

   -- Chefs: Allow anyone to read all chefs  
   CREATE POLICY "Chefs are viewable by everyone"
   ON chefs FOR SELECT USING (true);

   -- Restaurants: Allow anyone to read public restaurants only
   CREATE POLICY "Public restaurants are viewable by everyone"
   ON restaurants FOR SELECT USING (is_public = true);

   -- Restaurant embeddings: Allow anyone to read (for future semantic search)
   CREATE POLICY "Restaurant embeddings are viewable by everyone"
   ON restaurant_embeddings FOR SELECT USING (true);
   ```

3. **Write Operation Denial Policies**
   ```sql
   -- Explicit denial of INSERT operations
   CREATE POLICY "Deny INSERT on [table]" ON [table] FOR INSERT WITH CHECK (false);

   -- Explicit denial of UPDATE operations  
   CREATE POLICY "Deny UPDATE on [table]" ON [table] FOR UPDATE USING (false) WITH CHECK (false);

   -- Explicit denial of DELETE operations
   CREATE POLICY "Deny DELETE on [table]" ON [table] FOR DELETE USING (false);
   ```

## Frontend Security Configuration

### Secure Client Setup

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// ✅ SECURE: Only uses anonymous key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ✅ SECURE: Client respects RLS policies
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false, // No user auth needed
  }
});

// ❌ REMOVED: Service role key not exposed to frontend
// Never expose SUPABASE_SERVICE_ROLE_KEY in client code
```

### Database Helper Functions

All database operations use the secure anonymous client:

```typescript
export const db = {
  async getRestaurants() {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('restaurants')
      .select(`*, chef:chefs(*)`)
      .eq('is_public', true)  // ✅ RLS ensures this
      .order('name');
    
    return data as RestaurantWithChef[];
  }
  // ... other read-only operations
};
```

## Testing Results

### ✅ RLS Validation Tests

1. **Read Operations (Allowed)**
   - ✅ Shows: Successfully read 5 records
   - ✅ Chefs: Successfully read 180 records  
   - ✅ Restaurants: Successfully read 311 public records
   - ✅ Search: Working with proper filtering

2. **Write Operations (Denied)**
   - ✅ INSERT: Correctly denied with RLS policy error
   - ✅ UPDATE: No rows affected (RLS blocks access to rows)
   - ✅ DELETE: No rows affected (RLS blocks access to rows)

## Security Architecture

### User Roles & Permissions

| Role | Read Access | Write Access | Use Case |
|------|-------------|--------------|----------|
| `anon` (Anonymous) | Public restaurants only | ❌ Denied | Website visitors |
| `authenticated` | Not used | Not used | Future user accounts |
| `service_role` | Full access (bypasses RLS) | Full access | Admin scripts only |

### Data Visibility Control

- **Public Data**: All shows, chefs, and restaurants where `is_public = true`
- **Private Data**: Restaurants with `is_public = false` (hidden from anonymous users)
- **Admin Data**: Full access via service role key in server-side scripts only

### Security Boundaries

```
┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐
│   Frontend      │    │   Supabase RLS   │    │   Database     │
│                 │    │                  │    │                │
│ Anonymous Key   ├────► Read-only        ├────► Public Data    │
│ (Public)        │    │ Policies         │    │ Only           │
│                 │    │                  │    │                │
└─────────────────┘    └──────────────────┘    └────────────────┘
                              ▲
                              │ Bypasses RLS
                              │
┌─────────────────┐    ┌──────▼──────────────┐    ┌────────────────┐
│   Admin Scripts │    │   Service Role      │    │   Full Access  │
│                 │    │   Key               │    │   All Data     │
│ Server-side     ├────► (Import/Migration   ├────► (Private)      │
│ Only            │    │  Operations)        │    │                │
│                 │    │                     │    │                │
└─────────────────┘    └─────────────────────┘    └────────────────┘
```

## Environment Variables

### Production-Ready Configuration

```bash
# .env.local (Safe for frontend)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anonymous_key"

# .env.local (Server-side only - never expose to client)
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

### Security Checklist

- ✅ Anonymous key used in frontend (respects RLS)
- ✅ Service role key only in server-side scripts
- ✅ No service role key exposed to client bundle
- ✅ RLS policies tested and validated
- ✅ Write operations properly denied
- ✅ Public data filtering working correctly

## Performance Implications

### RLS Policy Performance

- **SELECT Policies**: Simple boolean checks (`true`, `is_public = true`) - very fast
- **Denial Policies**: Short-circuit to `false` - minimal overhead
- **Index Usage**: Existing indexes on `is_public` field support fast filtering
- **Query Impact**: No measurable performance degradation

### Monitoring & Maintenance

- Monitor Supabase logs for unauthorized access attempts
- Review RLS policies during schema changes
- Test anonymous access after any policy modifications
- Verify `is_public` field integrity during data imports

## Future Enhancements

### Potential Additions

1. **Authenticated User Policies**: For future user accounts or admin panel
2. **Rate Limiting**: Additional protection via Supabase dashboard
3. **API Key Rotation**: Regular rotation of anonymous keys
4. **Audit Logging**: Track all database access for security monitoring

### Schema Considerations

- The `is_public` field provides granular visibility control
- Can easily add user-specific policies if authentication is added
- Restaurant-level privacy controls ready for admin interface
- Future multi-tenancy support possible with organization-based policies

## Conclusion

The RLS implementation provides enterprise-grade security for a public-facing application:

- **Zero Risk**: Anonymous users cannot modify any data
- **Granular Control**: Public/private data separation via `is_public` field  
- **Performance**: No impact on read operations
- **Scalable**: Ready for future authentication and admin features
- **Tested**: Comprehensive validation of all security boundaries

This configuration ensures the TV Chef Map can safely serve public data while maintaining complete administrative control over the restaurant database.