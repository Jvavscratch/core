import { BlockCluster, createBlock, createMutation, isSpiky, isSpikyType } from '../src/util/blocks';
import { BlockOpCode } from '@jvavscratch/types';

describe('BlockCluster', () => {
    it('should initialize with empty blocks by default', () => {
        const cluster = new BlockCluster();
        expect(cluster.blocks).toEqual({});
    });

    it('should initialize with given blocks', () => {
        const initial = { a: createBlock({ opcode: BlockOpCode.MotionMoveSteps }) };
        const cluster = new BlockCluster(initial);
        expect(cluster.blocks).toEqual(initial);
    });

    it('should add blocks correctly', () => {
        const cluster = new BlockCluster();
        cluster.addBlocks({ a: createBlock({ opcode: BlockOpCode.MotionMoveSteps }) });
        cluster.addBlocks({ b: createBlock({ opcode: BlockOpCode.LooksSay }) });
        expect(Object.keys(cluster.blocks)).toHaveLength(2);
        expect(cluster.blocks.a.opcode).toBe(BlockOpCode.MotionMoveSteps);
        expect(cluster.blocks.b.opcode).toBe(BlockOpCode.LooksSay);
    });
});

describe('createBlock', () => {
    it('should create a block with default values', () => {
        const block = createBlock();
        expect(block.opcode).toBe(BlockOpCode.EventWhenFlagClicked);
        expect(block.next).toBeNull();
        expect(block.parent).toBeNull();
        expect(block.inputs).toEqual({});
        expect(block.fields).toEqual({});
        expect(block.shadow).toBe(false);
        expect(block.topLevel).toBe(false);
        expect(block.x).toBe(0);
        expect(block.y).toBe(0);
    });

    it('should create a block with overridden values', () => {
        const block = createBlock({
            opcode: BlockOpCode.MotionMoveSteps,
            next: 'nextBlock',
            x: 100,
            y: 200,
        });
        expect(block.opcode).toBe(BlockOpCode.MotionMoveSteps);
        expect(block.next).toBe('nextBlock');
        expect(block.x).toBe(100);
        expect(block.y).toBe(200);
    });
});

describe('createMutation', () => {
    it('should create a mutation with default values', () => {
        const mutation = createMutation();
        expect(mutation.mutation).toEqual({});
    });

    it('should create a mutation with custom mutation data', () => {
        const mutation = createMutation({
            opcode: BlockOpCode.ProceduresDefinition,
            mutation: { proccode: 'my block' },
        });
        expect(mutation.opcode).toBe(BlockOpCode.ProceduresDefinition);
        expect(mutation.mutation).toEqual({ proccode: 'my block' });
    });
});

describe('isSpiky', () => {
    it('should return true for spiky blocks', () => {
        expect(isSpiky(BlockOpCode.OperatorGreaterThan)).toBe(true);
        expect(isSpiky(BlockOpCode.SensingKeyPressed)).toBe(true);
        expect(isSpiky(BlockOpCode.OperatorAnd)).toBe(true);
    });

    it('should return false for non-spiky blocks', () => {
        expect(isSpiky(BlockOpCode.MotionMoveSteps)).toBe(false);
        expect(isSpiky(BlockOpCode.LooksSay)).toBe(false);
        expect(isSpiky(BlockOpCode.EventWhenFlagClicked)).toBe(false);
    });
});

describe('isSpikyType', () => {
    it('should return true for known spiky function combinations', () => {
        expect(isSpikyType('operation', 'stringContains')).toBe(true);
        expect(isSpikyType('sensing', 'touching')).toBe(true);
        expect(isSpikyType('sensing', 'mouseDown')).toBe(true);
    });

    it('should return false for unknown combinations', () => {
        expect(isSpikyType('motion', 'moveSteps')).toBe(false);
        expect(isSpikyType('operation', 'add')).toBe(false);
        expect(isSpikyType('unknown', 'unknown')).toBe(false);
    });
});
