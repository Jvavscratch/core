import {
    ScratchType,
    getScratchType,
    getColor,
    getVariable,
    getBlockNumber,
    getMenu,
    getBroadcast,
    getSubstack,
    getList,
} from '@jvavscratch/types';

describe('ScratchType enum', () => {
    it('should have correct values', () => {
        expect(ScratchType.number).toBe(4);
        expect(ScratchType.string).toBe(10);
        expect(ScratchType.variable).toBe(12);
        expect(ScratchType.list).toBe(13);
    });
});

describe('getScratchType', () => {
    it('should return a ScratchInput tuple', () => {
        const result = getScratchType(ScratchType.number, 42);
        expect(result).toEqual([1, [ScratchType.number, 42]]);
    });
});

describe('getColor', () => {
    it('should return a color ScratchInput with hex value', () => {
        const result = getColor(ScratchType.color, null, '#ff0000');
        expect(result).toEqual([1, [ScratchType.color, null, '#ff0000']]);
    });
});

describe('getVariable', () => {
    it('should return a variable ScratchInput', () => {
        const result = getVariable('myVar');
        expect(result).toEqual([
            3,
            [12, 'myVar', 'myVar'],
            [4, ''],
        ]);
    });
});

describe('getList', () => {
    it('should return a list ScratchInput', () => {
        const result = getList('myList');
        expect(result).toEqual([
            3,
            [13, 'myList', 'myList'],
            [4, ''],
        ]);
    });
});

describe('getBlockNumber', () => {
    it('should return a block number ScratchInput', () => {
        const result = getBlockNumber('block123');
        expect(result).toEqual([
            3,
            'block123',
            [4, ''],
        ]);
    });
});

describe('getBroadcast', () => {
    it('should return a broadcast ScratchInput', () => {
        const result = getBroadcast('hello');
        expect(result).toEqual([1, [11, 'hello', 'hello']]);
    });
});

describe('getMenu', () => {
    it('should return a menu ScratchInput', () => {
        const result = getMenu('_mouse_');
        expect(result).toEqual([1, '_mouse_']);
    });
});

describe('getSubstack', () => {
    it('should return a substack ScratchInput', () => {
        const result = getSubstack('block456');
        expect(result).toEqual([2, 'block456']);
    });
});
