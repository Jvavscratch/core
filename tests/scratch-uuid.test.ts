import { uuid, includes } from '@jvavscratch/types';

describe('uuid', () => {
    it('should generate a string of default length 32', () => {
        const result = uuid(includes.scratch_alphanumeric);
        expect(typeof result).toBe('string');
        expect(result.length).toBe(32);
    });

    it('should generate a string of custom length', () => {
        const result = uuid(includes.alphanumeric, 10);
        expect(result.length).toBe(10);
    });

    it('should only contain characters from the given include set', () => {
        const result = uuid('abc', 100);
        for (const char of result) {
            expect('abc').toContain(char);
        }
    });

    it('should return empty string when length is 0', () => {
        const result = uuid(includes.scratch_alphanumeric, 0);
        expect(result).toBe('');
    });
});

describe('includes', () => {
    it('should have scratch_alphanumeric set', () => {
        expect(includes.scratch_alphanumeric).toBe('0123456789abcdef');
    });

    it('should have alphanumeric set', () => {
        expect(includes.alphanumeric).toBe('0123456789abcdefghijklmnopqrstuvwxyz');
    });
});
