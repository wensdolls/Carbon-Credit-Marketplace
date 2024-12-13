import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock contract state
const contractState = {
  listings: new Map<number, any>(),
  nextListingId: 1,
};

// Mock contract call function
const mockContractCall = vi.fn((functionName: string, args: any[], sender: string) => {
  if (functionName === 'create-listing') {
    const [amount, price] = args;
    const listingId = contractState.nextListingId++;
    contractState.listings.set(listingId, {
      seller: sender,
      amount,
      price,
      active: true,
    });
    return { success: true, value: listingId };
  }
  if (functionName === 'cancel-listing') {
    const [listingId] = args;
    const listing = contractState.listings.get(listingId);
    if (!listing) {
      return { success: false, error: 100 }; // err-not-found
    }
    if (listing.seller !== sender) {
      return { success: false, error: 101 }; // err-unauthorized
    }
    if (!listing.active) {
      return { success: false, error: 102 }; // err-inactive-listing
    }
    listing.active = false;
    return { success: true };
  }
  if (functionName === 'buy-credits') {
    const [listingId] = args;
    const listing = contractState.listings.get(listingId);
    if (!listing) {
      return { success: false, error: 100 }; // err-not-found
    }
    if (!listing.active) {
      return { success: false, error: 102 }; // err-inactive-listing
    }
    // In a real scenario, we would check the buyer's balance here
    listing.active = false;
    return { success: true };
  }
  if (functionName === 'get-listing') {
    const [listingId] = args;
    const listing = contractState.listings.get(listingId);
    if (!listing) {
      return { success: false, error: 100 }; // err-not-found
    }
    return { success: true, value: listing };
  }
  return { success: false, error: 'Function not found' };
});

describe('Carbon Credit Marketplace Contract', () => {
  const user1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
  const user2 = 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0';
  
  beforeEach(() => {
    contractState.listings.clear();
    contractState.nextListingId = 1;
    mockContractCall.mockClear();
  });
  
  it('should create a listing', () => {
    const result = mockContractCall('create-listing', [100, 1000], user1);
    expect(result).toEqual({ success: true, value: 1 });
    expect(contractState.listings.get(1)).toEqual({
      seller: user1,
      amount: 100,
      price: 1000,
      active: true,
    });
  });
  
  it('should cancel a listing', () => {
    mockContractCall('create-listing', [100, 1000], user1);
    const result = mockContractCall('cancel-listing', [1], user1);
    expect(result).toEqual({ success: true });
    expect(contractState.listings.get(1).active).toBe(false);
  });
  
  it('should not allow non-seller to cancel a listing', () => {
    mockContractCall('create-listing', [100, 1000], user1);
    const result = mockContractCall('cancel-listing', [1], user2);
    expect(result).toEqual({ success: false, error: 101 });
    expect(contractState.listings.get(1).active).toBe(true);
  });
  
  it('should not cancel a non-existent listing', () => {
    const result = mockContractCall('cancel-listing', [999], user1);
    expect(result).toEqual({ success: false, error: 100 });
  });
  
  it('should not cancel an inactive listing', () => {
    mockContractCall('create-listing', [100, 1000], user1);
    mockContractCall('cancel-listing', [1], user1);
    const result = mockContractCall('cancel-listing', [1], user1);
    expect(result).toEqual({ success: false, error: 102 });
  });
  
  it('should buy credits', () => {
    mockContractCall('create-listing', [100, 1000], user1);
    const result = mockContractCall('buy-credits', [1], user2);
    expect(result).toEqual({ success: true });
    expect(contractState.listings.get(1).active).toBe(false);
  });
  
  it('should not buy credits from an inactive listing', () => {
    mockContractCall('create-listing', [100, 1000], user1);
    mockContractCall('cancel-listing', [1], user1);
    const result = mockContractCall('buy-credits', [1], user2);
    expect(result).toEqual({ success: false, error: 102 });
  });
  
  it('should not buy credits from a non-existent listing', () => {
    const result = mockContractCall('buy-credits', [999], user2);
    expect(result).toEqual({ success: false, error: 100 });
  });
  
  it('should get listing details', () => {
    mockContractCall('create-listing', [100, 1000], user1);
    const result = mockContractCall('get-listing', [1], user2);
    expect(result).toEqual({
      success: true,
      value: {
        seller: user1,
        amount: 100,
        price: 1000,
        active: true,
      },
    });
  });
  
  it('should not get details of a non-existent listing', () => {
    const result = mockContractCall('get-listing', [999], user1);
    expect(result).toEqual({ success: false, error: 100 });
  });
});

