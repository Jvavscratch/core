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

    // Third-party runtime packages take precedence, preserving the original semantics (they may override the built-in generators)
    for (let i = 0; i < packageData.type_implements.length; i++) {
        if (packageData.type_implements[i].name == type) {
            data = packageData.type_implements[i].body;
            s = true;
            break;
        }
    }

    if (!s) {
        data = getType(type);

        // The original implementation only logged a console.error here and then
        // carried on, so the data(...) call below threw a TypeError with no
        // relation whatsoever to the real cause. We construct a
        // JvavscratchError instead, handing the user the exact type that has no
        // implementation.
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
