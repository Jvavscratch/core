// 导出env模块
import * as envModule from './env';
// 导出util模块
import * as utilModule from './util';

// 导出所有内容
export {
  envModule,
  utilModule
};

// 导出子模块的具体内容
export * from './env/parseProgram';
export * from './env/transformSyntax';
export * from './util/scratch-type';