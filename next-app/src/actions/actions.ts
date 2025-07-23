"use server"

import { revalidatePath } from "next/cache";
import { prisma } from "@/utils/prisma";
import { TodoStatus } from "@/generated/prisma";

export async function addTask(formData: FormData){
    console.log("Adding Task ...")
    console.log(JSON.stringify(formData, null, 2))

    
}

export async function createUser(formData:FormData) {

    const input = formData.get('input') as string;

    await prisma.user.create({
        data: {
            email: input,
            name: input
        }
    })
    
}


export async function createTodo(formData: FormData){
    
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const start_date = formData.get('start_date') as string;
    const due_date = formData.get('due_date') as string;
    const remark = formData.get('remark') as string;

    // console.log("[Input Received]", input)

    if(!title.trim()){
        return ;
    }

    await prisma.todo.create({
        data: {
            title: title,
            description,
            start_date: new Date(start_date).toISOString(),
            due_date: new Date(due_date).toISOString(),
            remark
        }
    })

    revalidatePath("/")
}

export async function updateTodo(formData: FormData){

    const id = formData.get('id') as string;
    const title = formData.get('newTitle') as string;

    await prisma.todo.update({
        where: {
            id: parseInt(id),
        },
        data: {
            title,
        }
    })

    revalidatePath("/")

}

export async function deleteTodo(formData: FormData){

    const id = formData.get('id') as string;

    await prisma.todo.delete({
        where: {
            id: parseInt(id),
        },
    })

    revalidatePath("/")

}


export async function changeStatus(formData: FormData){

    const todoId = formData.get('todoId') as string;

    await prisma.todo.update({
        where: {
            id: parseInt(todoId),
        },
        data: {
            status: TodoStatus.COMPLETED
        }
    })

    revalidatePath("/")

}