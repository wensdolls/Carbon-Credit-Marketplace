import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock contract state
const contractState = {
  projects: new Map<number, any>(),
  nextProjectId: 1,
};

// Mock contract call function
const mockContractCall = vi.fn((functionName: string, args: any[], sender: string) => {
  if (functionName === 'register-project') {
    const [description] = args;
    const projectId = contractState.nextProjectId++;
    contractState.projects.set(projectId, {
      owner: sender,
      description,
      verified: false,
      creditsIssued: 0,
    });
    return { success: true, value: projectId };
  }
  if (functionName === 'verify-project') {
    const [projectId] = args;
    if (sender !== 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM') {
      return { success: false, error: 100 }; // err-owner-only
    }
    const project = contractState.projects.get(projectId);
    if (!project) {
      return { success: false, error: 101 }; // err-not-found
    }
    if (project.verified) {
      return { success: false, error: 102 }; // err-already-verified
    }
    project.verified = true;
    return { success: true };
  }
  if (functionName === 'issue-credits') {
    const [projectId, amount] = args;
    if (sender !== 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM') {
      return { success: false, error: 100 }; // err-owner-only
    }
    const project = contractState.projects.get(projectId);
    if (!project) {
      return { success: false, error: 101 }; // err-not-found
    }
    if (!project.verified) {
      return { success: false, error: 101 }; // err-not-found (used for unverified projects)
    }
    project.creditsIssued += amount;
    return { success: true };
  }
  if (functionName === 'get-project') {
    const [projectId] = args;
    const project = contractState.projects.get(projectId);
    if (!project) {
      return { success: false, error: 101 }; // err-not-found
    }
    return { success: true, value: project };
  }
  return { success: false, error: 'Function not found' };
});

describe('Carbon Offset Projects Contract', () => {
  const contractOwner = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const user1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
  const user2 = 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0';
  
  beforeEach(() => {
    contractState.projects.clear();
    contractState.nextProjectId = 1;
    mockContractCall.mockClear();
  });
  
  it('should register a project', () => {
    const result = mockContractCall('register-project', ['Test Project'], user1);
    expect(result).toEqual({ success: true, value: 1 });
    expect(contractState.projects.get(1)).toEqual({
      owner: user1,
      description: 'Test Project',
      verified: false,
      creditsIssued: 0,
    });
  });
  
  it('should verify a project', () => {
    mockContractCall('register-project', ['Test Project'], user1);
    const result = mockContractCall('verify-project', [1], contractOwner);
    expect(result).toEqual({ success: true });
    expect(contractState.projects.get(1).verified).toBe(true);
  });
  
  it('should not allow non-owner to verify a project', () => {
    mockContractCall('register-project', ['Test Project'], user1);
    const result = mockContractCall('verify-project', [1], user1);
    expect(result).toEqual({ success: false, error: 100 });
    expect(contractState.projects.get(1).verified).toBe(false);
  });
  
  it('should not verify a non-existent project', () => {
    const result = mockContractCall('verify-project', [999], contractOwner);
    expect(result).toEqual({ success: false, error: 101 });
  });
  
  it('should not verify an already verified project', () => {
    mockContractCall('register-project', ['Test Project'], user1);
    mockContractCall('verify-project', [1], contractOwner);
    const result = mockContractCall('verify-project', [1], contractOwner);
    expect(result).toEqual({ success: false, error: 102 });
  });
  
  it('should issue credits to a verified project', () => {
    mockContractCall('register-project', ['Test Project'], user1);
    mockContractCall('verify-project', [1], contractOwner);
    const result = mockContractCall('issue-credits', [1, 100], contractOwner);
    expect(result).toEqual({ success: true });
    expect(contractState.projects.get(1).creditsIssued).toBe(100);
  });
  
  it('should not issue credits to an unverified project', () => {
    mockContractCall('register-project', ['Test Project'], user1);
    const result = mockContractCall('issue-credits', [1, 100], contractOwner);
    expect(result).toEqual({ success: false, error: 101 });
    expect(contractState.projects.get(1).creditsIssued).toBe(0);
  });
  
  it('should not allow non-owner to issue credits', () => {
    mockContractCall('register-project', ['Test Project'], user1);
    mockContractCall('verify-project', [1], contractOwner);
    const result = mockContractCall('issue-credits', [1, 100], user1);
    expect(result).toEqual({ success: false, error: 100 });
    expect(contractState.projects.get(1).creditsIssued).toBe(0);
  });
  
  it('should get project details', () => {
    mockContractCall('register-project', ['Test Project'], user1);
    mockContractCall('verify-project', [1], contractOwner);
    mockContractCall('issue-credits', [1, 100], contractOwner);
    const result = mockContractCall('get-project', [1], user2);
    expect(result).toEqual({
      success: true,
      value: {
        owner: user1,
        description: 'Test Project',
        verified: true,
        creditsIssued: 100,
      },
    });
  });
  
  it('should not get details of a non-existent project', () => {
    const result = mockContractCall('get-project', [999], user1);
    expect(result).toEqual({ success: false, error: 101 });
  });
});
