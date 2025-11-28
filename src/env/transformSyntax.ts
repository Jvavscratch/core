/*******************************************************************
* Copyright         : 2024
* File Name         : transformSyntax.ts
* Description       : Transforms unsupported syntax to supported syntax
*                    for jvavscratch
* Revision History  :
* Date        Author          Comments
* ------------------------------------------------------------------
* 2024        AI Assistant    Initial creation
* 
/******************************************************************/

import * as babel from '@babel/core';
import { Node } from '@babel/types';

// 杞崲閫夐」
const transformOptions: babel.TransformOptions = {
  plugins: [
    // 鑷畾涔夋彃浠剁敤浜庤浆鎹笉鏀寔鐨勮娉?    function transformUnsupportedSyntax() {
      return {
        visitor: {
          // 杞崲涓夊厓琛ㄨ揪寮?(condition ? expr1 : expr2) 涓?if-else 璇彞
          ConditionalExpression(path) {
            const { test, consequent, alternate } = path.node;
            
            // 鑾峰彇鐖惰妭鐐?            const parent = path.findParent(p => 
              p.isVariableDeclarator() || 
              p.isAssignmentExpression() || 
              p.isReturnStatement() ||
              p.isCallExpression() ||
              p.isBinaryExpression()
            );
            
            // 濡傛灉鐖惰妭鐐规槸鍙橀噺澹版槑鎴栬祴鍊艰〃杈惧紡锛屾垜浠彲浠ョ洿鎺ユ浛鎹负 if-else 璇彞
            if (parent?.isVariableDeclarator() || parent?.isAssignmentExpression()) {
              const left = parent.isVariableDeclarator() 
                ? parent.node.id 
                : parent.node.left;
              
              // 鍒涘缓 if-else 璇彞
              const ifStatement = babel.types.ifStatement(
                test,
                babel.types.blockStatement([
                  babel.types.expressionStatement(
                    babel.types.assignmentExpression(
                      '=',
                      babel.types.cloneNode(left),
                      consequent
                    )
                  )
                ]),
                babel.types.blockStatement([
                  babel.types.expressionStatement(
                    babel.types.assignmentExpression(
                      '=',
                      babel.types.cloneNode(left),
                      alternate
                    )
                  )
                ])
              );
              
              // 鏇挎崲鐖惰妭鐐?              if (parent.isVariableDeclarator()) {
                // 瀵逛簬鍙橀噺澹版槑锛岄渶瑕佹浛鎹㈡暣涓０鏄庤鍙?                const varStmtPath = path.findParent(p => p.isVariableDeclaration());
                if (varStmtPath) {
                  // 纭繚鍙橀噺宸茬粡澹版槑锛堝湪澶栭儴锛?                  varStmtPath.replaceWith(ifStatement);
                }
              } else if (parent.isAssignmentExpression()) {
                // 瀵逛簬璧嬪€艰〃杈惧紡锛屾浛鎹㈡暣涓〃杈惧紡璇彞
                const exprStmtPath = path.findParent(p => p.isExpressionStatement());
                if (exprStmtPath) {
                  exprStmtPath.replaceWith(ifStatement);
                }
              }
            }
          },
          
          // 杞崲 for 寰幆鍐呯殑鍙橀噺澹版槑鍒板惊鐜閮?          ForStatement(path) {
            const { init } = path.node;
            
            // 妫€鏌?init 鏄惁涓哄彉閲忓０鏄庯紙濡?for(let i=0; ...)锛?            if (init?.type === 'VariableDeclaration' && init.kind !== 'var') {
              // 鍒涘缓鐩稿悓鐨勫彉閲忓０鏄庯紝鎻愬崌鍒板惊鐜閮?              const outerVarDecl = babel.types.variableDeclaration(
                init.kind,
                [...init.declarations]
              );
              
              // 鍦ㄥ惊鐜墠鎻掑叆鍙橀噺澹版槑
              path.insertBefore(outerVarDecl);
              
              // 灏嗗惊鐜唴鐨勫彉閲忓０鏄庢浛鎹负璧嬪€艰〃杈惧紡
              if (init.declarations.length === 1) {
                const decl = init.declarations[0];
                if (decl.init) {
                  // 鍙繚鐣欒祴鍊奸儴鍒?                  path.node.init = babel.types.assignmentExpression(
                    '=',
                    decl.id,
                    decl.init
                  );
                } else {
                  // 濡傛灉娌℃湁鍒濆鍖栧櫒锛屽垯浣跨敤鏍囪瘑绗?                  path.node.init = decl.id;
                }
              }
            }
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
 * 灏嗕唬鐮佷腑鐨勪笉鏀寔璇硶杞崲涓烘敮鎸佺殑璇硶
 * @param code 鍘熷浠ｇ爜
 * @returns 杞崲鍚庣殑浠ｇ爜
 */
export function transformSyntax(code: string): string {
  try {
    const result = babel.transformSync(code, transformOptions);
    return result?.code || code;
  } catch (error) {
    console.error('Syntax transformation error:', error);
    // 濡傛灉杞崲澶辫触锛岃繑鍥炲師濮嬩唬鐮?    return code;
  }
}

/**
 * 杞崲 AST 鑺傜偣涓殑涓嶆敮鎸佽娉? * @param node AST 鑺傜偣
 * @returns 杞崲鍚庣殑 AST 鑺傜偣
 */
export function transformAST(node: Node): Node {
  try {
    const result = babel.transformFromAstSync(node, '', transformOptions);
    return result?.ast || node;
  } catch (error) {
    console.error('AST transformation error:', error);
    // 濡傛灉杞崲澶辫触锛岃繑鍥炲師濮嬭妭鐐?    return node;
  }
}

