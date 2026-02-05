import { db } from "../../server.js";

class userAssetsServiceClass {
    async create(userId: string, data: any) {
        return await db.userAssets.upsert({
            where: { user_id: userId },
            update: { ...data },
            create: {
                user_id: userId,
                ...data,
            }
        });
    }

    async update(userId: string, data: any) {
        return await db.userAssets.update({
            where: { user_id: userId },
            data: { ...data },
        });
    }

    async get(userId: string) {
        return await db.userAssets.findUnique({
            where: { user_id: userId },
        });
    }

    async delete(userId: string) {
        return await db.userAssets.delete({
            where: { user_id: userId },
        });
    }
}

export const user_assets_service = new userAssetsServiceClass();
