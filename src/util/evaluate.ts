/*******************************************************************
* Copyright         : 2024 saaawdust
* File Name         : evaluate.ts
* Description       : Evaluates a type
*
* Revision History  :
* Date        Author          Comments
* ------------------------------------------------------------------
* 10/12/2025  NeuronPulse     Modified
* 09/19/2026  NeuronPulse     Dispatch via registry; real error on miss
/******************************************************************/


import { BlockCluster } from "./blocks"
import { buildData, typeData } from "@jvavscratch/types"
import { JvavscratchError } from "./err"
import { getType } from "./registry"

export function evaluate(type: string, blockCluster: BlockCluster, instance: any, id: string, buildData: buildData): typeData
{
    let data: any;
    let s = false;
    let packageData = buildData.packages;

    // 第三方运行时包优先,保持原有语义(可覆盖内置生成器)
    for (let i = 0; i < packageData.type_implements.length; i++) {
        if (packageData.type_implements[i].name == type) {
            data = packageData.type_implements[i].body;
            s = true;
            break;
        }
    }

    if (!s) {
        data = getType(type);

        // 原实现在这里只 console.error 然后继续,于是下一行 data(...) 抛出
        // 一个与真实原因毫无关系的 TypeError。改为直接抛 JvavscratchError,
        // 把「哪个类型没有实现」原样带给用户。
        if (!data) {
            let loc = instance?.loc;
            new JvavscratchError(
                `No implementation for expression type '${type}'.`,
                buildData.originalSource,
                [{
                    line: loc?.start?.line || 1,
                    column: loc?.start?.column || 1,
                    length: (loc?.end?.column ?? 0) - (loc?.start?.column ?? 0) || 1,
                }],
                loc?.filename || ""
            );
        }
    }

    return data(blockCluster, instance, id, buildData)
}
