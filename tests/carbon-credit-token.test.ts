import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock contract state
const contractState = {
  balances: new Map<string, number>(),
  tokenUri: '',
};

// Mock contract call function
const mockContractCall = vi.fn((functionName: string, args: any[], sender: string) => {
  if (functionName === 'mint') {
    const [amount, recipient] = args;
    if (sender !== 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM') {
      return { success: false, error: 100 }; // err-owner-only
    }
    contractState.balances.set(recipient, (contractState.balances.get(recipient) || 0) + amount);
    return { success: true };
  }
  if (functionName === 'transfer') {
    const [amount, sender, recipient] = args;
    if (contractState.balances.get(sender) < amount) {
      return { success: false, error: 101 }; // err-insufficient-balance
    }
    contractState.balances.set(sender, contractState.balances.get(sender) - amount);
    contractState.balances.set(recipient, (contractState.balances.get(recipient) || 0) + amount);
    return { success: true };
  }
  if (functionName === 'get-balance') {
    const [account] = args;
    return { success: true, value: contractState.balances.get(account) || 0 };
  }
  if (functionName === 'set-token-uri') {
    const [newUri] = args;
    if (sender !== 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM') {
      return { success: false, error: 100 }; // err-owner-only
    }
    contractState.tokenUri = newUri;
    return { success: true };
  }
  if (functionName === 'get-token-uri') {
    return { success: true, value: contractState.tokenUri };
  }
  return { success: false, error: 'Function not found' };
});

describe('Carbon Credit Token Contract', () => {
  const contractOwner = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const user1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
  const user2 = 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0';
  
  beforeEach(() => {
    contractState.balances.clear();
    contractState.tokenUri = '';
    mockContractCall.mockClear();
  });
  
  it('should mint tokens', () => {
    const result = mockContractCall('mint', [100, user1], contractOwner);
    expect(result).toEqual({ success: true });
    expect(contractState.balances.get(user1)).toBe(100);
  });
  
  it('should not allow non-owner to mint tokens', () => {
    const result = mockContractCall('mint', [100, user1], user1);
    expect(result).toEqual({ success: false, error: 100 });
    expect(contractState.balances.get(user1)).toBeUndefined();
  });
  
  it('should transfer tokens', () => {
    mockContractCall('mint', [100, user1], contractOwner);
    const result = mockContractCall('transfer', [50, user1, user2], user1);
    expect(result).toEqual({ success: true });
    expect(contractState.balances.get(user1)).toBe(50);
    expect(contractState.balances.get(user2)).toBe(50);
  });
  
  it('should not transfer tokens if balance is insufficient', () => {
    mockContractCall('mint', [100, user1], contractOwner);
    const result = mockContractCall('transfer', [150, user1, user2], user1);
    expect(result).toEqual({ success: false, error: 101 });
    expect(contractState.balances.get(user1)).toBe(100);
    expect(contractState.balances.get(user2)).toBeUndefined();
  });
  
  it('should get balance', () => {
    mockContractCall('mint', [100, user1], contractOwner);
    const result = mockContractCall('get-balance', [user1], user1);
    expect(result).toEqual({ success: true, value: 100 });
  });
  
  it('should set token URI', () => {
    const newUri = 'https://example.com/token-metadata';
    const result = mockContractCall('set-token-uri', [newUri], contractOwner);
    expect(result).toEqual({ success: true });
    expect(contractState.tokenUri).toBe(newUri);
  });
  
  it('should not allow non-owner to set token URI', () => {
    const newUri = 'https://example.com/token-metadata';
    const result = mockContractCall('set-token-uri', [newUri], user1);
    expect(result).toEqual({ success: false, error: 100 });
    expect(contractState.tokenUri).toBe('');
  });
  
  it('should get token URI', () => {
    const newUri = 'https://example.com/token-metadata';
    mockContractCall('set-token-uri', [newUri], contractOwner);
    const result = mockContractCall('get-token-uri', [], user1);
    expect(result).toEqual({ success: true, value: newUri });
  });
});

