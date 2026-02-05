import { UserCreateInput } from "../prisma/generated/prisma/models.js";
import { db } from "../server.js";

class UserServiceClass {
    async create_user(data: UserCreateInput) {

        return await db.user.upsert({
            where: {
                phone_no: data.phone_no ?? "",
            },
            update: {
                ...data
            },
            create: {
                ...data
            }
        });
    }

    async update_user(user_id: string, data: Partial<UserCreateInput>) {
        return await db.user.update({
            where: {
                id: user_id
            },
            data: {
                ...data
            }
        });
    }

    async get_user_by_phone(phone_no: string) {
        return await db.user.findUnique({
            where: {
                phone_no: phone_no
            }
        });
    }

    async get_user_by_invId(inv_id: string) {
        return await db.user.findUnique({
            where: {
                inv_id: inv_id
            }
        });
    }

    async get_user_by_id(user_id: string) {
        return await db.user.findUnique({
            where: {
                id: user_id
            }
        });
    }


    async get_user_by_usr(usr: string) {
        return await db.user.findUnique({
            where: {
                usr: usr
            }
        });
    }


    async delete_user(user_id: string) {
        return await db.user.delete({
            where: {
                id: user_id
            }
        });
    }
}

export const user_service = new UserServiceClass();