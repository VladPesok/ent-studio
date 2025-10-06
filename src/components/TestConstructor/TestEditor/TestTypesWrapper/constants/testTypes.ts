// Test Type Constants
export const TEST_TYPES = {
  HANDICAP_INDEX: 'handicapIndex'
} as const;

export type TestType = typeof TEST_TYPES[keyof typeof TEST_TYPES];

// Test Type Configuration with translation keys
export const TEST_TYPE_CONFIG = [
  { 
    value: TEST_TYPES.HANDICAP_INDEX, 
    labelKey: 'testTypes.handicapIndex' 
  }
];