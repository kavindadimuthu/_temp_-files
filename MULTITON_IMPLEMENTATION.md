# Multi-Instance Support - Simplified Implementation

## Summary

Successfully implemented a **Multiton pattern** for `AsgardeoSPAClient` with minimal changes, keeping instance IDs as numbers to avoid breaking changes.

## Key Changes

### 1. Pattern Implementation
- Changed from Singleton to **Multiton pattern** (Map-based instance management)
- Keeps numeric instance IDs (default: 0) for backward compatibility
- Multiple instances can coexist for different authentication contexts

### 2. New Static Methods

```typescript
// Get or create instance (default ID: 0)
AsgardeoSPAClient.getInstance(id?: number): AsgardeoSPAClient

// Check if instance exists
AsgardeoSPAClient.hasInstance(id: number = 0): boolean

// Remove specific instance
AsgardeoSPAClient.destroyInstance(id: number = 0): boolean

// Get all active instance IDs
AsgardeoSPAClient.getInstanceKeys(): number[]

// Remove all instances
AsgardeoSPAClient.destroyAllInstances(): void
```

### 3. New Instance Method

```typescript
// Get the instance ID
instance.getInstanceId(): number
```

## Usage

### Single Instance (Default - No Changes Needed)
```typescript
const auth = AsgardeoSPAClient.getInstance();
// Same as: AsgardeoSPAClient.getInstance(0)
```

### Multiple Instances
```typescript
const auth1 = AsgardeoSPAClient.getInstance(0); // Default
const auth2 = AsgardeoSPAClient.getInstance(1);
const auth3 = AsgardeoSPAClient.getInstance(2);

await auth1.initialize(config1);
await auth2.initialize(config2);
await auth3.initialize(config3);
```

### Instance Management
```typescript
// Check if exists
if (AsgardeoSPAClient.hasInstance(1)) {
  const auth = AsgardeoSPAClient.getInstance(1);
}

// Get all active IDs
const ids = AsgardeoSPAClient.getInstanceKeys(); // [0, 1, 2]

// Destroy specific instance
AsgardeoSPAClient.destroyInstance(1);

// Destroy all
AsgardeoSPAClient.destroyAllInstances();
```

## Files Modified

- `packages/browser/src/__legacy__/client.ts` - Main client with Multiton pattern
- `packages/javascript/src/__legacy__/client.ts` - Base auth client
- `packages/browser/src/__legacy__/clients/main-thread-client.ts` - Main thread client
- `packages/browser/src/__legacy__/clients/web-worker-client.ts` - Web worker client
- `packages/browser/src/__legacy__/helpers/authentication-helper.ts` - Auth helper
- `packages/browser/src/__legacy__/utils/spa-utils.ts` - SPA utilities
- `packages/react/src/__temp__/api.ts` - React API wrapper

## Benefits

1. **Backward Compatible**: Existing code works without changes
2. **Multi-Context Support**: Can manage multiple authentication contexts
3. **Simple API**: Easy to understand and use
4. **Memory Management**: Can destroy unused instances
5. **No Breaking Changes**: Instance IDs remain as numbers

## Testing

All packages build successfully:
- ✅ `@asgardeo/javascript` builds
- ✅ `@asgardeo/browser` builds
- ✅ No compilation errors

## Next Steps (Future Enhancement)

When ready for full multi-tenancy with string-based keys:
1. Change instance ID type to `string | number`
2. Add tenant-specific configuration management
3. Add comprehensive examples and documentation
4. Implement tenant isolation features

For now, this provides a solid foundation for multi-instance support with minimal disruption.
