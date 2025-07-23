import { PrismaClient, Prisma } from "../src/generated/prisma";

const prisma = new PrismaClient();

const todoData: Prisma.todoCreateInput[] = [
    {
        title: "Alice",
    },
    {
        title: "Bob",
    },
];

export async function main() {
    for (const u of todoData) {
        await prisma.todo.create({ data: u });
    }
}

main();