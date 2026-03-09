import { db } from "../server.js";

//prefix : VLVTINV
export async function generate_unique_code(prefix: string, key = 'CLIENT_CODE'): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // 20260307

    return await db.$transaction(async (tx) => {

        const counter = await tx.sequence.upsert({
            where: { key },
            update: { value: { increment: 1 } },
            create: { key, value: 1 },
        });

        // Format: VLVTINV + 20260307 + 00001
        const paddedSequence = String(counter.value).padStart(5, '0');
        return `${prefix}${dateStr}${paddedSequence}`;
    });
}