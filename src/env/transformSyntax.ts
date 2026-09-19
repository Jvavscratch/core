/*******************************************************************
* Copyright         : 2025 NeuronPulse
* File Name         : transformSyntax.ts
* Description       : Transforms unsupported syntax to supported syntax
*                    for jvavscratch
* Revision History  :
* Date        Author          Comments
* ------------------------------------------------------------------
* 10/12/2025  NeuronPulse     Initial creation
/******************************************************************/

import * as babel from '@babel/core';
import { Node, IfStatement, BlockStatement, ExpressionStatement, AssignmentExpression, VariableDeclarator, MemberExpression } from '@babel/types';

// 转换选项
const transformOptions: babel.TransformOptions = {
  plugins: [
    // 自定义插件用于转换不支持的语法
    function transformUnsupportedSyntax() {
      return {
        visitor: {
          // 转换 ** 幂运算符为 math.pow() 调用（Scratch 无原生幂运算积木）
          BinaryExpression(path: babel.NodePath<babel.types.BinaryExpression>) {
            if (path.node.operator === '**') {
              path.replaceWith(
                babel.types.callExpression(
                  babel.types.memberExpression(
                    babel.types.identifier('math'),
                    babel.types.identifier('pow')
                  ),
                  [path.node.left as babel.types.Expression, path.node.right as babel.types.Expression]
                )
              );
            }
          },

          // 转换三元表达式 (condition ? expr1 : expr2) 为 if-else 语句
          ConditionalExpression(path: babel.NodePath<babel.types.ConditionalExpression>) {
            const { test, consequent, alternate } = path.node;

            // 判断是否在条件上下文中（if/while/for 的条件部分）
            const isInCondition = path.findParent((p: babel.NodePath) =>
              (p.isIfStatement() && (p.node as any).test === path.node) ||
              (p.isWhileStatement() && (p.node as any).test === path.node) ||
              (p.isForStatement() && (p.node as any).test === path.node) ||
              (p.isLogicalExpression() && (
                (p.node as any).left === path.node || (p.node as any).right === path.node
              ))
            );

            // 如果在条件上下文中，保持原样（让它作为 boolean 表达式）
            if (isInCondition) {
              return;
            }

            // 获取需要替换的父节点
            const parent = path.findParent((p: babel.NodePath) =>
              p.isVariableDeclarator() ||
              p.isAssignmentExpression() ||
              p.isReturnStatement() ||
              p.isCallExpression() ||
              p.isBinaryExpression()
            );

            if (!parent) return;

            // 创建临时变量名
            const tempVar = babel.types.identifier('__jvavscratch_temp');
            const varDecl = babel.types.variableDeclaration('let', [
              babel.types.variableDeclarator(tempVar)
            ]);

            const ifStatement = babel.types.ifStatement(
              test,
              babel.types.blockStatement([
                babel.types.expressionStatement(
                  babel.types.assignmentExpression('=', tempVar, consequent)
                )
              ]),
              babel.types.blockStatement([
                babel.types.expressionStatement(
                  babel.types.assignmentExpression('=', tempVar, alternate)
                )
              ])
            );

            if (parent.isVariableDeclarator()) {
              const varStmtPath = path.findParent((p: babel.NodePath) => p.isVariableDeclaration());
              if (varStmtPath) {
                varStmtPath.replaceWithMultiple([varDecl, ifStatement]);
              }
            } else if (parent.isAssignmentExpression()) {
              const exprStmtPath = path.findParent((p: babel.NodePath) => p.isExpressionStatement());
              if (exprStmtPath) {
                exprStmtPath.replaceWithMultiple([varDecl, ifStatement]);
              }
            } else if (parent.isReturnStatement()) {
              const returnStmt = babel.types.returnStatement(tempVar);
              parent.replaceWithMultiple([varDecl, ifStatement, returnStmt]);
            } else if (parent.isCallExpression() || parent.isBinaryExpression()) {
              // 对于函数参数或二元表达式中的三元表达式，
              // 需要找到最近的语句级父节点来替换
              const stmtPath = path.findParent((p: babel.NodePath) =>
                p.isExpressionStatement() || p.isReturnStatement()
              );
              if (stmtPath && stmtPath.isExpressionStatement()) {
                // 创建一个 IIFE 风格的替换：先计算 temp，再使用 temp
                // 但由于 Scratch 限制，这里只能拆成多条语句
                // 获取原始表达式的父节点中的其他部分需要更复杂的处理
                // 简化处理：只替换当前条件表达式为 tempVar
                path.replaceWith(tempVar);
                // 在语句前插入 varDecl 和 ifStatement
                stmtPath.insertBefore([varDecl, ifStatement]);
              } else if (stmtPath && stmtPath.isReturnStatement()) {
                path.replaceWith(tempVar);
                stmtPath.insertBefore([varDecl, ifStatement]);
              }
            }
          },

          // 转换非条件上下文中的 && / || 为三元表达式（保持 JS 短路语义）
          LogicalExpression(path: babel.NodePath<babel.types.LogicalExpression>) {
            const { operator, left, right } = path.node;

            // 只处理 && 和 ||
            if (operator !== '&&' && operator !== '||') {
              return;
            }

            // 判断是否在条件上下文中
            const isInCondition = path.findParent((p: babel.NodePath) =>
              (p.isIfStatement() && (p.node as any).test === path.node) ||
              (p.isWhileStatement() && (p.node as any).test === path.node) ||
              (p.isForStatement() && (p.node as any).test === path.node) ||
              (p.isLogicalExpression() && (
                (p.node as any).left === path.node || (p.node as any).right === path.node
              ))
            );

            // 如果在条件上下文中，保持原样
            if (isInCondition) {
              return;
            }

            // 转换为三元表达式
            if (operator === '&&') {
              path.replaceWith(
                babel.types.conditionalExpression(
                  left,
                  right,
                  left
                )
              );
            } else if (operator === '||') {
              path.replaceWith(
                babel.types.conditionalExpression(
                  left,
                  left,
                  right
                )
              );
            }
          },
          
          // 转换 for 循环内的变量声明到循环外部
          ForStatement(path: babel.NodePath<babel.types.ForStatement>) {
            const { init } = path.node;
            
            // 检查 init 是否为变量声明（如 for(let i=0; ...)）
            if (init?.type === 'VariableDeclaration' && init.kind !== 'var') {
              // 创建相同的变量声明，提升到循环外部
              const outerVarDecl = babel.types.variableDeclaration(
                init.kind,
                [...init.declarations]
              );
              
              // 在循环前插入变量声明
              path.insertBefore(outerVarDecl);
              
              // 将循环内的变量声明替换为赋值表达式
              if (init.declarations.length === 1) {
                const decl = init.declarations[0];
                
                // 确保 decl.id 不是 VoidPattern 或 ArrayPattern
                if (babel.types.isVoidPattern(decl.id) || babel.types.isArrayPattern(decl.id)) {
                  return;
                }
                
                if (decl.init) {
                  // 只保留赋值部分
                  path.node.init = babel.types.assignmentExpression(
                    '=',
                    decl.id as babel.types.LVal,
                    decl.init
                  );
                } else {
                  // 如果没有初始化器，则使用标识符
                  path.node.init = decl.id as babel.types.Expression;
                }
              }
            }
          },

          // 转换列表访问语法 myList[index] -> list.getItem("myList", index)
          // 转换列表长度语法 myList.length -> list.length("myList")
          // 转换 Math.PI -> math.pi()
          MemberExpression(path: babel.NodePath<babel.types.MemberExpression>) {
            const { node } = path;
            if (!babel.types.isIdentifier(node.object)) return;
            
            const objName = node.object.name;
            
            if (node.computed) {
              // myList[index] -> list.getItem("myList", index)
              path.replaceWith(
                babel.types.callExpression(
                  babel.types.memberExpression(
                    babel.types.identifier('list'),
                    babel.types.identifier('getItem')
                  ),
                  [babel.types.stringLiteral(objName), node.property as babel.types.Expression]
                )
              );
            } else if (babel.types.isIdentifier(node.property) && node.property.name === 'length') {
              // myList.length -> list.length("myList")
              path.replaceWith(
                babel.types.callExpression(
                  babel.types.memberExpression(
                    babel.types.identifier('list'),
                    babel.types.identifier('length')
                  ),
                  [babel.types.stringLiteral(objName)]
                )
              );
            } else if (objName === 'Math' && babel.types.isIdentifier(node.property) && node.property.name === 'PI') {
              // Math.PI -> math.pi()
              path.replaceWith(
                babel.types.callExpression(
                  babel.types.memberExpression(
                    babel.types.identifier('math'),
                    babel.types.identifier('pi')
                  ),
                  []
                )
              );
            }
          },

          // 转换 Math.xxx() 标准数学函数调用
          CallExpression(path: babel.NodePath<babel.types.CallExpression>) {
            const { node } = path;
            if (!babel.types.isMemberExpression(node.callee)) return;
            if (!babel.types.isIdentifier(node.callee.object)) return;
            if (node.callee.object.name !== 'Math') return;
            if (!babel.types.isIdentifier(node.callee.property)) return;
            
            const mathFn = node.callee.property.name;
            
            const opMap: { [key: string]: string } = {
              'abs': 'abs',
              'floor': 'floor',
              'ceil': 'ceiling',
              'sqrt': 'sqrt',
              'sin': 'sin',
              'cos': 'cos',
              'tan': 'tan',
              'log': 'log',
            };
            
            if (opMap[mathFn]) {
              path.replaceWith(
                babel.types.callExpression(
                  babel.types.memberExpression(
                    babel.types.identifier('math'),
                    babel.types.identifier('operation')
                  ),
                  [babel.types.stringLiteral(opMap[mathFn]), ...node.arguments]
                )
              );
            } else if (mathFn === 'round') {
              path.replaceWith(
                babel.types.callExpression(
                  babel.types.memberExpression(
                    babel.types.identifier('math'),
                    babel.types.identifier('round')
                  ),
                  node.arguments
                )
              );
            } else if (mathFn === 'pow') {
              path.replaceWith(
                babel.types.callExpression(
                  babel.types.memberExpression(
                    babel.types.identifier('math'),
                    babel.types.identifier('pow')
                  ),
                  node.arguments
                )
              );
            } else if (mathFn === 'random') {
              const args = node.arguments.length === 0
                ? [babel.types.numericLiteral(0), babel.types.numericLiteral(1)]
                : node.arguments;
              path.replaceWith(
                babel.types.callExpression(
                  babel.types.memberExpression(
                    babel.types.identifier('math'),
                    babel.types.identifier('random')
                  ),
                  args
                )
              );
            }
          },

          // 转换列表赋值语法 myList[index] = value -> list.replace("myList", index, value)
          AssignmentExpression(path: babel.NodePath<babel.types.AssignmentExpression>) {
            const { node } = path;
            if (!babel.types.isMemberExpression(node.left)) return;
            if (!babel.types.isIdentifier(node.left.object)) return;
            if (!node.left.computed) return;
            if (node.operator !== '=') return;
            
            const listName = node.left.object.name;
            path.replaceWith(
              babel.types.callExpression(
                babel.types.memberExpression(
                  babel.types.identifier('list'),
                  babel.types.identifier('replace')
                ),
                [
                  babel.types.stringLiteral(listName),
                  node.left.property as babel.types.Expression,
                  node.right
                ]
              )
            );
          }
        }
      };
    }
  ],
  parserOpts: {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  },
};

/**
 * 将代码中的不支持语法转换为支持的语法
 * @param code 原始代码
 * @returns 转换后的代码
 */
export function transformSyntax(code: string): string {
  try {
    const result = babel.transformSync(code, transformOptions);
    return result?.code || code;
  } catch (error) {
    console.error('Syntax transformation error:', error);
    // 如果转换失败，返回原始代码
    return code;
  }
}

/**
 * 转换 AST 节点中的不支持语法
 * @param node AST 节点
 * @returns 转换后的 AST 节点
 */
export function transformAST(node: Node): Node {
  try {
    const result = babel.transformFromAstSync(node, '', transformOptions);
    return result?.ast || node;
  } catch (error) {
    console.error('AST transformation error:', error);
    // 如果转换失败，返回原始节点
    return node;
  }
}

