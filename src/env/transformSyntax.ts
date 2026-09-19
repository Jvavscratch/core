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

// Transformation options
const transformOptions: babel.TransformOptions = {
  plugins: [
    // Custom plugin that rewrites syntax we cannot support directly
    function transformUnsupportedSyntax() {
      return {
        visitor: {
          // Rewrite the ** exponentiation operator into a math.pow() call (Scratch has no native exponentiation block)
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

          // Rewrite a ternary expression (condition ? expr1 : expr2) into an if/else statement
          ConditionalExpression(path: babel.NodePath<babel.types.ConditionalExpression>) {
            const { test, consequent, alternate } = path.node;

            // Is this part of a condition context (the test of an if/while/for)?
            const isInCondition = path.findParent((p: babel.NodePath) =>
              (p.isIfStatement() && (p.node as any).test === path.node) ||
              (p.isWhileStatement() && (p.node as any).test === path.node) ||
              (p.isForStatement() && (p.node as any).test === path.node) ||
              (p.isLogicalExpression() && (
                (p.node as any).left === path.node || (p.node as any).right === path.node
              ))
            );

            // In a condition context, leave it alone (let it stand as a boolean expression)
            if (isInCondition) {
              return;
            }

            // Find the parent node we will be replacing
            const parent = path.findParent((p: babel.NodePath) =>
              p.isVariableDeclarator() ||
              p.isAssignmentExpression() ||
              p.isReturnStatement() ||
              p.isCallExpression() ||
              p.isBinaryExpression()
            );

            if (!parent) return;

            // Name of the temporary variable
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
              // For a ternary inside a function argument or a binary expression
              // we have to find the nearest statement-level ancestor to replace
              const stmtPath = path.findParent((p: babel.NodePath) =>
                p.isExpressionStatement() || p.isReturnStatement()
              );
              if (stmtPath && stmtPath.isExpressionStatement()) {
                // An IIFE-style rewrite would compute temp and then use temp,
                // but Scratch's constraints force us to split this into several
                // statements. Reaching the other parts of the original
                // expression through its parent would need more elaborate
                // handling, so we simplify: replace just this conditional
                // expression with tempVar.
                path.replaceWith(tempVar);
                // Insert varDecl and ifStatement before the statement
                stmtPath.insertBefore([varDecl, ifStatement]);
              } else if (stmtPath && stmtPath.isReturnStatement()) {
                path.replaceWith(tempVar);
                stmtPath.insertBefore([varDecl, ifStatement]);
              }
            }
          },

          // Rewrite && / || outside a condition context into a ternary (preserving JS short-circuit semantics)
          LogicalExpression(path: babel.NodePath<babel.types.LogicalExpression>) {
            const { operator, left, right } = path.node;

            // Only handle && and ||
            if (operator !== '&&' && operator !== '||') {
              return;
            }

            // Is this part of a condition context?
            const isInCondition = path.findParent((p: babel.NodePath) =>
              (p.isIfStatement() && (p.node as any).test === path.node) ||
              (p.isWhileStatement() && (p.node as any).test === path.node) ||
              (p.isForStatement() && (p.node as any).test === path.node) ||
              (p.isLogicalExpression() && (
                (p.node as any).left === path.node || (p.node as any).right === path.node
              ))
            );

            // In a condition context, leave it alone
            if (isInCondition) {
              return;
            }

            // Rewrite as a ternary expression
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
          
          // Hoist variable declarations out of a for loop
          ForStatement(path: babel.NodePath<babel.types.ForStatement>) {
            const { init } = path.node;
            
            // Is init a variable declaration (as in for(let i=0; ...))?
            if (init?.type === 'VariableDeclaration' && init.kind !== 'var') {
              // Build the same declaration so it can be hoisted outside the loop
              const outerVarDecl = babel.types.variableDeclaration(
                init.kind,
                [...init.declarations]
              );
              
              // Insert the declaration before the loop
              path.insertBefore(outerVarDecl);
              
              // Replace the declaration inside the loop with an assignment expression
              if (init.declarations.length === 1) {
                const decl = init.declarations[0];
                
                // Make sure decl.id is neither a VoidPattern nor an ArrayPattern
                if (babel.types.isVoidPattern(decl.id) || babel.types.isArrayPattern(decl.id)) {
                  return;
                }
                
                if (decl.init) {
                  // Keep only the assignment half
                  path.node.init = babel.types.assignmentExpression(
                    '=',
                    decl.id as babel.types.LVal,
                    decl.init
                  );
                } else {
                  // With no initialiser, fall back to the identifier itself
                  path.node.init = decl.id as babel.types.Expression;
                }
              }
            }
          },

          // Rewrite list indexing syntax myList[index] -> list.getItem("myList", index)
          // Rewrite list length syntax myList.length -> list.length("myList")
          // Rewrite Math.PI -> math.pi()
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

          // Rewrite Math.xxx() calls to the standard maths functions
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

          // Rewrite list assignment syntax myList[index] = value -> list.replace("myList", index, value)
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
 * Rewrites unsupported syntax in a piece of code into syntax we can compile.
 * @param code The original code
 * @returns The transformed code
 */
export function transformSyntax(code: string): string {
  try {
    const result = babel.transformSync(code, transformOptions);
    return result?.code || code;
  } catch (error) {
    console.error('Syntax transformation error:', error);
    // If the transformation fails, return the original code
    return code;
  }
}

/**
 * Rewrites unsupported syntax inside an AST node.
 * @param node The AST node
 * @returns The transformed AST node
 */
export function transformAST(node: Node): Node {
  try {
    const result = babel.transformFromAstSync(node, '', transformOptions);
    return result?.ast || node;
  } catch (error) {
    console.error('AST transformation error:', error);
    // If the transformation fails, return the original node
    return node;
  }
}

